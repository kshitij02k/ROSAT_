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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="bg-gray-900 rounded-2xl aspect-video relative flex items-center justify-center mb-4">
        <div className="text-center">
          <div className="text-5xl mb-2">👨‍⚕️</div>
          <div className="text-slate-400 text-sm">Dr. {doctorName || 'Doctor'}</div>
          <div className="text-slate-500 text-xs mt-1">Video connected</div>
        </div>
        <div className="absolute bottom-3 right-3 w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center">
          <span className="text-xl">🧑</span>
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <button
          className={`p-3 rounded-full text-2xl ${micOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
          onClick={onToggleMic}
          title={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micOn ? '🎙️' : '🔇'}
        </button>
        <button
          className={`p-3 rounded-full text-2xl ${camOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'}`}
          onClick={onToggleCam}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? '📹' : '📷'}
        </button>
        <button
          className="p-3 rounded-full text-2xl bg-slate-600 text-white"
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-4 py-3 bg-primary text-white text-sm font-semibold">
        💬 Chat with Dr. {doctorName || 'Doctor'}
      </div>
      <div className="h-72 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            Chat session started. Say hello!
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className="flex flex-col gap-0.5 max-w-xs">
              <div
                className={`px-4 py-2 text-sm ${
                  msg.sender === 'patient'
                    ? 'bg-primary text-white rounded-2xl rounded-br-none ml-auto'
                    : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              <div className={`text-xs text-gray-400 ${msg.sender === 'patient' ? 'text-right' : ''}`}>
                {msg.time}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-gray-100">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
        />
        <button
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition"
          onClick={send}
        >
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
      text: "Hello! I'm ready to see you. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await patientApi.getMyQueue();
        const data = res.data;
        setConsultation(data);
      } catch {
        setConsultation(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar />
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-gray-500">Loading consultation…</span>
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
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'video' ? '📹' : '💬'} Consultation in Progress
          </h1>
          <p className="text-gray-500 mt-1">
            {isOvertime
              ? '⚠️ Session has exceeded predicted duration'
              : `Predicted duration: ${predicted} minutes`}
          </p>
        </div>

        {/* Timer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
          <div className={`text-6xl font-black tabular-nums ${isOvertime ? 'text-red-500' : 'text-gray-800'}`}>
            {isOvertime ? '+' : ''}{formatTime(Math.abs(remaining))}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {isOvertime ? 'Overtime — session extended' : 'Remaining time'}
          </div>
          <div className="flex gap-6 justify-center text-xs text-gray-400 mt-3">
            <span>Elapsed: {formatTime(elapsed)}</span>
            <span>•</span>
            <span>Mode: {mode === 'video' ? '📹 Video' : '💬 Chat'}</span>
          </div>
        </div>

        {/* Patient + Doctor info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Patient</div>
              <div className="font-semibold text-gray-900">
                {consultation?.name || consultation?.patientName || '—'}
              </div>
              <div className="text-sm text-gray-500 mt-1">{consultation?.symptoms || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Doctor</div>
              <div className="font-semibold text-gray-900">Dr. {doctorName}</div>
              <div className="text-sm text-gray-500 mt-1">
                {consultation?.doctorSpecialization || consultation?.doctor?.specialization || '—'}
              </div>
            </div>
          </div>
        </div>

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

        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm">
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
