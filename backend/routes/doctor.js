const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  getQueue,
  toggleStatus,
  startSession,
  endSession,
  getCurrentPatient,
  getDoctors,
} = require('../controllers/doctorController');

const requireDoctor = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied: doctors only' });
  }
  next();
};

// Any authenticated user can list doctors
router.get('/doctors', apiLimiter, auth, getDoctors);

// Doctor-only routes
router.get('/queue', apiLimiter, auth, requireDoctor, getQueue);
router.post('/toggle-status', apiLimiter, auth, requireDoctor, toggleStatus);
router.post('/start-session/:consultationId', apiLimiter, auth, requireDoctor, startSession);
router.post('/end-session/:consultationId', apiLimiter, auth, requireDoctor, endSession);
router.get('/current-patient', apiLimiter, auth, requireDoctor, getCurrentPatient);

module.exports = router;
