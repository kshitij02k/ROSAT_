const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  getGlobalQueues,
  getAnalytics,
  getAllDoctors,
  getAllPatients,
  getSimulationData,
} = require('../controllers/adminController');

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: admins only' });
  }
  next();
};

router.use(apiLimiter, auth, requireAdmin);

router.get('/global-queues', getGlobalQueues);
router.get('/analytics', getAnalytics);
router.get('/doctors', getAllDoctors);
router.get('/patients', getAllPatients);
router.post('/simulate', getSimulationData);

module.exports = router;
