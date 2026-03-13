const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'Cardiologist',
      'Neurologist',
      'General Physician',
      'Orthopedist',
      'Dermatologist',
      'Pulmonologist',
      'Gastroenterologist',
      'Psychiatrist',
    ],
  },
  experience: {
    type: Number,
    default: 0,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentQueueLength: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Doctor', DoctorSchema);
