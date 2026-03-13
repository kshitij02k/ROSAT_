const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');

/**
 * Priority Score = (EmergencyLevel^2 × 10) + (WaitingTimeInMins × 1) + (PreviousVisits × 2)
 */
const calculatePriorityScore = (emergencyLevel, waitingTimeMinutes, previousVisits = 0) => {
  return Math.pow(emergencyLevel, 2) * 10 + waitingTimeMinutes * 1 + previousVisits * 2;
};

const applyAgingAlgorithm = async (io) => {
  try {
    const waitingConsultations = await Consultation.find({ status: 'waiting', type: 'live' });

    for (const consultation of waitingConsultations) {
      const waitingMs = Date.now() - new Date(consultation.createdAt).getTime();
      const waitingMinutes = waitingMs / 60000;

      const newScore = calculatePriorityScore(
        consultation.emergencyLevel,
        waitingMinutes,
        consultation.previousVisits || 0
      );
      consultation.priorityScore = newScore;
      await consultation.save();

      if (io && consultation.doctorId) {
        const updatedQueue = await reorderQueue(consultation.doctorId);
        io.to(`doctor:${consultation.doctorId}`).emit('queue:updated', { queue: updatedQueue });
      }
    }

    // Cascade effect: check in-progress consultations exceeding predicted duration
    await checkCascadeEffect(io);
  } catch (err) {
    console.error('Aging algorithm error:', err.message);
  }
};

/**
 * Cascade Effect: If a doctor takes longer than predicted, broadcast delay to all waiting patients
 */
