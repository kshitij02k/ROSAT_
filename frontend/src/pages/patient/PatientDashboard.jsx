import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const PatientDashboard = ({ user }) => {
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await patientAPI.getQueueStatus();
      setQueueStatus(res.data);
    } catch {
      setQueueStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const socket = getSocket();
    socket.on('queueUpdated', fetchStatus);
    return () => socket.off('queueUpdated', fetchStatus);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{getGreeting()}, {user?.name}! 👋</h1>
          <p>Welcome to your patient dashboard</p>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : queueStatus ? (
        <div className="card mb-4">
          <div className="card-header">
            <h3>🟢 Active Queue Status</h3>
            <span className="badge badge-success">In Queue</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <div className="text-center">
                <p style={{ fontSize: 48, fontWeight: 700, color: 'var(--primary)' }}>
                  #{queueStatus.queuePosition}
                </p>
                <p className="text-muted">Queue Position</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: 48, fontWeight: 700, color: 'var(--warning)' }}>
                  {queueStatus.patientsAhead}
                </p>
                <p className="text-muted">Patients Ahead</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: 48, fontWeight: 700, color: 'var(--success)' }}>
                  {queueStatus.estimatedWaitTime}
                </p>
                <p className="text-muted">Est. Wait (min)</p>
              </div>
            </div>
            {queueStatus.assignedDoctor && (
              <div className="alert alert-info" style={{ marginTop: 16 }}>
                <strong>Assigned Doctor:</strong> {queueStatus.assignedDoctor.name} —{' '}
                {queueStatus.assignedDoctor.specialization}
              </div>
            )}
            <div className="flex gap-4 mt-4">
              <Link to="/patient/queue-status" className="btn btn-primary">
                View Queue Status
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mb-4">
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 48 }}>🏥</p>
            <h3 style={{ marginBottom: 8 }}>Not in Queue</h3>
            <p className="text-muted mb-4">You are not currently in any queue</p>
            <Link to="/patient/join-queue" className="btn btn-primary btn-lg">
              ➕ Join Queue Now
            </Link>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 30 }}>
            <p style={{ fontSize: 36 }}>➕</p>
            <h3 style={{ marginBottom: 8 }}>Join Queue</h3>
            <p className="text-muted mb-4">Start a new telemedicine consultation</p>
            <Link to="/patient/join-queue" className="btn btn-primary">Join Now</Link>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 30 }}>
            <p style={{ fontSize: 36 }}>📜</p>
            <h3 style={{ marginBottom: 8 }}>Consultation History</h3>
            <p className="text-muted mb-4">View your past consultations</p>
            <Link to="/patient/history" className="btn btn-secondary">View History</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
