require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const adminRoutes = require('./routes/admin');
const { applyAgingAlgorithm } = require('./services/queueService');

const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Export io getter so controllers can access it without circular imports.
// Using a getter function avoids issues with circular require resolution timing.
const getIo = () => io;
module.exports.getIo = getIo;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── MongoDB ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicine';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// ── Socket.io events ──────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  console.log(`Socket connected: ${user.name} (${user.role})`);

  // Join role-based rooms
  socket.join(`patient:${user.id}`);

  if (user.role === 'doctor') {
    socket.join(`doctor:${user.id}`);
  }

  if (user.role === 'admin') {
    socket.join('admin');
  }

  // Doctor status change
  socket.on('doctor:status-change', async (data) => {
    try {
      const Doctor = require('./models/Doctor');
      const { reassignPatients } = require('./services/queueService');

      const doctor = await Doctor.findOneAndUpdate(
        { userId: user.id },
        { isOnline: data.isOnline },
        { new: true }
      );

      if (!data.isOnline && doctor) {
        await reassignPatients(user.id, io);
      }

      io.to('admin').emit('doctor:status-changed', {
        doctorId: user.id,
        isOnline: data.isOnline,
        name: user.name,
      });
    } catch (err) {
      console.error('doctor:status-change error:', err.message);
    }
  });

  // Consultation start notification relay
  socket.on('consultation:start', (data) => {
    const { patientId, consultationId } = data;
    io.to(`patient:${patientId}`).emit('consultation:started', {
      message: 'Your consultation has started.',
      consultationId,
    });
  });

  // Consultation end notification relay
  socket.on('consultation:end', (data) => {
    const { patientId, consultationId, nextPatientId } = data;
    io.to(`patient:${patientId}`).emit('consultation:ended', {
      message: 'Your consultation has ended.',
      consultationId,
    });
    if (nextPatientId) {
      io.to(`patient:${nextPatientId}`).emit('patient:position-update', {
        message: 'You are next! Please be ready.',
        position: 1,
      });
    }
  });

  // Patient queue position update
  socket.on('patient:position-update', (data) => {
    const { patientId, position, message } = data;
    io.to(`patient:${patientId}`).emit('patient:position-update', { position, message });
  });

  // ── Consultation Mode Selection ─────────────────────────────────────────
  socket.on('consultation:select-mode', async (data) => {
    try {
      const { consultationId, mode } = data;
      const Consultation = require('./models/Consultation');
      const consultation = await Consultation.findById(consultationId);
      if (consultation) {
        consultation.consultationMode = mode;
        await consultation.save();

        // Notify both patient and doctor
        io.to(`doctor:${consultation.doctorId}`).emit('consultation:mode-selected', {
          consultationId,
          mode,
          patientId: consultation.patientId,
        });
        io.to(`patient:${consultation.patientId}`).emit('consultation:mode-selected', {
          consultationId,
          mode,
        });
      }
    } catch (err) {
      console.error('consultation:select-mode error:', err.message);
    }
  });

  // ── Live Chat Messages ──────────────────────────────────────────────────
  socket.on('chat:message', (data) => {
    const { consultationId, recipientId, message, senderName } = data;
    io.to(`patient:${recipientId}`).to(`doctor:${recipientId}`).emit('chat:message', {
      consultationId,
      senderId: user.id,
      senderName: senderName || user.name,
      message,
      timestamp: new Date().toISOString(),
    });
    // Echo back to sender for confirmation
    socket.emit('chat:message', {
      consultationId,
      senderId: user.id,
      senderName: senderName || user.name,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // ── WebRTC Signaling ────────────────────────────────────────────────────
  socket.on('webrtc:offer', (data) => {
    const { recipientId } = data;
    io.to(`patient:${recipientId}`).to(`doctor:${recipientId}`).emit('webrtc:offer', {
      ...data,
      senderId: user.id,
    });
  });

  socket.on('webrtc:answer', (data) => {
    const { recipientId } = data;
    io.to(`patient:${recipientId}`).to(`doctor:${recipientId}`).emit('webrtc:answer', {
      ...data,
      senderId: user.id,
    });
  });

  socket.on('webrtc:ice-candidate', (data) => {
    const { recipientId } = data;
    io.to(`patient:${recipientId}`).to(`doctor:${recipientId}`).emit('webrtc:ice-candidate', {
      ...data,
      senderId: user.id,
    });
  });

  // ── Urgent Request Accept ────────────────────────────────────────────────
  socket.on('urgent:accept', async (data) => {
    try {
      const { consultationId } = data;
      const Consultation = require('./models/Consultation');
      const consultation = await Consultation.findById(consultationId);
      if (consultation && consultation.status === 'waiting') {
        consultation.status = 'in-progress';
        consultation.startedAt = new Date();
        await consultation.save();

        io.to(`patient:${consultation.patientId}`).emit('consultation:started', {
          message: 'Your urgent consultation has been accepted. Please join now.',
          consultationId: consultation._id,
        });
      }
    } catch (err) {
      console.error('urgent:accept error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${user.name}`);
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start the aging algorithm interval (every 60 seconds)
  setInterval(() => applyAgingAlgorithm(io), 60 * 1000);
  console.log('Queue aging algorithm started (60s interval)');
});

module.exports.app = app;
module.exports.server = server;
module.exports.io = io;
