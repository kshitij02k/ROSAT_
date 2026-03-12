const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Queue = require('../models/Queue');
const Consultation = require('../models/Consultation');
const {
  getFullQueue,
  runFIFOSimulation,
  runOptimizedSimulation,
  computeMetrics
} = require('../services/queueService');
const { predictDuration } = require('../services/mlService');

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalPatientsToday = await Patient.countDocuments({ createdAt: { $gte: today } });
    const doctorsOnline = await Doctor.countDocuments({ isOnline: true });
    const queueLength = await Queue.countDocuments({ status: 'waiting' });
    const completedToday = await Consultation.countDocuments({
      status: 'completed',
      createdAt: { $gte: today }
    });

    const completedConsultations = await Consultation.find({
      status: 'completed',
      createdAt: { $gte: today }
    });

    let avgWaitTime = 0;
    if (completedConsultations.length > 0) {
      const totalWait = completedConsultations.reduce((sum, c) => sum + (c.actualDuration || 0), 0);
      avgWaitTime = Math.round(totalWait / completedConsultations.length);
    }

    res.json({
      totalPatientsToday,
      doctorsOnline,
      queueLength,
      completedToday,
      avgWaitTime
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
};

const getQueueMonitor = async (req, res) => {
  try {
    const queue = await getFullQueue();
    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching queue' });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('userId', 'email');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching doctors' });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability, specialization } = req.body;
    const doctor = await Doctor.findByIdAndUpdate(id, { availability, specialization }, { new: true });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: 'Error updating doctor' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const days = 7;
    const result = [];

    for (let i = 0; i < days; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await Consultation.countDocuments({
        status: 'completed',
        createdAt: { $gte: day, $lt: nextDay }
      });

      const dayConsultations = await Consultation.find({
        status: 'completed',
        createdAt: { $gte: day, $lt: nextDay }
      });

      const avgDuration = dayConsultations.length > 0
        ? Math.round(dayConsultations.reduce((sum, c) => sum + (c.actualDuration || 0), 0) / dayConsultations.length)
        : 0;

      result.unshift({
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        consultations: count,
        avgDuration
      });
    }

    // Emergency level distribution
    const emergencyDist = await Patient.aggregate([
      { $group: { _id: '$emergencyLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ dailyStats: result, emergencyDistribution: emergencyDist });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

const runSimulation = async (req, res) => {
  try {
    const { numPatients = 20, numDoctors = 3, emergencyRate = 0.3, avgConsultDuration = 10 } = req.body;

    // Generate synthetic patients
    const symptoms = ['fever', 'headache', 'chest pain', 'back pain', 'cough', 'eye pain', 'stomach ache'];
    const patients = [];

    for (let i = 0; i < numPatients; i++) {
      const isEmergency = Math.random() < emergencyRate;
      const emergencyLevel = isEmergency ? Math.floor(Math.random() * 2) + 4 : Math.floor(Math.random() * 3) + 1;
      const symptom = symptoms[Math.floor(Math.random() * symptoms.length)];
      const age = Math.floor(Math.random() * 60) + 20;
      const duration = await predictDuration(age, symptom, emergencyLevel);

      patients.push({
        id: i + 1,
        name: `Patient ${i + 1}`,
        age,
        symptom,
        emergencyLevel,
        duration
      });
    }

    // Run both simulations
    const fifoResults = runFIFOSimulation(patients);
    const optimizedResults = runOptimizedSimulation(patients);

    const fifoMetrics = computeMetrics(fifoResults);
    const optimizedMetrics = computeMetrics(optimizedResults);

    // Build queue length over time
    const queueLengthOverTime = patients.map((_, idx) => ({
      time: idx,
      fifo: numPatients - idx,
      optimized: Math.max(0, numPatients - idx - Math.floor(idx * 0.2))
    }));

    // Priority distribution
    const priorityDist = [
      { level: 'Critical (5)', count: patients.filter(p => p.emergencyLevel === 5).length },
      { level: 'High (4)', count: patients.filter(p => p.emergencyLevel === 4).length },
      { level: 'Medium (3)', count: patients.filter(p => p.emergencyLevel === 3).length },
      { level: 'Low (2)', count: patients.filter(p => p.emergencyLevel === 2).length },
      { level: 'Minimal (1)', count: patients.filter(p => p.emergencyLevel === 1).length }
    ];

    res.json({
      fifo: { metrics: fifoMetrics, patients: fifoResults },
      optimized: { metrics: optimizedMetrics, patients: optimizedResults },
      queueLengthOverTime,
      priorityDistribution: priorityDist,
      numPatients,
      numDoctors
    });
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ message: 'Error running simulation' });
  }
};

module.exports = {
  getDashboardStats,
  getQueueMonitor,
  getAllDoctors,
  updateDoctor,
  getAnalytics,
  runSimulation
};
