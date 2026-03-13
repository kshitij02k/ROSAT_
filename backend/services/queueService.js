const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');

const calculatePriorityScore = (emergencyLevel, waitingTimeMinutes) => {
  const agingBonus = Math.floor(waitingTimeMinutes / 5);
  return emergencyLevel * 5 * waitingTimeMinutes + agingBonus;
};

const applyAgingAlgorithm = async (io) => {
  try {
    const waitingConsultations = await Consultation.find({ status: 'waiting', type: 'live' });

    for (const consultation of waitingConsultations) {
      const waitingMs = Date.now() - new Date(consultation.createdAt).getTime();
      const waitingMinutes = waitingMs / 60000;
      const agingIncrement = Math.floor(waitingMinutes / 5);

      const newScore = calculatePriorityScore(consultation.emergencyLevel, waitingMinutes);
      consultation.priorityScore = newScore;
      await consultation.save();

      if (io && consultation.doctorId) {
        const updatedQueue = await reorderQueue(consultation.doctorId);
        io.to(`doctor:${consultation.doctorId}`).emit('queue:updated', { queue: updatedQueue });

        // Check if patient exceeded predicted duration and notify next patient
        if (
          consultation.status === 'waiting' &&
          consultation.predictedDuration &&
          waitingMinutes > consultation.predictedDuration
        ) {
          const nextInQueue = updatedQueue[0];
          if (nextInQueue && nextInQueue.patientId) {
            const overrunMinutes = Math.round(waitingMinutes - consultation.predictedDuration);
            io.to(`patient:${nextInQueue.patientId}`).emit('queue:delay-warning', {
              message: 'Current consultation is taking longer than expected. You may be called soon.',
              overrunMinutes,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Aging algorithm error:', err.message);
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
        const alertMsg = {
          message: `Doctor has not started session for consultation ${consultationId} within 3 minutes.`,
          consultationId,
          doctorId,
          patientId,
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

module.exports = {
  calculatePriorityScore,
  applyAgingAlgorithm,
  reorderQueue,
  checkDoctorInaction,
  reassignPatients,
};
