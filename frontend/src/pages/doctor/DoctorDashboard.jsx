import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doctor as doctorApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

const EMERGENCY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Significant', 4: 'Severe', 5: 'Critical' };

const badgeBase = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

function emergencyBadgeClass(level) {
  if (level <= 2) return `${badgeBase} bg-green-100 text-green-700`;
  if (level === 3) return `${badgeBase} bg-amber-100 text-amber-700`;
  if (level === 4) return `${badgeBase} bg-orange-100 text-orange-700`;
  return `${badgeBase} bg-red-100 text-red-700`;
}

function emergencyRowClass(level) {
  if (level <= 2) return 'bg-green-50';
  if (level === 3) return 'bg-amber-50';
  return 'bg-red-50';
}

function priorityBadgeClass(level) {
  if (level <= 2) return `${badgeBase} bg-green-100 text-green-700`;
  if (level === 3) return `${badgeBase} bg-amber-100 text-amber-700`;
  if (level === 4) return `${badgeBase} bg-orange-100 text-orange-700`;
  return `${badgeBase} bg-red-100 text-red-700`;
}

function formatElapsed(seconds) {
  if (seconds == null || isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DoctorDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const timerRef = useRef(null);

  // Urgent request popup
  const [urgentPopup, setUrgentPopup] = useState(null);

  // Emergency bell for critical operations
  const [emergencyBell, setEmergencyBell] = useState(false);
  const [consultationMode, setConsultationMode] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const [qRes, cpRes] = await Promise.allSettled([
        doctorApi.getQueue(),
        doctorApi.getCurrentPatient()
      ]);
      if (qRes.status === 'fulfilled') {
        const data = qRes.value.data;
        setIsOnline(data.isOnline ?? false);
        setQueue(data.queue || []);
      }
      if (cpRes.status === 'fulfilled') {
        // Backend returns { consultation }, extract the consultation object
        const cpData = cpRes.value.data;
        setCurrentPatient(cpData?.consultation || null);
      }
    } catch {
      setError('Failed to load queue data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('queue:updated', fetchDashboard);

    // Urgent request popup
    socket.on('urgent:request', (data) => {
      setUrgentPopup(data);
      // If critical, trigger emergency bell
      if (data.emergencyLevel >= 5) {
        setEmergencyBell(true);
        setTimeout(() => setEmergencyBell(false), 10000);
      }
    });

    // Patient selected consultation mode
    socket.on('consultation:mode-selected', (data) => {
      setConsultationMode(data.mode);
      fetchDashboard();
    });

    return () => {
      socket.off('queue:updated', fetchDashboard);
      socket.off('urgent:request');
      socket.off('consultation:mode-selected');
    };
  }, [fetchDashboard]);

  const handleAcceptUrgent = () => {
    const socket = getSocket();
    if (socket && urgentPopup?.consultation?._id) {
      socket.emit('urgent:accept', { consultationId: urgentPopup.consultation._id });
    }
    setUrgentPopup(null);
    fetchDashboard();
  };

  useEffect(() => {
    if (currentPatient && currentPatient.status === 'in-progress') {
      timerRef.current = setInterval(() => setSessionElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setSessionElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [currentPatient]);

  const handleToggle = async () => {
    setToggleLoading(true);
    try {
      const res = await doctorApi.toggleStatus();
      setIsOnline(res.data.isOnline);
    } catch {
      setError('Failed to update status.');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleStart = async () => {
    if (!currentPatient) return;
    setActionLoading(true);
    try {
      await doctorApi.startSession(currentPatient._id || currentPatient.id);
      await fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!currentPatient) return;
    setActionLoading(true);
    try {
      await doctorApi.endSession(currentPatient._id || currentPatient.id);
      setCurrentPatient(null);
      setSessionElapsed(0);
      await fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end session.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar />
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-gray-500">Loading doctor dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  const sortedQueue = [...queue].sort(
    (a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
  );

  const predicted = currentPatient?.predictedDuration || 15;
  const remaining = predicted * 60 - sessionElapsed;
  const isOvertime = remaining < 0 && currentPatient?.status === 'in-progress';

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">👨‍⚕️ Doctor Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your queue and patient sessions.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-6">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        {/* Status Toggle */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className={`text-2xl font-black ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
              {isOnline ? '🟢 ACTIVE' : '🔴 INACTIVE'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {isOnline
                ? 'You are accepting patients right now.'
                : 'Toggle to start accepting patients.'}
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={handleToggle}
              disabled={toggleLoading}
              className="sr-only peer"
            />
            <div className="w-20 h-10 bg-red-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-10 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-8 after:w-8 after:transition-all peer-checked:bg-green-500"></div>
          </label>

          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isOnline ? 'Online & Available' : 'Offline'}
            </span>
          </div>

          {toggleLoading && (
            <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>

        {/* Current Patient */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">🧑‍⚕️ Current Patient</h2>
          {currentPatient ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Patient Name</div>
                  <div className="font-bold text-lg text-gray-900">
                    {currentPatient.patientName || currentPatient.patientId?.name || currentPatient.name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Emergency Level</div>
                  <span className={emergencyBadgeClass(currentPatient.emergencyLevel)}>
                    Level {currentPatient.emergencyLevel} –{' '}
                    {EMERGENCY_LABELS[currentPatient.emergencyLevel] || '—'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Mode</div>
                  <span className={`${badgeBase} bg-blue-100 text-blue-700`}>
                    {currentPatient.consultationMode === 'video' ? '📹 Video'
                      : currentPatient.consultationMode === 'chat' ? '💬 Chat'
                      : '📋 Pending'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Predicted Duration</div>
                  <div className="font-semibold text-sm text-gray-900">{predicted} min</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <span
                    className={`${badgeBase} ${
                      currentPatient.status === 'in-progress'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {currentPatient.status === 'in-progress' ? '🟢 In Progress' : '⏳ Waiting'}
                  </span>
                </div>
                {currentPatient.status === 'in-progress' && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Session Timer</div>
                    <div
                      className={`font-bold text-xl tabular-nums ${
                        isOvertime ? 'text-red-500' : 'text-gray-900'
                      }`}
                    >
                      {isOvertime ? '+' : ''}{formatElapsed(Math.abs(remaining))}
                    </div>
                    {isOvertime && (
                      <div className="text-xs text-red-500">Overtime!</div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <div className="text-xs text-gray-500 mb-1">Symptoms</div>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800">
                  {currentPatient.symptoms || '—'}
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {currentPatient.status !== 'in-progress' && (
                  <button
                    className="px-5 py-2.5 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition text-sm flex items-center gap-2 disabled:opacity-60"
                    onClick={handleStart}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      '▶️ Start Session'
                    )}
                  </button>
                )}
                {currentPatient.status === 'in-progress' && (
                  <button
                    className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition text-sm flex items-center gap-2 disabled:opacity-60"
                    onClick={handleEnd}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      '⏹ End Session'
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🪑</div>
              <div className="font-semibold text-gray-700 mb-1">No Current Patient</div>
              <div className="text-sm">
                {isOnline
                  ? 'Waiting for next patient in the queue.'
                  : 'Set your status to Active to start receiving patients.'}
              </div>
            </div>
          )}
        </div>

        {/* Queue Overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">📋 Queue Overview</h2>
            <span className={`${badgeBase} bg-blue-100 text-blue-700`}>
              {sortedQueue.length} waiting
            </span>
          </div>

          {sortedQueue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-semibold text-gray-700 mb-1">Queue is Empty</div>
              <div className="text-sm">No patients waiting.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Emergency</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Symptoms</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Est. Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priority Score</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Wait Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQueue.map((entry, idx) => (
                    <tr
                      key={entry._id || entry.id || idx}
                      className={emergencyRowClass(entry.emergencyLevel)}
                    >
                      <td className="px-4 py-3 border-t border-gray-100 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3 border-t border-gray-100 font-semibold">
                        {entry.patientName || entry.patientId?.name || entry.name || '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <span className={emergencyBadgeClass(entry.emergencyLevel)}>
                          {entry.emergencyLevel} – {EMERGENCY_LABELS[entry.emergencyLevel] || '—'}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 border-t border-gray-100 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
                        title={entry.symptoms}
                      >
                        {entry.symptoms || '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        {entry.predictedDuration != null ? `${entry.predictedDuration} min` : '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <span className={priorityBadgeClass(entry.emergencyLevel || 1)}>
                          {entry.priorityScore != null ? entry.priorityScore.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        {entry.waitTime != null ? `${entry.waitTime} min` : '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <span className={`${badgeBase} bg-blue-100 text-blue-700`}>
                          {entry.consultationMode === 'video' ? '📹' : '💬'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Bell Alert */}
      {emergencyBell && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center p-4">
          <div className="bg-red-500 text-white rounded-2xl shadow-2xl p-4 max-w-lg w-full flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <div className="font-bold">CRITICAL EMERGENCY</div>
              <div className="text-sm">A critical patient requires immediate attention!</div>
            </div>
          </div>
        </div>
      )}

      {/* Urgent Request Popup */}
      {urgentPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-4xl mb-3 text-center">🚨</div>
            <h2 className="text-xl font-bold text-red-600 text-center">Urgent Patient Request</h2>
            <p className="text-gray-600 text-sm mt-2 text-center">
              {urgentPopup.message}
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">Patient</div>
                  <div className="font-semibold text-sm">{urgentPopup.patientName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Emergency Level</div>
                  <span className={emergencyBadgeClass(urgentPopup.emergencyLevel)}>
                    Level {urgentPopup.emergencyLevel}
                  </span>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Symptoms</div>
                  <div className="text-sm text-gray-900">{urgentPopup.symptoms}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                onClick={() => setUrgentPopup(null)}
              >
                Decline
              </button>
              <button
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold"
                onClick={handleAcceptUrgent}
              >
                ✅ Accept Urgent Patient
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Auto-reassigns to another doctor in 30 seconds if not accepted.
            </p>
          </div>
        </div>
      )}

      <NotificationBar userRole="doctor" />
    </div>
  );
}

export default DoctorDashboard;
