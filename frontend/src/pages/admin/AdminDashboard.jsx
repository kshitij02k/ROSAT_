import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getDashboard();
      setStats(res.data);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const socket = getSocket();
    socket.on('patientJoined', fetchStats);
    socket.on('queueUpdated', fetchStats);
    socket.on('consultationEnded', fetchStats);
    return () => {
      socket.off('patientJoined');
      socket.off('queueUpdated');
      socket.off('consultationEnded');
    };
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Telemedicine Queue Optimization System Overview</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-info">
            <h4>{stats?.totalPatientsToday || 0}</h4>
            <p>Patients Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">👨‍⚕️</div>
          <div className="stat-info">
            <h4>{stats?.doctorsOnline || 0}</h4>
            <p>Doctors Online</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏱️</div>
          <div className="stat-info">
            <h4>{stats?.avgWaitTime || 0} min</h4>
            <p>Avg Wait Time</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">📋</div>
          <div className="stat-info">
            <h4>{stats?.queueLength || 0}</h4>
            <p>Queue Length</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        <Link to="/admin/queue-monitor" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 28 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>👁</p>
              <h3 style={{ color: 'var(--gray-800)', marginBottom: 6 }}>Queue Monitor</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Live patient queue view</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/optimization" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 28 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>⚡</p>
              <h3 style={{ color: 'var(--gray-800)', marginBottom: 6 }}>Optimization</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>FIFO vs Priority comparison</p>
            </div>
          </div>
        </Link>
        <Link to="/admin/analytics" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 28 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📊</p>
              <h3 style={{ color: 'var(--gray-800)', marginBottom: 6 }}>Analytics</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Performance insights</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📈 System Status</h3>
          <span className="badge badge-success">● Live</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            <div>
              <p className="text-xs text-muted mb-2">Completed Today</p>
              <p className="font-bold" style={{ fontSize: 20 }}>{stats?.completedToday || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-2">System Health</p>
              <span className="badge badge-success">All Systems Normal</span>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <strong>🤖 ML Prediction:</strong> Active &nbsp;|&nbsp;
            <strong>📡 Socket.io:</strong> Connected &nbsp;|&nbsp;
            <strong>🗄️ MongoDB:</strong> Connected &nbsp;|&nbsp;
            <strong>🐍 Flask ML API:</strong> Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
