const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getQueueMonitor,
  getAllDoctors,
  updateDoctor,
  getAnalytics,
  runSimulation
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));
router.get('/dashboard', getDashboardStats);
router.get('/queue-monitor', getQueueMonitor);
router.get('/doctors', getAllDoctors);
router.put('/doctors/:id', updateDoctor);
router.get('/analytics', getAnalytics);
router.post('/simulate', runSimulation);

module.exports = router;
