const express = require('express');
const router = express.Router();
const { joinQueue, getQueueStatus, getHistory, leaveQueue, getAvailableDoctors } = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/available-doctors', getAvailableDoctors); // accessible to any authenticated user
router.post('/join-queue', authorize('patient'), joinQueue);
router.get('/queue-status', authorize('patient'), getQueueStatus);
router.get('/history', authorize('patient'), getHistory);
router.post('/leave-queue', authorize('patient'), leaveQueue);

module.exports = router;
