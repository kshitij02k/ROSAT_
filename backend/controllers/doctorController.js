const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const { reorderQueue, checkDoctorInaction, reassignPatients } = require('../services/queueService');
const { getIo } = require('../server');

const getQueue = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    const queue = await reorderQueue(req.user.id);
    res.json({ queue, currentQueueLength: queue.length, isOnline: doctor.isOnline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const io = getIo();
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });

    const newStatus = !doctor.isOnline;
    doctor.isOnline = newStatus;
    await doctor.save();

    if (!newStatus) {
      await reassignPatients(req.user.id, io);
    }

    if (io) {
      io.to('admin').emit('doctor:status-changed', {
        doctorId: req.user.id,
        isOnline: newStatus,
        name: req.user.name,
      });
    }

    res.json({ isOnline: newStatus, message: `You are now ${newStatus ? 'online' : 'offline'}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const startSession = async (req, res) => {
  try {
    const io = getIo();
    const { consultationId } = req.params;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

    if (consultation.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to start this session' });
    }

    if (consultation.status !== 'waiting') {
      return res.status(400).json({ message: 'Consultation is not in waiting state' });
    }

    consultation.status = 'in-progress';
    consultation.startedAt = new Date();
    await consultation.save();

    // Notify patient
    if (io) {
      io.to(`patient:${consultation.patientId}`).emit('consultation:started', {
        message: 'Your consultation has started. Please join now.',
        consultationId: consultation._id,
      });
    }

    // Start inaction check if session stalls
    checkDoctorInaction(io, consultationId, req.user.id, consultation.patientId);

    const queue = await reorderQueue(req.user.id);
    if (io) {
      io.to(`doctor:${req.user.id}`).emit('queue:updated', { queue });
    }

    res.json({ consultation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const endSession = async (req, res) => {
  try {
    const io = getIo();
    const { consultationId } = req.params;
    const { notes } = req.body;

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

    if (consultation.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to end this session' });
    }

    if (consultation.status !== 'in-progress') {
      return res.status(400).json({ message: 'Consultation is not in-progress' });
    }

    const now = new Date();
    consultation.status = 'completed';
    consultation.completedAt = now;
    if (consultation.startedAt) {
      consultation.actualDuration = Math.round(
        (now - new Date(consultation.startedAt)) / 60000
      );
    }
    if (notes) consultation.notes = notes;
    await consultation.save();

    await Doctor.findOneAndUpdate(
      { userId: req.user.id },
      { $inc: { currentQueueLength: -1 } }
    );

    if (io) {
      io.to(`patient:${consultation.patientId}`).emit('consultation:ended', {
        message: 'Your consultation has ended.',
        consultationId: consultation._id,
      });
    }

    const updatedQueue = await reorderQueue(req.user.id);

    if (io) {
      io.to(`doctor:${req.user.id}`).emit('queue:updated', { queue: updatedQueue });

      // Notify next patient
      if (updatedQueue.length > 0) {
        const nextPatient = updatedQueue[0];
        io.to(`patient:${nextPatient.patientId}`).emit('patient:position-update', {
          message: 'You are next! Please be ready for your consultation.',
          position: 1,
          consultationId: nextPatient._id,
        });
      }
    }

    res.json({ consultation, nextQueue: updatedQueue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCurrentPatient = async (req, res) => {
  try {
    const consultation = await Consultation.findOne({
      doctorId: req.user.id,
      status: 'in-progress',
    }).populate('patientId', 'name email');

    res.json({ consultation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDoctors = async (req, res) => {
  try {
    const { specialization, isOnline } = req.query;
    const query = {};

    if (specialization) query.specialization = specialization;
    if (isOnline !== undefined) query.isOnline = isOnline === 'true';

    const doctors = await Doctor.find(query).populate('userId', 'name email');

    // Flatten the response so frontend gets name/email/userId at top level
    const flatDoctors = doctors.map((d) => ({
      _id: d._id,
      userId: d.userId?._id || d.userId,
      name: d.userId?.name || 'Unknown',
      email: d.userId?.email || '',
      specialization: d.specialization,
      experience: d.experience,
      isOnline: d.isOnline,
      currentQueueLength: d.currentQueueLength,
      queueLength: d.currentQueueLength,
    }));

    res.json({ doctors: flatDoctors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getQueue, toggleStatus, startSession, endSession, getCurrentPatient, getDoctors };
