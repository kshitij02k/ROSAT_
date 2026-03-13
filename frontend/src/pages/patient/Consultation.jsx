import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patient as patientApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

function formatTime(seconds) {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  const prefix = seconds < 0 ? '-' : '';
  return `${prefix}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function VideoCall({ onToggleMic, onToggleCam, micOn, camOn, doctorName }) {
  return (
    <div className="video-call-container">
      <div className="video-main">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>👨‍⚕️</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            Dr. {doctorName || 'Doctor'}
          </div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
            Video connected
          </div>
        </div>
        <div className="video-self">
          <span style={{ fontSize: 20 }}>🧑</span>
        </div>
      </div>
      <div className="video-controls">
        <button
          className={`video-btn ${micOn ? 'on' : 'off'}`}
          onClick={onToggleMic}
          title={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? '🎙️' : '🔇'}
        </button>
        <button
          className={`video-btn ${camOn ? 'on' : 'off'}`}
          onClick={onToggleCam}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? '📹' : '📷'}
        </button>
        <button
          className="video-btn"
          style={{ background: '#334155' }}
          title="Screen share"
        >
          🖥️
        </button>
      </div>
    </div>
  );
}

function ChatInterface({ messages, onSend, doctorName }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="chat-container">
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--primary)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600
        }}
      >
        💬 Chat with Dr. {doctorName || 'Doctor'}
      </div>
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-muted" style={{ padding: '20px 0', fontSize: 14 }}>
            Chat session started. Say hello!
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender === 'patient' ? 'sent' : 'received'}`}>
            <div>{msg.text}</div>
            <div className="chat-message-time">{msg.time}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-bar">
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
        />
        <button className="btn btn-primary btn-sm" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}

export function Consultation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [messages, setMessages] = useState([
    {
      sender: 'doctor',
      text: 'Hello! I\'m ready to see you. How can I help you today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await patientApi.getMyQueue();
        const data = res.data;
        if (data && (data._id === id || data.id === id || !id)) {
          setConsultation(data);
        } else {
          setConsultation(data);
        }
      } catch {
        setConsultation(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket for chat messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMsg = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'doctor',
          text: data.text || data.message || data,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    };

    socket.on('chat:message', handleMsg);
    socket.on('session:ended', () => navigate('/patient/dashboard'));

    return () => {
      socket.off('chat:message', handleMsg);
      socket.off('session:ended');
    };
  }, [navigate]);

  const handleSend = (text) => {
    const socket = getSocket();
    const msg = {
      sender: 'patient',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, msg]);
    socket?.emit('chat:send', { sessionId: id, text });
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-full">
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Loading consultation…</span>
          </div>
        </div>
      </div>
    );
  }

  const predicted = consultation?.predictedDuration || 15;
  const remaining = predicted * 60 - elapsed;
  const isOvertime = remaining < 0;
  const mode = consultation?.consultationMode || 'video';
  const doctorName = consultation?.doctorName || consultation?.doctor?.name || 'Doctor';

  return (
    <div className="page-wrapper">
      <Navbar />
      <div
        style={{
          paddingTop: 'var(--navbar-height)',
          maxWidth: 800,
          margin: '0 auto',
          padding: '80px 20px 60px'
        }}
      >
        <div className="page-header">
          <h1 className="page-title">
            {mode === 'video' ? '📹' : '💬'} Consultation in Progress
          </h1>
          <p className="page-subtitle">
            {isOvertime
              ? '⚠️ Session has exceeded predicted duration'
              : `Predicted duration: ${predicted} minutes`}
          </p>
        </div>

        {/* Timer */}
        <div className="consultation-timer">
          <div className={`timer-display ${isOvertime ? 'overtime' : ''}`}>
            {isOvertime ? '+' : ''}{formatTime(Math.abs(remaining))}
          </div>
          <div className="timer-label">
            {isOvertime
              ? 'Overtime — session extended'
              : 'Remaining time'}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 24, justifyContent: 'center', fontSize: 13, opacity: 0.7 }}>
            <span>Elapsed: {formatTime(elapsed)}</span>
            <span>•</span>
            <span>Mode: {mode === 'video' ? '📹 Video' : '💬 Chat'}</span>
          </div>
        </div>

        {/* Patient + Doctor info */}
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div className="card-subtitle">Patient</div>
              <div className="fw-bold">{consultation?.name || consultation?.patientName || '—'}</div>
              <div className="text-muted text-sm mt-8">
                {consultation?.symptoms || '—'}
              </div>
            </div>
            <div>
              <div className="card-subtitle">Doctor</div>
              <div className="fw-bold">Dr. {doctorName}</div>
              <div className="text-muted text-sm mt-8">
                {consultation?.doctorSpecialization || consultation?.doctor?.specialization || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Main consultation UI */}
        {mode === 'video' ? (
          <VideoCall
            doctorName={doctorName}
            micOn={micOn}
            camOn={camOn}
            onToggleMic={() => setMicOn((v) => !v)}
            onToggleCam={() => setCamOn((v) => !v)}
          />
        ) : (
          <ChatInterface
            messages={messages}
            onSend={handleSend}
            doctorName={doctorName}
          />
        )}

        <div className="alert alert-info">
          <span>ℹ️</span>
          <span>
            The doctor will end the session when the consultation is complete.
            Please remain available.
          </span>
        </div>
      </div>
      <NotificationBar userRole="patient" />
    </div>
  );
}

export default Consultation;
