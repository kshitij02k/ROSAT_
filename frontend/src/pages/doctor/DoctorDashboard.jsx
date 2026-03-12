import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const DoctorDashboard = ({ user }) => {
  const [doctorData, setDoctorData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');

  const fetchData = async () => {
    try {
      const [profileRes, queueRes, currentRes] = await Promise.all([
        doctorAPI.getProfile(),
        doctorAPI.getQueue(),
        doctorAPI.getCurrentPatient()
      ]);
      setDoctorData(profileRes.data);
      setQueue(queueRes.data);
      setCurrentPatient(currentRes.data?.patient || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();

    socket.on('patientJoined', (data) => {
      setNotification(`New patient joined: ${data.patient?.name}`);
      setTimeout(() => setNotification(''), 5000);
      fetchData();
    });

    socket.on('queueUpdated', fetchData);

    return () => {
      socket.off('patientJoined');
      socket.off('queueUpdated');
    };
  }, []);

  const handleAvailability = async () => {
    try {
      await doctorAPI.updateAvailability({ availability: !doctorData?.availability });
      fetchData();
    } catch { }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const nextPatient = queue[0] ? (queue[0].patientId || queue[0]) : null;

  return (
    <div>
      {notification && (
        <div className="notification">
          🔔 {notification}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Doctor Dashboard</h1>
          <p>Welcome back, {user?.name}</p>
        </div>
        <button
          className={`btn ${doctorData?.availability ? 'btn-success' : 'btn-secondary'}`}
          onClick={handleAvailability}
        >
          {doctorData?.availability ? '🟢 Available' : '🔴 Unavailable'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🩺</div>
          <div className="stat-info">
            <h4>{doctorData?.totalPatientsToday || 0}</h4>
            <p>Patients Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">📋</div>
          <div className="stat-info">
            <h4>{doctorData?.queueLength || 0}</h4>
            <p>Queue Length</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h4>{currentPatient ? 1 : 0}</h4>
            <p>Current Patient</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🏥</div>
          <div className="stat-info">
            <h4>{doctorData?.specialization || 'N/A'}</h4>
            <p>Specialization</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3>👤 Current Patient</h3>
          </div>
          <div className="card-body">
            {currentPatient ? (
              <div>
                <h4 style={{ marginBottom: 8 }}>{currentPatient.name}</h4>
                <p className="text-muted mb-2">{currentPatient.symptoms}</p>
                <div className="flex gap-4">
                  <span className={`emergency-badge emergency-${currentPatient.emergencyLevel}`}>
                    Level {currentPatient.emergencyLevel}
                  </span>
                  <span className="text-sm text-muted">Age: {currentPatient.age}</span>
                </div>
                <Link to="/doctor/current-consultation" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  Go to Consultation
                </Link>
              </div>
            ) : (
              <div className="text-center" style={{ padding: 20 }}>
                <p style={{ fontSize: 32 }}>💤</p>
                <p className="text-muted">No active patient</p>
                {nextPatient && (
                  <Link to="/doctor/queue" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
                    Start Next Patient
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>⏭️ Next in Queue</h3>
          </div>
          <div className="card-body">
            {nextPatient ? (
              <div>
                <h4 style={{ marginBottom: 8 }}>{nextPatient.name}</h4>
                <p className="text-muted mb-2">{nextPatient.symptoms}</p>
                <div className="flex gap-4 items-center">
                  <span className={`emergency-badge emergency-${nextPatient.emergencyLevel}`}>
                    Level {nextPatient.emergencyLevel}
                  </span>
                  <span className="text-sm text-muted">
                    Wait: {queue[0]?.estimatedWaitTime || 0} min
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center" style={{ padding: 20 }}>
                <p style={{ fontSize: 32 }}>✨</p>
                <p className="text-muted">Queue is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/doctor/current-consultation" className="btn btn-primary">
              🩺 Current Consultation
            </Link>
            <Link to="/doctor/queue" className="btn btn-secondary">
              📋 View Queue
            </Link>
            <Link to="/doctor/history" className="btn btn-secondary">
              📜 View History
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
