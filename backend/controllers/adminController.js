const Consultation = require('../models/Consultation');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const User = require('../models/User');

const getGlobalQueues = async (req, res) => {
  try {
    const consultations = await Consultation.find({
      status: { $in: ['waiting', 'in-progress'] },
    })
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .sort({ priorityScore: -1, createdAt: 1 });

    res.json({ consultations, total: consultations.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const allConsultations = await Consultation.find({});
    const completed = allConsultations.filter((c) => c.status === 'completed');
    const emergencies = allConsultations.filter((c) => c.emergencyLevel >= 4);

    let totalWaitTime = 0;
    let maxWaitTime = 0;
    let totalDoctorIdleTime = 0;
    let waitCount = 0;

    for (const c of completed) {
      if (c.createdAt && c.startedAt) {
        const wait = (new Date(c.startedAt) - new Date(c.createdAt)) / 60000;
        totalWaitTime += wait;
        if (wait > maxWaitTime) maxWaitTime = wait;
        waitCount++;
      }
    }

    // Doctor idle time: sum of gaps between consultations per doctor
    const doctors = await Doctor.find({});
    for (const doctor of doctors) {
      const doctorConsultations = completed
        .filter((c) => c.doctorId && c.doctorId.toString() === doctor.userId.toString())
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

      for (let i = 1; i < doctorConsultations.length; i++) {
        const prev = doctorConsultations[i - 1];
        const curr = doctorConsultations[i];
        if (prev.completedAt && curr.startedAt) {
          const idle = (new Date(curr.startedAt) - new Date(prev.completedAt)) / 60000;
          if (idle > 0) totalDoctorIdleTime += idle;
        }
      }
    }

    const avgWaitTime = waitCount > 0 ? totalWaitTime / waitCount : 0;

    res.json({
      totalConsultations: allConsultations.length,
      completed: completed.length,
      emergencyCount: emergencies.length,
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      maxWaitTime: Math.round(maxWaitTime * 10) / 10,
      totalDoctorIdleTime: Math.round(totalDoctorIdleTime * 10) / 10,
      onlineDoctors: doctors.filter((d) => d.isOnline).length,
      totalDoctors: doctors.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({}).populate('userId', 'name email createdAt');
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({}).populate('userId', 'name email createdAt');
    res.json({ patients });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSimulationData = async (req, res) => {
  try {
    const { patientCount = 20, emergencyRate = 0.2 } = req.body;

    const patients = [];
    for (let i = 0; i < patientCount; i++) {
      const isEmergency = Math.random() < emergencyRate;
      const emergencyLevel = isEmergency
        ? Math.floor(Math.random() * 2) + 4  // 4 or 5
        : Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const arrivalTime = i * 2; // arrives every 2 minutes
      const serviceDuration = 10 + Math.random() * 20; // 10–30 min

      patients.push({
        id: i + 1,
        emergencyLevel,
        arrivalTime,
        serviceDuration: Math.round(serviceDuration),
      });
    }

    // FIFO simulation
    let fifoTime = 0;
    let fifoTotalWait = 0;
    const fifoQueue = [...patients].sort((a, b) => a.arrivalTime - b.arrivalTime);
    for (const p of fifoQueue) {
      const startTime = Math.max(fifoTime, p.arrivalTime);
      fifoTotalWait += startTime - p.arrivalTime;
      fifoTime = startTime + p.serviceDuration;
    }
    const fifoAvgWait = fifoTotalWait / patientCount;

    // Optimized (priority-based) simulation
    let optTime = 0;
    let optTotalWait = 0;
    const optQueue = [...patients].sort((a, b) => {
      const scoreA = a.emergencyLevel * 5;
      const scoreB = b.emergencyLevel * 5;
      return scoreB - scoreA || a.arrivalTime - b.arrivalTime;
    });
    for (const p of optQueue) {
      const startTime = Math.max(optTime, p.arrivalTime);
      optTotalWait += startTime - p.arrivalTime;
      optTime = startTime + p.serviceDuration;
    }
    const optAvgWait = optTotalWait / patientCount;

    res.json({
      params: { patientCount, emergencyRate },
      fifo: {
        avgWaitTime: Math.round(fifoAvgWait * 10) / 10,
        totalWaitTime: Math.round(fifoTotalWait * 10) / 10,
        queue: fifoQueue,
      },
      optimized: {
        avgWaitTime: Math.round(optAvgWait * 10) / 10,
        totalWaitTime: Math.round(optTotalWait * 10) / 10,
        queue: optQueue,
      },
      improvement: {
        waitTimeReduction: Math.round((fifoAvgWait - optAvgWait) * 10) / 10,
        percentageImprovement:
          fifoAvgWait > 0
            ? Math.round(((fifoAvgWait - optAvgWait) / fifoAvgWait) * 1000) / 10
            : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getGlobalQueues, getAnalytics, getAllDoctors, getAllPatients, getSimulationData };
