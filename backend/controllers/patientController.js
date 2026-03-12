const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const { assignDoctor, recalculateQueue } = require('../services/queueService');
const { calculatePriority, getWaitingTimeMinutes } = require('../services/priorityService');
const { predictDuration } = require('../services/mlService');

const joinQueue = async (req, res) => {
  try {
    const { name, age, symptoms, emergencyLevel, preferredDoctor } = req.body;
    const io = req.app.get('io');

    // Get previous visits count
    const prevConsultations = await Consultation.countDocuments({
      patientId: { $exists: true },
      'patientId': req.user._id
    });

    // Predict duration
    const predictedDuration = await predictDuration(age, symptoms, emergencyLevel, prevConsultations);

    // Assign doctor
    const doctor = await assignDoctor(symptoms, preferredDoctor || null);
    if (!doctor) {
      return res.status(400).json({ message: 'No doctors available at this time' });
    }

    // Create patient record
    const patient = await Patient.create({
      userId: req.user._id,
      name,
      age,
      symptoms,
      emergencyLevel: emergencyLevel || 1,
      preferredDoctor: preferredDoctor || null,
      predictedDuration,
      assignedDoctor: doctor._id,
      previousVisits: prevConsultations,
      status: 'waiting'
    });

    // Calculate priority
    const priorityScore = calculatePriority(emergencyLevel || 1, 0);

    // Get current queue length for position
    const queueCount = await Queue.countDocuments({ doctorId: doctor._id, status: 'waiting' });

    // Calculate estimated wait time
    const queueEntries = await Queue.find({ doctorId: doctor._id, status: 'waiting' });
    const estimatedWait = queueEntries.reduce((sum, e) => sum + (e.predictedDuration || 10), 0);

    // Add to queue
    const queueEntry = await Queue.create({
      patientId: patient._id,
      doctorId: doctor._id,
      priorityScore,
      predictedDuration,
      emergencyLevel: emergencyLevel || 1,
      position: queueCount + 1,
      estimatedWaitTime: estimatedWait,
      status: 'waiting'
    });

    // Update doctor queue length
    await Doctor.findByIdAndUpdate(doctor._id, { $inc: { queueLength: 1 } });

    // Update patient with priority and position
    await Patient.findByIdAndUpdate(patient._id, {
      priorityScore,
      queuePosition: queueCount + 1
    });

    // Recalculate queue with priority
    await recalculateQueue(doctor._id, io);

    // Emit real-time event
    if (io) {
      io.emit('patientJoined', {
        patient: { name, symptoms, emergencyLevel, predictedDuration },
        doctorId: doctor._id
      });
    }

    res.status(201).json({
      message: 'Successfully joined queue',
      patient,
      queueEntry,
      doctor: { name: doctor.name, specialization: doctor.specialization },
      estimatedWaitTime: estimatedWait,
      position: queueCount + 1
    });
  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({ message: 'Error joining queue' });
  }
};

const getQueueStatus = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id, status: 'waiting' })
      .populate('assignedDoctor', 'name specialization');

    if (!patient) {
      return res.status(404).json({ message: 'No active queue entry found' });
    }

    const queueEntry = await Queue.findOne({ patientId: patient._id, status: 'waiting' });
    const patientsAhead = queueEntry ? queueEntry.position - 1 : 0;

    res.json({
      patient,
      queuePosition: patient.queuePosition,
      patientsAhead,
      estimatedWaitTime: queueEntry ? queueEntry.estimatedWaitTime : 0,
      assignedDoctor: patient.assignedDoctor
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching queue status' });
  }
};

const getHistory = async (req, res) => {
  try {
    const consultations = await Consultation.find({ patientId: { $in: await getPatientIds(req.user._id) } })
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    res.json(consultations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history' });
  }
};

const getPatientIds = async (userId) => {
  const patients = await Patient.find({ userId });
  return patients.map(p => p._id);
};

const leaveQueue = async (req, res) => {
  try {
    const io = req.app.get('io');
    const patient = await Patient.findOne({ userId: req.user._id, status: 'waiting' });
    if (!patient) {
      return res.status(404).json({ message: 'No active queue entry' });
    }

    await Queue.findOneAndUpdate({ patientId: patient._id, status: 'waiting' }, { status: 'removed' });
    await Patient.findByIdAndUpdate(patient._id, { status: 'completed' });

    if (patient.assignedDoctor) {
      await Doctor.findByIdAndUpdate(patient.assignedDoctor, { $inc: { queueLength: -1 } });
      await recalculateQueue(patient.assignedDoctor, io);
    }

    res.json({ message: 'Left queue successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving queue' });
  }
};

module.exports = { joinQueue, getQueueStatus, getHistory, leaveQueue };
