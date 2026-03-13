const mongoose = require('mongoose');

const ConsultationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  symptoms: {
    type: String,
    required: [true, 'Symptoms are required'],
  },
  visitType: {
    type: String,
    enum: ['checkup', 'follow-up'],
    required: true,
  },
  previousVisits: {
    type: Number,
    default: 0,
  },
  emergencyLevel: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  predictedCategory: {
    type: String,
  },
  consultationMode: {
    type: String,
    enum: ['video', 'chat'],
  },
  predictedDuration: {
    type: Number,
  },
  actualDuration: {
    type: Number,
  },
  priorityScore: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'missed'],
    default: 'waiting',
  },
  type: {
    type: String,
    enum: ['live', 'scheduled'],
    default: 'live',
  },
  scheduledDate: {
    type: Date,
  },
  scheduledSlot: {
    type: String,
  },
  age: {
    type: Number,
  },
  gender: {
    type: String,
  },
  patientName: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('Consultation', ConsultationSchema);
