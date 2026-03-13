const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { predictSpecialization, predictDuration } = require('../services/mlService');
const { calculatePriorityScore, reorderQueue } = require('../services/queueService');
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
      emergencyLevel,
      consultationMode,
      doctorId,
      age,
      gender,
    } = req.body;

    if (!symptoms || !visitType || !emergencyLevel) {
      return res.status(400).json({ message: 'symptoms, visitType, and emergencyLevel are required' });
    }

    const patientUser = await User.findById(req.user.id);
    const patientProfile = await Patient.findOne({ userId: req.user.id });

    const resolvedAge = age || patientProfile?.age;
    const resolvedGender = gender || patientProfile?.gender;

    // ML predictions
    const predictedCategory = await predictSpecialization(symptoms);
    const predictedDuration = await predictDuration(
      resolvedAge,
      symptoms,
      emergencyLevel,
      previousVisits || 0
    );

    // Find doctor
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

    const initialPriorityScore = calculatePriorityScore(emergencyLevel, 0);

    const consultation = await Consultation.create({
      patientId: req.user.id,
      doctorId: assignedDoctor.userId,
      symptoms,
      visitType,
      previousVisits: previousVisits || 0,
      emergencyLevel,
      predictedCategory,
      consultationMode: consultationMode || 'video',
      predictedDuration,
      priorityScore: initialPriorityScore,
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

      if (emergencyLevel >= 4) {
        io.to(`doctor:${assignedDoctor.userId}`).emit('queue:emergency-warning', {
          message: `Emergency patient (level ${emergencyLevel}) joined queue`,
          consultation,
        });
        io.to('admin').emit('admin:emergency-alert', {
          message: `Emergency patient (level ${emergencyLevel}) joined queue`,
          patientId: req.user.id,
          doctorId: assignedDoctor.userId,
          consultation,
        });
      }
    }

    const position = updatedQueue.findIndex(
      (c) => c._id.toString() === consultation._id.toString()
    );
    // Sum the predicted durations of all consultations ahead in queue
    const predictedWaitTime = updatedQueue
      .slice(0, position)
      .reduce((sum, c) => sum + (c.predictedDuration || 15), 0);

    res.status(201).json({
      consultation,
      queuePosition: position + 1,
      assignedDoctor: {
        userId: assignedDoctor.userId,
        specialization: assignedDoctor.specialization,
      },
      predictedWaitTime: Math.round(predictedWaitTime),
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
      emergencyLevel,
      consultationMode,
      doctorId,
      scheduledDate,
      scheduledSlot,
      age,
      gender,
    } = req.body;

    if (!symptoms || !visitType || !emergencyLevel || !scheduledDate || !scheduledSlot) {
      return res.status(400).json({
        message: 'symptoms, visitType, emergencyLevel, scheduledDate, and scheduledSlot are required',
      });
    }

    const patientUser = await User.findById(req.user.id);
    const patientProfile = await Patient.findOne({ userId: req.user.id });

    const resolvedAge = age || patientProfile?.age;
    const resolvedGender = gender || patientProfile?.gender;

    const predictedCategory = await predictSpecialization(symptoms);
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
      predictedCategory,
      consultationMode: consultationMode || 'video',
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

module.exports = { joinQueue, getMyQueue, getHistory, bookAppointment, getMyAppointments };
