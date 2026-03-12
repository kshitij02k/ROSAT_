import React, { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { adminAPI } from '../../services/api';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminAPI.getAnalytics();
        setAnalytics(res.data);
      } catch { } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } }
  };

  const dailyStats = analytics?.dailyStats || [];
  const emergencyDist = analytics?.emergencyDistribution || [];

  const totalConsultations = dailyStats.reduce((sum, d) => sum + d.consultations, 0);
  const avgDuration = dailyStats.length > 0
    ? Math.round(dailyStats.reduce((sum, d) => sum + d.avgDuration, 0) / dailyStats.length)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>7-day performance overview</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-info">
            <h4>{totalConsultations}</h4>
            <p>Total (7 days)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">⏱️</div>
          <div className="stat-info">
            <h4>{avgDuration} min</h4>
            <p>Avg Duration</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">📅</div>
          <div className="stat-info">
            <h4>{dailyStats[dailyStats.length - 1]?.consultations || 0}</h4>
            <p>Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚨</div>
          <div className="stat-info">
            <h4>{emergencyDist.filter(e => e._id >= 4).reduce((sum, e) => sum + e.count, 0)}</h4>
            <p>High Priority Cases</p>
          </div>
        </div>
      </div>

      <div className="charts-grid mb-4">
        <div className="card">
          <div className="card-header">
            <h3>📊 Daily Consultations (Bar)</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Bar
                data={{
                  labels: dailyStats.map(d => d.date),
                  datasets: [{
                    label: 'Consultations',
                    data: dailyStats.map(d => d.consultations),
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                  }]
                }}
                options={chartOptions}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📈 Average Duration Trend (Line)</h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <Line
                data={{
                  labels: dailyStats.map(d => d.date),
                  datasets: [{
                    label: 'Avg Duration (min)',
                    data: dailyStats.map(d => d.avgDuration),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    tension: 0.3,
                    fill: true
                  }]
                }}
                options={chartOptions}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h3>🥧 Emergency Level Distribution (Pie)</h3>
        </div>
        <div className="card-body">
          {emergencyDist.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
              <div style={{ height: 280 }}>
                <Pie
                  data={{
                    labels: emergencyDist.map(e => `Level ${e._id}`),
                    datasets: [{
                      data: emergencyDist.map(e => e.count),
                      backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981']
                    }]
                  }}
                  options={{ ...chartOptions, plugins: { legend: { position: 'right' } } }}
                />
              </div>
              <div>
                {emergencyDist.map(e => (
                  <div key={e._id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span className={`emergency-badge emergency-${e._id}`}>Level {e._id}</span>
                    <span className="font-bold">{e.count} patients</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No Data</h3>
              <p>Analytics will appear after consultations are completed</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📋 Daily Statistics</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Consultations</th>
                  <th>Avg Duration</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d, i) => (
                  <tr key={i}>
                    <td>{d.date}</td>
                    <td>{d.consultations}</td>
                    <td>{d.avgDuration} min</td>
                    <td>
                      <span className={`badge ${d.consultations > 5 ? 'badge-success' : d.consultations > 0 ? 'badge-warning' : 'badge-secondary'}`}>
                        {d.consultations > 5 ? 'High Activity' : d.consultations > 0 ? 'Moderate' : 'Low Activity'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
