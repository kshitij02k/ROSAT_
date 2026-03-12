const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'telemedicine_jwt_secret_key_2024', {
    expiresIn: '7d'
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, specialization, experience } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'patient',
      specialization: specialization || '',
      experience: experience || 0
    });

    if (role === 'doctor') {
      await Doctor.create({
        userId: user._id,
        name,
        specialization: specialization || 'physician',
        experience: experience || 0,
        availability: true,
        isOnline: false,
        queueLength: 0
      });
    }

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update doctor online status
    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ userId: user._id }, { isOnline: true, lastActivity: new Date() });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const getProfile = async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    specialization: req.user.specialization
  });
};

const logout = async (req, res) => {
  try {
    if (req.user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ userId: req.user._id }, { isOnline: false });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout' });
  }
};

module.exports = { register, login, getProfile, logout };
