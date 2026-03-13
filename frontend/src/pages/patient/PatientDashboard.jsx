import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patient as patientApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

const EMERGENCY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Significant', 4: 'Severe', 5: 'Critical' };
const EMERGENCY_BADGE = { 1: 'badge-success', 2: 'badge-success', 3: 'badge-warning', 4: 'badge-danger', 5: 'badge-danger' };
const STATUS_BADGE = { waiting: 'badge-warning', 'in-progress': 'badge-success', completed: 'badge-secondary' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PatientDashboard() {
  const navigate = useNavigate();

  const [queueEntry, setQueueEntry] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [qRes, apptRes, histRes] = await Promise.allSettled([
        patientApi.getMyQueue(),
        patientApi.getMyAppointments(),
        patientApi.getHistory()
      ]);
      if (qRes.status === 'fulfilled') setQueueEntry(qRes.value.data);
      if (apptRes.status === 'fulfilled')
        setAppointments(apptRes.value.data.appointments || apptRes.value.data || []);
      if (histRes.status === 'fulfilled')
        setHistory(histRes.value.data.history || histRes.value.data || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time queue updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleQueueUpdate = (data) => {
      setQueueEntry((prev) => (prev ? { ...prev, ...data } : data));
    };
    const handleWaitUpdate = (data) => {
      setQueueEntry((prev) =>
        prev ? { ...prev, estimatedWait: data.estimatedWait } : prev
      );
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('patient:wait-updated', handleWaitUpdate);
    socket.on('patient:called', fetchAll);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('patient:wait-updated', handleWaitUpdate);
      socket.off('patient:called', fetchAll);
    };
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-full">
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Loading dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  const hasQueue = queueEntry && queueEntry.status !== 'completed' && queueEntry.status !== 'cancelled';

  return (
    <div className="page-wrapper">
      <Navbar />
      <div
        style={{
          paddingTop: 'var(--navbar-height)',
          maxWidth: 900,
          margin: '0 auto',
          padding: '80px 20px 60px'
        }}
      >
        <div className="page-header">
          <h1 className="page-title">🏠 My Dashboard</h1>
          <p className="page-subtitle">Track your queue position and appointments in real-time.</p>
        </div>

        {error && (
          <div className="alert alert-warning">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        {/* Queue Status */}
        {hasQueue ? (
          <div>
            <div className="queue-status-card">
              <div className="queue-position">#{queueEntry.position ?? '—'}</div>
              <div className="queue-position-label">Your Queue Position</div>
              <div className="queue-info-grid">
                <div className="queue-info-item">
                  <div className="queue-info-item-value">{queueEntry.patientsAhead ?? 0}</div>
                  <div className="queue-info-item-label">Patients Ahead</div>
                </div>
                <div className="queue-info-item">
                  <div className="queue-info-item-value">{queueEntry.estimatedWait ?? '—'} min</div>
                  <div className="queue-info-item-label">Est. Wait Time</div>
                </div>
                <div className="queue-info-item">
                  <div className="queue-info-item-value">
                    {queueEntry.status === 'in-progress' ? '🟢 Active' : '⏳ Waiting'}
                  </div>
                  <div className="queue-info-item-label">Status</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Consultation Details</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16
                }}
              >
                <div>
                  <div className="text-muted text-sm">Assigned Doctor</div>
                  <div className="fw-bold">
                    {queueEntry.doctorName
                      ? `Dr. ${queueEntry.doctorName}`
                      : queueEntry.doctor?.name
                      ? `Dr. ${queueEntry.doctor.name}`
                      : '—'}
                  </div>
                  <div className="text-muted text-sm">
                    {queueEntry.doctorSpecialization || queueEntry.doctor?.specialization || ''}
                  </div>
                </div>
                <div>
                  <div className="text-muted text-sm">Consultation Mode</div>
                  <span className="badge badge-info">
                    {queueEntry.consultationMode === 'video' ? '📹 Video Call' : '💬 Chat'}
                  </span>
                </div>
                <div>
                  <div className="text-muted text-sm">Emergency Level</div>
                  <span
                    className={`badge ${EMERGENCY_BADGE[queueEntry.emergencyLevel] || 'badge-secondary'}`}
                  >
                    Level {queueEntry.emergencyLevel ?? '—'} –{' '}
                    {EMERGENCY_LABELS[queueEntry.emergencyLevel] || ''}
                  </span>
                </div>
                <div>
                  <div className="text-muted text-sm">Priority Score</div>
                  <div
                    className={`priority-badge priority-${Math.min(queueEntry.emergencyLevel || 1, 5)}`}
                    style={{ display: 'inline-flex' }}
                  >
                    {queueEntry.priorityScore?.toFixed(1) ?? '—'}
                  </div>
                </div>
              </div>

              {queueEntry.status === 'in-progress' && (
                <div style={{ marginTop: 20 }}>
                  <button
                    className="btn btn-success btn-lg"
                    onClick={() =>
                      navigate(`/patient/consultation/${queueEntry._id || queueEntry.id}`)
                    }
                  >
                    {queueEntry.consultationMode === 'video'
                      ? '📹 Join Video Session'
                      : '💬 Join Chat Session'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No Active Queue Entry</div>
              <div className="empty-state-desc">Join the live queue to get started.</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => navigate('/patient/join-queue')}
              >
                Join Queue Now
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="card-title">📅 Upcoming Appointments</div>
          {appointments.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>📭</div>
              <div className="empty-state-desc">No upcoming appointments.</div>
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => navigate('/patient/appointment')}
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Doctor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a, idx) => (
                    <tr key={a._id || idx}>
                      <td>{formatDate(a.date)}</td>
                      <td>{a.timeSlot || '—'}</td>
                      <td>{a.doctorName ? `Dr. ${a.doctorName}` : a.doctor?.name ? `Dr. ${a.doctor.name}` : '—'}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[a.status] || 'badge-secondary'}`}>
                          {a.status || 'scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History */}
        <div className="card">
          <div className="card-title">📜 Consultation History</div>
          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <div className="empty-state-icon" style={{ fontSize: 32 }}>📭</div>
              <div className="empty-state-desc">No consultation history yet.</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Symptoms</th>
                    <th>Duration</th>
                    <th>Mode</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => (
                    <tr key={h._id || idx}>
                      <td>{formatDate(h.createdAt || h.date)}</td>
                      <td>{h.doctorName ? `Dr. ${h.doctorName}` : h.doctor?.name ? `Dr. ${h.doctor.name}` : '—'}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.symptoms || '—'}
                      </td>
                      <td>{h.duration != null ? `${h.duration} min` : '—'}</td>
                      <td>
                        <span className="badge badge-info">
                          {h.consultationMode === 'video' ? '📹 Video' : '💬 Chat'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[h.status] || 'badge-secondary'}`}>
                          {h.status || 'completed'}
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

      <NotificationBar userRole="patient" />
    </div>
  );
}

export default PatientDashboard;
