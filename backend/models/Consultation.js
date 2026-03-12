const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientName: { type: String, default: '' },
  doctorName: { type: String, default: '' },
  symptoms: { type: String, default: '' },
  emergencyLevel: { type: Number, default: 1 },
  predictedDuration: { type: Number, default: 10 },
  actualDuration: { type: Number, default: 0 },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed'],
    default: 'scheduled'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);
