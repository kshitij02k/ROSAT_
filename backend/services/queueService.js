const Queue = require('../models/Queue');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { calculatePriority, getWaitingTimeMinutes } = require('./priorityService');
const { detectSpecialization, predictDuration } = require('./mlService');

// Assign the best available doctor based on specialization and load balancing
const assignDoctor = async (symptoms, preferredDoctorId = null) => {
  const specialization = detectSpecialization(symptoms);

  // Try preferred doctor first
  if (preferredDoctorId) {
    const preferred = await Doctor.findById(preferredDoctorId);
    if (preferred && preferred.isOnline && preferred.availability) {
      return preferred;
    }
  }

  // Find doctors with matching specialization
  const matchingDoctors = await Doctor.find({
    specialization: new RegExp(specialization, 'i'),
    isOnline: true,
    availability: true
  }).sort({ queueLength: 1 });

  if (matchingDoctors.length > 0) return matchingDoctors[0];

  // Fallback: any available doctor with smallest queue
  const anyDoctor = await Doctor.find({ isOnline: true, availability: true })
    .sort({ queueLength: 1 })
    .limit(1);

  return anyDoctor[0] || null;
};

// Recalculate positions and wait times for a doctor's queue
const recalculateQueue = async (doctorId, io = null) => {
  const queueEntries = await Queue.find({ doctorId, status: 'waiting' })
    .populate('patientId')
    .sort({ priorityScore: -1 });

  let cumulativeWait = 0;
  for (let i = 0; i < queueEntries.length; i++) {
    const entry = queueEntries[i];
    const waitMin = getWaitingTimeMinutes(entry.patientId.arrivalTime);
    const newScore = calculatePriority(entry.emergencyLevel, waitMin);

    await Queue.findByIdAndUpdate(entry._id, {
      priorityScore: newScore,
      position: i + 1,
      estimatedWaitTime: cumulativeWait
    });

    await Patient.findByIdAndUpdate(entry.patientId._id, {
      priorityScore: newScore,
      queuePosition: i + 1
    });

    cumulativeWait += entry.predictedDuration;
  }

  if (io) {
    const updatedQueue = await getQueueByDoctor(doctorId);
    io.emit('queueUpdated', { doctorId, queue: updatedQueue });
  }
};

// Get queue entries for a specific doctor
const getQueueByDoctor = async (doctorId) => {
  return await Queue.find({ doctorId, status: 'waiting' })
    .populate('patientId', 'name age symptoms emergencyLevel arrivalTime')
    .sort({ priorityScore: -1 });
};

// Get full queue (admin view)
const getFullQueue = async () => {
  return await Queue.find({ status: 'waiting' })
    .populate('patientId', 'name age symptoms emergencyLevel arrivalTime')
    .populate('doctorId', 'name specialization')
    .sort({ priorityScore: -1 });
};

// FIFO simulation for comparison
const runFIFOSimulation = (patients) => {
  let time = 0;
  const results = [];
  for (const p of patients) {
    const waitTime = time;
    time += p.duration;
    results.push({ ...p, waitTime });
  }
  return results;
};

// Optimized queue simulation
const runOptimizedSimulation = (patients) => {
  const sorted = [...patients].sort((a, b) => {
    const scoreA = a.emergencyLevel * 5;
    const scoreB = b.emergencyLevel * 5;
    return scoreB - scoreA;
  });
  let time = 0;
  const results = [];
  for (const p of sorted) {
    const waitTime = time;
    time += p.duration;
    results.push({ ...p, waitTime });
  }
  return results;
};

const computeMetrics = (results) => {
  const waitTimes = results.map(r => r.waitTime);
  const avg = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length || 0;
  const max = Math.max(...waitTimes) || 0;
  const throughput = results.length;
  return { avgWaitTime: Math.round(avg), maxWaitTime: max, throughput };
};

module.exports = {
  assignDoctor,
  recalculateQueue,
  getQueueByDoctor,
  getFullQueue,
  runFIFOSimulation,
  runOptimizedSimulation,
  computeMetrics
};
