import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doctor as doctorApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

const EMERGENCY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Significant', 4: 'Severe', 5: 'Critical' };

function emergencyBadgeClass(level) {
  if (level <= 1) return 'badge-success';
  if (level === 2) return 'badge-success';
  if (level === 3) return 'badge-warning';
  if (level === 4) return 'badge-danger';
  return 'badge-danger';
}

function emergencyRowClass(level) {
  return `emergency-${Math.min(level, 5)}`;
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

  const fetchDashboard = useCallback(async () => {
    try {
      const [qRes, cpRes] = await Promise.allSettled([
        doctorApi.getQueue(),
        doctorApi.getCurrentPatient()
      ]);
      if (qRes.status === 'fulfilled') {
        const data = qRes.value.data;
        setIsOnline(data.isOnline ?? data.doctor?.isOnline ?? false);
        setQueue(data.queue || data || []);
      }
      if (cpRes.status === 'fulfilled') {
        setCurrentPatient(cpRes.value.data?.patient || cpRes.value.data || null);
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

  // Real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('queue:updated', fetchDashboard);
    return () => socket.off('queue:updated', fetchDashboard);
  }, [fetchDashboard]);

  // Session timer
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
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-full">
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Loading doctor dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  // Sort queue by priority score descending
  const sortedQueue = [...queue].sort(
    (a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
  );

  const predicted = currentPatient?.predictedDuration || 15;
  const remaining = predicted * 60 - sessionElapsed;
  const isOvertime = remaining < 0 && currentPatient?.status === 'in-progress';

  return (
    <div className="page-wrapper">
      <Navbar />
      <div
        style={{
          paddingTop: 'var(--navbar-height)',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 20px 60px'
        }}
      >
        <div className="page-header">
          <h1 className="page-title">👨‍⚕️ Doctor Dashboard</h1>
          <p className="page-subtitle">Manage your queue and patient sessions.</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        {/* ─── Status Toggle ──────────────────────────────────────────── */}
        <div className="status-toggle-section">
          <div>
            <div
              className={`status-toggle-label ${isOnline ? 'active' : 'inactive'}`}
            >
              {isOnline ? '🟢 ACTIVE' : '🔴 INACTIVE'}
            </div>
            <div className="text-muted text-sm" style={{ marginTop: 4 }}>
              {isOnline
                ? 'You are accepting patients right now.'
                : 'Toggle to start accepting patients.'}
            </div>
          </div>

          <label className="toggle-switch" title="Toggle availability">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={handleToggle}
              disabled={toggleLoading}
            />
            <span className="toggle-slider" />
          </label>

          <div className="status-indicator">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
            <span>{isOnline ? 'Online & Available' : 'Offline'}</span>
          </div>

          {toggleLoading && <div className="spinner spinner-sm" />}
        </div>

        {/* ─── Current Patient ────────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">🧑‍⚕️ Current Patient</div>
          {currentPatient ? (
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 16,
                  marginBottom: 20
                }}
              >
                <div>
                  <div className="text-muted text-sm">Patient Name</div>
                  <div className="fw-bold" style={{ fontSize: 18 }}>
                    {currentPatient.name || currentPatient.patientName || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted text-sm">Emergency Level</div>
                  <span
                    className={`badge ${emergencyBadgeClass(currentPatient.emergencyLevel)}`}
                  >
                    Level {currentPatient.emergencyLevel} –{' '}
                    {EMERGENCY_LABELS[currentPatient.emergencyLevel] || '—'}
                  </span>
                </div>
                <div>
                  <div className="text-muted text-sm">Mode</div>
                  <span className="badge badge-info">
                    {currentPatient.consultationMode === 'video' ? '📹 Video' : '💬 Chat'}
                  </span>
                </div>
                <div>
                  <div className="text-muted text-sm">Predicted Duration</div>
                  <div className="fw-bold">{predicted} min</div>
                </div>
                <div>
                  <div className="text-muted text-sm">Status</div>
                  <span
                    className={`badge ${currentPatient.status === 'in-progress' ? 'badge-success' : 'badge-warning'}`}
                  >
                    {currentPatient.status === 'in-progress' ? '🟢 In Progress' : '⏳ Waiting'}
                  </span>
                </div>
                {currentPatient.status === 'in-progress' && (
                  <div>
                    <div className="text-muted text-sm">Session Timer</div>
                    <div
                      className="fw-bold"
                      style={{ fontSize: 22, color: isOvertime ? 'var(--danger)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {isOvertime ? '+' : ''}{formatElapsed(Math.abs(remaining))}
                    </div>
                    {isOvertime && (
                      <div className="text-sm" style={{ color: 'var(--danger)' }}>Overtime!</div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <div className="text-muted text-sm">Symptoms</div>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 14 }}>
                  {currentPatient.symptoms || '—'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {currentPatient.status !== 'in-progress' && (
                  <button
                    className="btn btn-success"
                    onClick={handleStart}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <div className="spinner spinner-sm" /> : '▶️ Start Session'}
                  </button>
                )}
                {currentPatient.status === 'in-progress' && (
                  <button
                    className="btn btn-danger"
                    onClick={handleEnd}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <div className="spinner spinner-sm" /> : '⏹ End Session'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon" style={{ fontSize: 36 }}>🪑</div>
              <div className="empty-state-title">No Current Patient</div>
              <div className="empty-state-desc">
                {isOnline
                  ? 'Waiting for next patient in the queue.'
                  : 'Set your status to Active to start receiving patients.'}
              </div>
            </div>
          )}
        </div>

        {/* ─── Queue Overview ─────────────────────────────────────────── */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16
            }}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              📋 Queue Overview
            </div>
            <span className="badge badge-info">{sortedQueue.length} waiting</span>
          </div>

          {sortedQueue.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>✅</div>
              <div className="empty-state-title">Queue is Empty</div>
              <div className="empty-state-desc">No patients waiting.</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Emergency</th>
                    <th>Symptoms</th>
                    <th>Est. Duration</th>
                    <th>Priority Score</th>
                    <th>Wait Time</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQueue.map((entry, idx) => (
                    <tr
                      key={entry._id || entry.id || idx}
                      className={emergencyRowClass(entry.emergencyLevel)}
                    >
                      <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        {entry.name || entry.patientName || '—'}
                      </td>
                      <td>
                        <span className={`badge ${emergencyBadgeClass(entry.emergencyLevel)}`}>
                          {entry.emergencyLevel} – {EMERGENCY_LABELS[entry.emergencyLevel] || '—'}
                        </span>
                      </td>
                      <td
                        style={{
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={entry.symptoms}
                      >
                        {entry.symptoms || '—'}
                      </td>
                      <td>{entry.predictedDuration != null ? `${entry.predictedDuration} min` : '—'}</td>
                      <td>
                        <div
                          className={`priority-badge priority-${Math.min(entry.emergencyLevel || 1, 5)}`}
                        >
                          {entry.priorityScore != null ? entry.priorityScore.toFixed(1) : '—'}
                        </div>
                      </td>
                      <td>{entry.waitTime != null ? `${entry.waitTime} min` : '—'}</td>
                      <td>
                        <span className="badge badge-info">
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
      <NotificationBar userRole="doctor" />
    </div>
  );
}

export default DoctorDashboard;
