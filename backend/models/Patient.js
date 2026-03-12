const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  symptoms: { type: String, required: true },
  emergencyLevel: { type: Number, min: 1, max: 5, default: 1 },
  preferredDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  arrivalTime: { type: Date, default: Date.now },
  predictedDuration: { type: Number, default: 10 },
  priorityScore: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['waiting', 'in-consultation', 'completed', 'no-show'],
    default: 'waiting'
  },
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
  queuePosition: { type: Number, default: 0 },
  previousVisits: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);
