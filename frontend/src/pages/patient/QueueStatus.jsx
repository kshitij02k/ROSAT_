import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const QueueStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await patientAPI.getQueueStatus();
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const socket = getSocket();

    socket.on('queueUpdated', () => {
      fetchStatus();
      setNotification('Queue has been updated');
      setTimeout(() => setNotification(''), 4000);
    });

    socket.on('consultationStarted', (data) => {
      setNotification('Your consultation is starting!');
      setTimeout(() => setNotification(''), 5000);
    });

    socket.on('doctorAssigned', (data) => {
      setNotification(`Doctor assigned: ${data.doctorName}`);
      setTimeout(() => setNotification(''), 4000);
    });

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      socket.off('queueUpdated');
      socket.off('consultationStarted');
      socket.off('doctorAssigned');
      clearInterval(interval);
    };
  }, []);

  const handleLeaveQueue = async () => {
    if (!window.confirm('Are you sure you want to leave the queue?')) return;
    try {
      await patientAPI.leaveQueue();
      setStatus(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to leave queue');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  if (!status) {
    return (
      <div className="queue-status-container">
        <div className="page-header">
          <h1>Queue Status</h1>
        </div>
        <div className="queue-status-card">
          <p style={{ fontSize: 48 }}>🔍</p>
          <h2 style={{ marginBottom: 8 }}>Not in Queue</h2>
          <p className="text-muted mb-4">You are not currently in any consultation queue</p>
          <Link to="/patient/join-queue" className="btn btn-primary btn-lg">
            ➕ Join Queue
          </Link>
        </div>
      </div>
    );
  }

  const patient = status.patient;
  const emergencyColors = { 5: '#ef4444', 4: '#f97316', 3: '#f59e0b', 2: '#3b82f6', 1: '#10b981' };
  const emergencyLabels = { 5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Minimal' };

  return (
    <div className="queue-status-container">
      {notification && (
        <div className="notification success">
          🔔 {notification}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Your Queue Status</h1>
          <p>Real-time updates via Socket.io</p>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleLeaveQueue}>
          Leave Queue
        </button>
      </div>

      <div className="queue-status-card">
        <p className="text-sm text-muted" style={{ marginBottom: 8 }}>Your Position</p>
        <div className="queue-position-display">{status.queuePosition}</div>
        <p className="queue-position-label">in queue</p>

        <div className="queue-details-grid">
          <div className="queue-detail-item">
            <h4>{status.patientsAhead}</h4>
            <p>Patients Ahead</p>
          </div>
          <div className="queue-detail-item">
            <h4>{status.estimatedWaitTime} min</h4>
            <p>Estimated Wait</p>
          </div>
          <div className="queue-detail-item">
            <h4>{patient?.predictedDuration || 10} min</h4>
            <p>Predicted Duration</p>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h3>Patient Details</h3>
          <span
            className="badge"
            style={{
              background: `${emergencyColors[patient?.emergencyLevel]}20`,
              color: emergencyColors[patient?.emergencyLevel]
            }}
          >
            {emergencyLabels[patient?.emergencyLevel]} Priority
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p className="text-xs text-muted">Name</p>
              <p className="font-semibold">{patient?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Age</p>
              <p className="font-semibold">{patient?.age} years</p>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <p className="text-xs text-muted">Symptoms</p>
              <p className="font-semibold">{patient?.symptoms}</p>
            </div>
          </div>
        </div>
      </div>

      {status.assignedDoctor && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>👨‍⚕️ Assigned Doctor</h3>
            <span className="badge badge-success">Assigned</span>
          </div>
          <div className="card-body">
            <h4 style={{ marginBottom: 4 }}>{status.assignedDoctor.name}</h4>
            <p className="text-muted">{status.assignedDoctor.specialization}</p>
          </div>
        </div>
      )}

      <div className="alert alert-info">
        <strong>💡 How it works:</strong> Your position updates automatically as patients
        are seen. Emergency cases may move ahead of you based on priority scoring.
        You'll be notified when your consultation is about to begin.
      </div>
    </div>
  );
};

export default QueueStatus;
