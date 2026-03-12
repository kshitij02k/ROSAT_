const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const Consultation = require('../models/Consultation');
const { recalculateQueue } = require('../services/queueService');

const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor profile not found' });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctor profile' });
  }
};

const getDoctorQueue = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const queue = await Queue.find({ doctorId: doctor._id, status: 'waiting' })
      .populate('patientId', 'name age symptoms emergencyLevel arrivalTime predictedDuration')
      .sort({ priorityScore: -1 });

    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching queue' });
  }
};

const getCurrentPatient = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id }).populate('currentPatient');
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    if (!doctor.currentPatient) {
      return res.json({ message: 'No current patient', patient: null });
    }
    res.json({ patient: doctor.currentPatient });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current patient' });
  }
};

const startConsultation = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { patientId } = req.body;
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Create or update consultation
    let consultation = await Consultation.findOne({ patientId, doctorId: doctor._id, status: 'scheduled' });
    if (!consultation) {
      consultation = await Consultation.create({
        patientId,
        doctorId: doctor._id,
        patientName: patient.name,
        doctorName: doctor.name,
        symptoms: patient.symptoms,
        emergencyLevel: patient.emergencyLevel,
        predictedDuration: patient.predictedDuration,
        startTime: new Date(),
        status: 'in-progress'
      });
    } else {
      consultation.startTime = new Date();
      consultation.status = 'in-progress';
      await consultation.save();
    }

    // Update patient and doctor status
    await Patient.findByIdAndUpdate(patientId, { status: 'in-consultation' });
    await Doctor.findByIdAndUpdate(doctor._id, { currentPatient: patientId, availability: false });

    // Update queue entry
    await Queue.findOneAndUpdate({ patientId, doctorId: doctor._id, status: 'waiting' }, { status: 'in-progress' });

    if (io) {
      io.emit('consultationStarted', { patientId, doctorId: doctor._id, consultationId: consultation._id });
    }

    res.json({ message: 'Consultation started', consultation });
  } catch (error) {
    console.error('Start consultation error:', error);
    res.status(500).json({ message: 'Error starting consultation' });
  }
};

const endConsultation = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { patientId, consultationId } = req.body;
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

    const endTime = new Date();
    const actualDuration = Math.round((endTime - new Date(consultation.startTime)) / (1000 * 60));

    consultation.endTime = endTime;
    consultation.actualDuration = actualDuration;
    consultation.status = 'completed';
    await consultation.save();

    await Patient.findByIdAndUpdate(patientId, { status: 'completed' });
    await Doctor.findByIdAndUpdate(doctor._id, {
      currentPatient: null,
      availability: true,
      $inc: { totalPatientsToday: 1, queueLength: -1 },
      lastActivity: new Date()
    });

    await Queue.findOneAndUpdate({ patientId, doctorId: doctor._id }, { status: 'completed' });

    // Recalculate queue if actual > predicted
    if (actualDuration > consultation.predictedDuration) {
      await recalculateQueue(doctor._id, io);
    }

    if (io) {
      io.emit('consultationEnded', { patientId, doctorId: doctor._id });
      io.emit('queueUpdated', { doctorId: doctor._id });
    }

    res.json({ message: 'Consultation ended', consultation });
  } catch (error) {
    console.error('End consultation error:', error);
    res.status(500).json({ message: 'Error ending consultation' });
  }
};

const getDoctorHistory = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    const consultations = await Consultation.find({ doctorId: doctor._id, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctor history' });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    const doctor = await Doctor.findOneAndUpdate(
      { userId: req.user._id },
      { availability, isOnline: availability },
      { new: true }
    );
    res.json({ message: 'Availability updated', doctor });
  } catch (error) {
    res.status(500).json({ message: 'Error updating availability' });
  }
};

module.exports = {
  getDoctorProfile,
  getDoctorQueue,
  getCurrentPatient,
  startConsultation,
  endConsultation,
  getDoctorHistory,
  updateAvailability
};
