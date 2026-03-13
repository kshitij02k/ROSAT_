const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  joinQueue,
  getMyQueue,
  getHistory,
  bookAppointment,
  getMyAppointments,
} = require('../controllers/patientController');

const requirePatient = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied: patients only' });
  }
  next();
};

router.use(apiLimiter, auth, requirePatient);

router.post('/join-queue', joinQueue);
router.get('/my-queue', getMyQueue);
router.get('/history', getHistory);
router.post('/appointment', bookAppointment);
router.get('/appointments', getMyAppointments);

module.exports = router;
