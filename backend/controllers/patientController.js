const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { predictDuration } = require('../services/mlService');
const { calculatePriorityScore, reorderQueue, handleEmergencySpillover, checkDoctorInaction } = require('../services/queueService');
const { triageSymptoms } = require('../services/groqService');
const { getIo } = require('../server');

const findBestDoctor = async (specialization, excludeId) => {
  const query = { isOnline: true, specialization };
  if (excludeId) query.userId = { $ne: excludeId };
  const doctors = await Doctor.find(query).sort({ currentQueueLength: 1 });
  return doctors.length > 0 ? doctors[0] : null;
};

const joinQueue = async (req, res) => {
  try {
    const io = getIo();
    const {
      symptoms,
      visitType,
      previousVisits,
      consultationMode,
      doctorId,
      age,
      gender,
    } = req.body;

    if (!symptoms || !visitType) {
      return res.status(400).json({ message: 'symptoms and visitType are required' });
    }

    const patientUser = await User.findById(req.user.id);
    const patientProfile = await Patient.findOne({ userId: req.user.id });

    const resolvedAge = age || patientProfile?.age;
    const resolvedGender = gender || patientProfile?.gender;

    // AI Triage: Groq determines emergency level, specialization, and critical status
    const triage = await triageSymptoms(symptoms, resolvedAge, resolvedGender, visitType);
    const emergencyLevel = triage.emergencyLevel;
    const predictedCategory = triage.doctorSpecialization;
    const isCritical = triage.isCriticalOperationToday;

    // ML Prediction: Flask returns predicted consultation duration
    const predictedDuration = await predictDuration(
      resolvedAge,
      symptoms,
      emergencyLevel,
      previousVisits || 0
    );

    // Find doctor based on AI-determined specialization
    let assignedDoctor = null;
    if (doctorId) {
      assignedDoctor = await Doctor.findOne({ userId: doctorId, isOnline: true });
      if (!assignedDoctor) {
        return res.status(400).json({ message: 'Specified doctor is not available' });
      }
    } else {
      assignedDoctor = await findBestDoctor(predictedCategory);
      if (!assignedDoctor) {
        assignedDoctor = await Doctor.findOne({ isOnline: true }).sort({ currentQueueLength: 1 });
      }
    }

    if (!assignedDoctor) {
      return res.status(400).json({ message: 'No online doctors available at the moment' });
    }

    const initialPriorityScore = calculatePriorityScore(emergencyLevel, 0, previousVisits || 0);

    // Critical Operation Bypass: force to emergency level 5 in immediate queue
    const finalEmergencyLevel = isCritical ? 5 : emergencyLevel;
    const finalPriorityScore = isCritical
      ? calculatePriorityScore(5, 0, previousVisits || 0) + 1000
      : initialPriorityScore;

    const consultation = await Consultation.create({
      patientId: req.user.id,
      doctorId: assignedDoctor.userId,
      symptoms,
      visitType,
      previousVisits: previousVisits || 0,
      emergencyLevel: finalEmergencyLevel,
      aiEmergencyLevel: emergencyLevel,
      predictedCategory,
      isCritical,
      consultationMode: consultationMode || 'pending',
      predictedDuration,
      priorityScore: finalPriorityScore,
      type: 'live',
      age: resolvedAge,
      gender: resolvedGender,
      patientName: patientUser.name,
    });

    await Doctor.findOneAndUpdate(
      { userId: assignedDoctor.userId },
      { $inc: { currentQueueLength: 1 } }
    );

    const updatedQueue = await reorderQueue(assignedDoctor.userId);
    if (io) {
      io.to(`doctor:${assignedDoctor.userId}`).emit('queue:updated', { queue: updatedQueue });

      if (isCritical) {
        // Critical Operation Bypass: emergency bell on doctor dashboard
        io.to(`doctor:${assignedDoctor.userId}`).emit('queue:critical-bypass', {
          message: `CRITICAL: Patient requires immediate emergency intervention!`,
          consultation,
        });
        io.to('admin').emit('admin:critical-bypass', {
          message: `Critical operation bypass triggered for patient ${patientUser.name}`,
          consultation,
        });
      } else if (finalEmergencyLevel >= 4) {
        io.to(`doctor:${assignedDoctor.userId}`).emit('queue:emergency-warning', {
          message: `Emergency patient (level ${finalEmergencyLevel}) joined queue`,
          consultation,
        });
        io.to('admin').emit('admin:emergency-alert', {
          message: `Emergency patient (level ${finalEmergencyLevel}) joined queue`,
          patientId: req.user.id,
          doctorId: assignedDoctor.userId,
          consultation,
        });
      }

      // Load Balancing: Check if multiple emergencies for same doctor
      if (finalEmergencyLevel >= 4) {
        const emergencyConsultations = await Consultation.find({
          doctorId: assignedDoctor.userId,
          status: 'waiting',
          emergencyLevel: { $gte: 4 },
          type: 'live',
        });
        if (emergencyConsultations.length > 1) {
          await handleEmergencySpillover(assignedDoctor.userId, emergencyConsultations, io);
        }
      }
    }

    const finalQueue = await reorderQueue(assignedDoctor.userId);
    const position = finalQueue.findIndex(
      (c) => c._id.toString() === consultation._id.toString()
    );
    const predictedWaitTime = finalQueue
      .slice(0, Math.max(0, position))
      .reduce((sum, c) => sum + (c.predictedDuration || 15), 0);

    res.status(201).json({
      consultation,
      queuePosition: position + 1,
      assignedDoctor: {
        userId: assignedDoctor.userId,
        specialization: assignedDoctor.specialization,
      },
      predictedWaitTime: Math.round(predictedWaitTime),
      triage: {
        emergencyLevel: finalEmergencyLevel,
        specialization: predictedCategory,
        isCritical,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyQueue = async (req, res) => {
  try {
    const consultation = await Consultation.findOne({
      patientId: req.user.id,
      status: { $in: ['waiting', 'in-progress'] },
      type: 'live',
    })
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });

    if (!consultation) {
      return res.json({ consultation: null, queuePosition: null });
    }

    let queuePosition = null;
    if (consultation.status === 'waiting' && consultation.doctorId) {
      const queue = await reorderQueue(consultation.doctorId);
      queuePosition =
        queue.findIndex((c) => c._id.toString() === consultation._id.toString()) + 1;
    }

    res.json({ consultation, queuePosition });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const consultations = await Consultation.find({
      patientId: req.user.id,
      status: 'completed',
    })
      .populate('doctorId', 'name email')
      .sort({ completedAt: -1 });

    res.json({ consultations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bookAppointment = async (req, res) => {
  try {
    const io = getIo();
    const {
      symptoms,
      visitType,
      previousVisits,
      consultationMode,
      doctorId,
      scheduledDate,
      scheduledSlot,
      age,
      gender,
    } = req.body;

    if (!symptoms || !visitType || !scheduledDate || !scheduledSlot) {
      return res.status(400).json({
        message: 'symptoms, visitType, scheduledDate, and scheduledSlot are required',
      });
    }

    const patientUser = await User.findById(req.user.id);
    const patientProfile = await Patient.findOne({ userId: req.user.id });

    const resolvedAge = age || patientProfile?.age;
    const resolvedGender = gender || patientProfile?.gender;

    // AI Triage
    const triage = await triageSymptoms(symptoms, resolvedAge, resolvedGender, visitType);
    const emergencyLevel = triage.emergencyLevel;
    const predictedCategory = triage.doctorSpecialization;

    const predictedDuration = await predictDuration(
      resolvedAge,
      symptoms,
      emergencyLevel,
      previousVisits || 0
    );

    let assignedDoctor = null;
    if (doctorId) {
      assignedDoctor = await Doctor.findOne({ userId: doctorId });
      if (!assignedDoctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
    } else {
      assignedDoctor = await findBestDoctor(predictedCategory);
      if (!assignedDoctor) {
        assignedDoctor = await Doctor.findOne().sort({ currentQueueLength: 1 });
      }
    }

    if (!assignedDoctor) {
      return res.status(400).json({ message: 'No doctors available' });
    }

    const consultation = await Consultation.create({
      patientId: req.user.id,
      doctorId: assignedDoctor.userId,
      symptoms,
      visitType,
      previousVisits: previousVisits || 0,
      emergencyLevel,
      aiEmergencyLevel: emergencyLevel,
      predictedCategory,
      consultationMode: consultationMode || 'pending',
      predictedDuration,
      priorityScore: 0,
      type: 'scheduled',
      scheduledDate: new Date(scheduledDate),
      scheduledSlot,
      age: resolvedAge,
      gender: resolvedGender,
      patientName: patientUser.name,
    });

    if (io) {
      io.to(`doctor:${assignedDoctor.userId}`).emit('appointment:new', {
        message: `New appointment scheduled for ${scheduledDate} at ${scheduledSlot}`,
        consultation,
      });
    }

    res.status(201).json({ consultation, assignedDoctor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Consultation.find({
      patientId: req.user.id,
      type: 'scheduled',
      status: { $in: ['waiting', 'in-progress'] },
    })
      .populate('doctorId', 'name email')
      .sort({ scheduledDate: 1 });

    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Urgent Request: Patient submits immediate symptoms for urgent processing.
 * Groq triages instantly and sends a live WebSocket popup to the matching doctor.
 * If doctor doesn't accept in 30 seconds, auto-assigns to next available.
 */
const urgentRequest = async (req, res) => {
  try {
    const io = getIo();
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({ message: 'symptoms are required' });
    }

    const patientUser = await User.findById(req.user.id);
    const patientProfile = await Patient.findOne({ userId: req.user.id });

    const resolvedAge = patientProfile?.age;
    const resolvedGender = patientProfile?.gender;

    // Instant AI triage
    const triage = await triageSymptoms(symptoms, resolvedAge, resolvedGender, 'Urgent');
    const emergencyLevel = Math.max(triage.emergencyLevel, 4); // Urgent = at least level 4
    const predictedCategory = triage.doctorSpecialization;
    const isCritical = triage.isCriticalOperationToday;

    const predictedDuration = await predictDuration(resolvedAge, symptoms, emergencyLevel, 0);

    // Find matching doctor
    let assignedDoctor = await findBestDoctor(predictedCategory);
    if (!assignedDoctor) {
      assignedDoctor = await Doctor.findOne({ isOnline: true }).sort({ currentQueueLength: 1 });
    }

    if (!assignedDoctor) {
      return res.status(400).json({ message: 'No online doctors available for urgent request' });
    }

    const priorityScore = calculatePriorityScore(emergencyLevel, 0, 0) + (isCritical ? 1000 : 500);

    const consultation = await Consultation.create({
      patientId: req.user.id,
      doctorId: assignedDoctor.userId,
      symptoms,
      visitType: 'Urgent',
      previousVisits: 0,
      emergencyLevel: isCritical ? 5 : emergencyLevel,
      aiEmergencyLevel: triage.emergencyLevel,
      predictedCategory,
      isCritical,
      consultationMode: 'pending',
      predictedDuration,
      priorityScore,
      type: 'live',
      age: resolvedAge,
      gender: resolvedGender,
      patientName: patientUser.name,
    });

    await Doctor.findOneAndUpdate(
      { userId: assignedDoctor.userId },
      { $inc: { currentQueueLength: 1 } }
    );

    if (io) {
      // Send urgent popup to the doctor
      io.to(`doctor:${assignedDoctor.userId}`).emit('urgent:request', {
        message: `URGENT: Patient ${patientUser.name} needs immediate consultation.`,
        consultation,
        patientName: patientUser.name,
        symptoms,
        emergencyLevel,
      });

      // 30-second auto-reassign if doctor doesn't accept
      setTimeout(async () => {
        try {
          const check = await Consultation.findById(consultation._id);
          if (check && check.status === 'waiting') {
            const nextDoctor = await Doctor.findOne({
              isOnline: true,
              userId: { $ne: assignedDoctor.userId },
            }).sort({ currentQueueLength: 1 });

            if (nextDoctor) {
              check.doctorId = nextDoctor.userId;
              await check.save();

              await Doctor.findOneAndUpdate(
                { userId: assignedDoctor.userId },
                { $inc: { currentQueueLength: -1 } }
              );
              await Doctor.findOneAndUpdate(
                { userId: nextDoctor.userId },
                { $inc: { currentQueueLength: 1 } }
              );

              io.to(`patient:${req.user.id}`).emit('patient:reassigned', {
                message: 'Doctor did not respond. You have been assigned to another available doctor.',
                newDoctorId: nextDoctor.userId,
                consultationId: consultation._id,
              });
              io.to(`doctor:${nextDoctor.userId}`).emit('urgent:request', {
                message: `URGENT (reassigned): Patient ${patientUser.name} needs immediate consultation.`,
                consultation: check,
                patientName: patientUser.name,
                symptoms,
                emergencyLevel,
              });
              io.to(`doctor:${nextDoctor.userId}`).emit('queue:updated', {
                queue: await reorderQueue(nextDoctor.userId),
              });
            }
          }
        } catch (err) {
          console.error('Urgent auto-reassign error:', err.message);
        }
      }, 30 * 1000);

      io.to('admin').emit('admin:urgent-request', {
        message: `Urgent request from ${patientUser.name}`,
        consultation,
      });
    }

    res.status(201).json({
      consultation,
      assignedDoctor: {
        userId: assignedDoctor.userId,
        specialization: assignedDoctor.specialization,
      },
      triage: {
        emergencyLevel,
        specialization: predictedCategory,
        isCritical,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { joinQueue, getMyQueue, getHistory, bookAppointment, getMyAppointments, urgentRequest };
