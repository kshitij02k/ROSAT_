const express = require('express');
const router = express.Router();
const {
  getDoctorProfile,
  getDoctorQueue,
  getCurrentPatient,
  startConsultation,
  endConsultation,
  getDoctorHistory,
  updateAvailability
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('doctor'));
router.get('/profile', getDoctorProfile);
router.get('/queue', getDoctorQueue);
router.get('/current-patient', getCurrentPatient);
router.post('/start-consultation', startConsultation);
router.post('/end-consultation', endConsultation);
router.get('/history', getDoctorHistory);
router.put('/availability', updateAvailability);

module.exports = router;
