const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: Number, default: 0 },
  availability: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  queueLength: { type: Number, default: 0 },
  currentPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  totalPatientsToday: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);