const checkCascadeEffect = async (io) => {
  try {
    const inProgress = await Consultation.find({ status: 'in-progress', type: 'live' });

    for (const consultation of inProgress) {
      if (!consultation.startedAt || !consultation.predictedDuration) continue;

      const elapsedMinutes = (Date.now() - new Date(consultation.startedAt).getTime()) / 60000;
      const overrunMinutes = Math.round(elapsedMinutes - consultation.predictedDuration);

      if (overrunMinutes > 0) {
        // Find all waiting patients for this doctor
        const waitingPatients = await Consultation.find({
          doctorId: consultation.doctorId,
          status: 'waiting',
          type: 'live',
        });

        for (const waiting of waitingPatients) {
          if (io) {
            io.to(`patient:${waiting.patientId}`).emit('queue:delay-warning', {
              message: `The doctor is currently handling a critical case. Your estimated wait time has been updated by +${overrunMinutes} minutes. Thank you for your patience.`,
              overrunMinutes,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Cascade effect check error:', err.message);
  }
};

const reorderQueue = async (doctorId) => {
  const consultations = await Consultation.find({
    doctorId,
    status: 'waiting',
    type: 'live',
  })
    .populate('patientId', 'name email')
    .sort({ priorityScore: -1 });

  return consultations;
};

const checkDoctorInaction = (io, consultationId, doctorId, patientId) => {
  setTimeout(async () => {
    try {
      const consultation = await Consultation.findById(consultationId);
      if (consultation && consultation.status === 'waiting') {
        // Auto-reassign the patient to another available doctor
        const currentDoctor = await Doctor.findOne({ userId: doctorId });
        const spec = currentDoctor ? currentDoctor.specialization : 'General Physician';

        const availableDoctor = await Doctor.findOne({
          isOnline: true,
          userId: { $ne: doctorId },
          specialization: spec,
        }).sort({ currentQueueLength: 1 });

        if (availableDoctor) {
          consultation.doctorId = availableDoctor.userId;
          await consultation.save();

          await Doctor.findOneAndUpdate({ userId: doctorId }, { $inc: { currentQueueLength: -1 } });
          await Doctor.findOneAndUpdate({ userId: availableDoctor.userId }, { $inc: { currentQueueLength: 1 } });

          if (io) {
            io.to(`patient:${patientId}`).emit('patient:reassigned', {
              message: 'Your doctor did not respond in time. You have been reassigned to another doctor.',
              newDoctorId: availableDoctor.userId,
              consultationId,
            });
            io.to(`doctor:${availableDoctor.userId}`).emit('queue:updated', {
              queue: await reorderQueue(availableDoctor.userId),
            });
          }
        }

        // Always alert admin
        const alertMsg = {
          message: `Doctor has not started session for consultation ${consultationId} within 3 minutes. Patient ${availableDoctor ? 'auto-reassigned' : 'waiting for reassignment'}.`,
          consultationId,
          doctorId,
          patientId,
          reassigned: !!availableDoctor,
        };
        if (io) {
          io.to('admin').emit('admin:inaction-alert', alertMsg);
          io.to(`doctor:${doctorId}`).emit('doctor:inaction-warning', alertMsg);
        }
        console.warn('Doctor inaction alert:', alertMsg.message);
      }
    } catch (err) {
      console.error('Doctor inaction check error:', err.message);
    }
  }, 3 * 60 * 1000);
};

const reassignPatients = async (doctorId, io) => {
  try {
    const offlineDoctor = await Doctor.findOne({ userId: doctorId });
    if (!offlineDoctor) return;

    const waitingConsultations = await Consultation.find({
      doctorId,
      status: 'waiting',
      type: 'live',
    });

    if (waitingConsultations.length === 0) return;

    // Find available online doctors with the same specialization, excluding the offline one
    const availableDoctors = await Doctor.find({
      isOnline: true,
      specialization: offlineDoctor.specialization,
      userId: { $ne: doctorId },
    }).sort({ currentQueueLength: 1 });

    if (availableDoctors.length === 0) {
      if (io) {
        io.to('admin').emit('admin:no-doctors-available', {
          message: `No available doctors for specialization: ${offlineDoctor.specialization}`,
          affectedPatients: waitingConsultations.map((c) => c.patientId),
        });
      }
      return;
    }

    let doctorIndex = 0;
    for (const consultation of waitingConsultations) {
      const newDoctor = availableDoctors[doctorIndex % availableDoctors.length];
      consultation.doctorId = newDoctor.userId;
      await consultation.save();

      // Update queue lengths
      await Doctor.findOneAndUpdate(
        { userId: newDoctor.userId },
        { $inc: { currentQueueLength: 1 } }
      );

      if (io) {
        io.to(`patient:${consultation.patientId}`).emit('patient:reassigned', {
          message: 'Your doctor is no longer available. You have been reassigned to another doctor.',
          newDoctorId: newDoctor.userId,
          consultationId: consultation._id,
        });

        io.to(`doctor:${newDoctor.userId}`).emit('queue:updated', {
          queue: await reorderQueue(newDoctor.userId),
        });

        io.to('admin').emit('admin:patient-reassigned', {
          consultationId: consultation._id,
          patientId: consultation.patientId,
          fromDoctorId: doctorId,
          toDoctorId: newDoctor.userId,
        });
      }

      doctorIndex++;
    }

    // Reset the offline doctor's queue length
    await Doctor.findOneAndUpdate({ userId: doctorId }, { currentQueueLength: 0 });
  } catch (err) {
    console.error('Reassign patients error:', err.message);
  }
};

/**
 * Load Balancing: When multiple critical patients arrive for the same doctor,
 * assign the highest-priority to the target doctor and spill over the rest.
 */
const handleEmergencySpillover = async (targetDoctorId, consultations, io) => {
  try {
    if (consultations.length <= 1) return;

    // Sort by priority score descending - highest priority stays with target doctor
    const sorted = [...consultations].sort((a, b) => b.priorityScore - a.priorityScore);
    const keepWithDoctor = sorted[0]; // highest priority stays
    const spillover = sorted.slice(1);

    const targetDoctor = await Doctor.findOne({ userId: targetDoctorId });
    const spec = targetDoctor ? targetDoctor.specialization : 'General Physician';

    // Find other available doctors (same specialization first, then broader)
    let availableDoctors = await Doctor.find({
      isOnline: true,
      userId: { $ne: targetDoctorId },
      specialization: spec,
    }).sort({ currentQueueLength: 1 });

    // If not enough same-spec doctors, include General Physician
    if (availableDoctors.length < spillover.length) {
      const generalDoctors = await Doctor.find({
        isOnline: true,
        userId: { $ne: targetDoctorId },
        specialization: 'General Physician',
      }).sort({ currentQueueLength: 1 });

      const existingIds = new Set(availableDoctors.map((d) => d.userId.toString()));
      for (const gd of generalDoctors) {
        if (!existingIds.has(gd.userId.toString())) {
          availableDoctors.push(gd);
        }
      }
    }

    let doctorIndex = 0;
    const unassigned = [];

    for (const consultation of spillover) {
      if (doctorIndex < availableDoctors.length) {
        const newDoctor = availableDoctors[doctorIndex];
        consultation.doctorId = newDoctor.userId;
        await consultation.save();

        await Doctor.findOneAndUpdate(
          { userId: newDoctor.userId },
          { $inc: { currentQueueLength: 1 } }
        );
        await Doctor.findOneAndUpdate(
          { userId: targetDoctorId },
          { $inc: { currentQueueLength: -1 } }
        );

        if (io) {
          io.to(`patient:${consultation.patientId}`).emit('patient:reassigned', {
            message: 'Due to high emergency load, you have been assigned to another available doctor.',
            newDoctorId: newDoctor.userId,
            consultationId: consultation._id,
          });
          io.to(`doctor:${newDoctor.userId}`).emit('queue:updated', {
            queue: await reorderQueue(newDoctor.userId),
          });
        }
        doctorIndex++;
      } else {
        unassigned.push(consultation);
      }
    }

    // Critical Surge Alert if patients cannot be assigned
    if (unassigned.length > 0 && io) {
      io.to('admin').emit('admin:critical-surge', {
        message: `Critical Surge: ${unassigned.length} emergency patient(s) could not be assigned to any doctor.`,
        unassignedPatients: unassigned.map((c) => ({
          consultationId: c._id,
          patientId: c.patientId,
        })),
      });
    }
  } catch (err) {
    console.error('Emergency spillover error:', err.message);
  }
};

module.exports = {
  calculatePriorityScore,
  applyAgingAlgorithm,
  reorderQueue,
  checkDoctorInaction,
  reassignPatients,
  handleEmergencySpillover,
  checkCascadeEffect,
};
