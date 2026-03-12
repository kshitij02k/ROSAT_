/**
 * Seed script for demo accounts
 * Creates admin, doctor, and patient demo accounts
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();

  // Check if already seeded
  const existing = await User.findOne({ email: 'admin@telemed.com' });
  if (existing) {
    console.log('Demo accounts already exist. Skipping seed.');
    process.exit(0);
  }

  console.log('Seeding demo accounts...');

  // Create admin
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@telemed.com',
    password: 'admin123',
    role: 'admin'
  });

  // Create doctor 1
  const doctor1User = await User.create({
    name: 'Dr. Sarah Johnson',
    email: 'doctor@telemed.com',
    password: 'doctor123',
    role: 'doctor',
    specialization: 'physician',
    experience: 8
  });

  await Doctor.create({
    userId: doctor1User._id,
    name: 'Dr. Sarah Johnson',
    specialization: 'physician',
    experience: 8,
    availability: true,
    isOnline: true,
    queueLength: 0
  });

  // Create doctor 2
  const doctor2User = await User.create({
    name: 'Dr. Michael Chen',
    email: 'doctor2@telemed.com',
    password: 'doctor123',
    role: 'doctor',
    specialization: 'cardiologist',
    experience: 12
  });

  await Doctor.create({
    userId: doctor2User._id,
    name: 'Dr. Michael Chen',
    specialization: 'cardiologist',
    experience: 12,
    availability: true,
    isOnline: true,
    queueLength: 0
  });

  // Create patient
  await User.create({
    name: 'John Patient',
    email: 'patient@telemed.com',
    password: 'patient123',
    role: 'patient'
  });

  console.log('✅ Demo accounts created:');
  console.log('  Admin:   admin@telemed.com / admin123');
  console.log('  Doctor:  doctor@telemed.com / doctor123');
  console.log('  Doctor2: doctor2@telemed.com / doctor123');
  console.log('  Patient: patient@telemed.com / patient123');

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
