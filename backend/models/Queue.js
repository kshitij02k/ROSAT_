const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  priorityScore: { type: Number, default: 0 },
  predictedDuration: { type: Number, default: 10 },
  emergencyLevel: { type: Number, min: 1, max: 5, default: 1 },
  position: { type: Number, default: 0 },
  estimatedWaitTime: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'removed'],
    default: 'waiting'
  },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Queue', queueSchema);
