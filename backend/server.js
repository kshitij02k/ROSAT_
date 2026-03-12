require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please slow down' }
});

// Make io accessible in controllers
app.set('io', io);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/patient', apiLimiter, patientRoutes);
app.use('/api/doctor', apiLimiter, doctorRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Aging algorithm: update priority scores every 5 minutes
setInterval(async () => {
  try {
    const Queue = require('./models/Queue');
    const Patient = require('./models/Patient');
    const { calculatePriority, getWaitingTimeMinutes } = require('./services/priorityService');

    const waitingEntries = await Queue.find({ status: 'waiting' }).populate('patientId');
    for (const entry of waitingEntries) {
      if (entry.patientId) {
        const waitMin = getWaitingTimeMinutes(entry.patientId.arrivalTime);
        const newScore = calculatePriority(entry.emergencyLevel, waitMin);
        await Queue.findByIdAndUpdate(entry._id, { priorityScore: newScore });
        await Patient.findByIdAndUpdate(entry.patientId._id, { priorityScore: newScore });
      }
    }
    io.emit('queueUpdated', { type: 'aging' });
  } catch (err) {
    console.error('Aging algorithm error:', err.message);
  }
}, 5 * 60 * 1000);

// No-show detection: remove patients who haven't started in 30 minutes
setInterval(async () => {
  try {
    const Queue = require('./models/Queue');
    const Patient = require('./models/Patient');
    const Doctor = require('./models/Doctor');
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    const noShows = await Queue.find({ status: 'waiting', joinedAt: { $lt: cutoff } });
    for (const entry of noShows) {
      await Queue.findByIdAndUpdate(entry._id, { status: 'removed' });
      await Patient.findByIdAndUpdate(entry.patientId, { status: 'no-show' });
      await Doctor.findByIdAndUpdate(entry.doctorId, { $inc: { queueLength: -1 } });
      io.emit('queueUpdated', { type: 'no-show', patientId: entry.patientId });
    }
  } catch (err) {
    console.error('No-show detection error:', err.message);
  }
}, 2 * 60 * 1000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
