import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { admin as adminApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EMERGENCY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Significant', 4: 'Severe', 5: 'Critical' };
const STATUS_BADGE = { waiting: 'badge-warning', 'in-progress': 'badge-success', completed: 'badge-secondary' };
const EMERGENCY_BADGE = { 1: 'badge-success', 2: 'badge-success', 3: 'badge-warning', 4: 'badge-danger', 5: 'badge-danger' };

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Tab 1: Overview ───────────────────────────────────────────────────────────
function OverviewTab({ globalQueues, allDoctors, analytics }) {
  const totalPatients = globalQueues.filter((q) =>
    ['waiting', 'in-progress'].includes(q.status)
  ).length;
  const activeDoctors = allDoctors.filter((d) => d.isOnline).length;
  const avgWait = analytics?.avgWaitTime?.toFixed(1) ?? '—';
  const emergencyCases = globalQueues.filter((q) => q.emergencyLevel >= 4).length;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{totalPatients}</div>
          <div className="stat-label">Patients Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍⚕️</div>
          <div className="stat-value">{activeDoctors}</div>
          <div className="stat-label">Active Doctors</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{avgWait} min</div>
          <div className="stat-label">Avg Wait Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-value">{emergencyCases}</div>
          <div className="stat-label">Emergency Cases (4+)</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">👨‍⚕️ All Doctors</div>
        {allDoctors.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-desc">No doctors registered.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Status</th>
                  <th>Queue Length</th>
                  <th>Experience</th>
                </tr>
              </thead>
              <tbody>
                {allDoctors.map((doc, idx) => (
                  <tr key={doc._id || idx}>
                    <td style={{ fontWeight: 600 }}>Dr. {doc.name}</td>
                    <td>{doc.specialization || '—'}</td>
                    <td>
                      <span className={`badge ${doc.isOnline ? 'badge-success' : 'badge-secondary'}`}>
                        {doc.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{doc.queueLength ?? 0}</span>
                    </td>
                    <td>{doc.experience != null ? `${doc.experience} yrs` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Queue Monitor ──────────────────────────────────────────────────────
function QueueMonitorTab({ globalQueues }) {
  return (
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
          🌐 Live Global Queue
        </div>
        <span className="badge badge-info">{globalQueues.length} entries</span>
      </div>

      {globalQueues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">All Clear</div>
          <div className="empty-state-desc">No active queue entries.</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Specialization</th>
                <th>Emergency</th>
                <th>Status</th>
                <th>Wait Time</th>
                <th>Priority Score</th>
              </tr>
            </thead>
            <tbody>
              {globalQueues.map((entry, idx) => (
                <tr
                  key={entry._id || idx}
                  className={`emergency-${Math.min(entry.emergencyLevel || 1, 5)}`}
                >
                  <td style={{ fontWeight: 600 }}>{entry.patientName || entry.name || '—'}</td>
                  <td>{entry.doctorName ? `Dr. ${entry.doctorName}` : '—'}</td>
                  <td>{entry.specialization || entry.doctorSpecialization || '—'}</td>
                  <td>
                    <span className={`badge ${EMERGENCY_BADGE[entry.emergencyLevel] || 'badge-secondary'}`}>
                      {entry.emergencyLevel} – {EMERGENCY_LABELS[entry.emergencyLevel] || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[entry.status] || 'badge-secondary'}`}>
                      {entry.status || '—'}
                    </span>
                  </td>
                  <td>{entry.waitTime != null ? `${entry.waitTime} min` : '—'}</td>
                  <td>
                    <div
                      className={`priority-badge priority-${Math.min(entry.emergencyLevel || 1, 5)}`}
                    >
                      {entry.priorityScore != null ? entry.priorityScore.toFixed(1) : '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Analytics ─────────────────────────────────────────────────────────
function AnalyticsTab({ analytics }) {
  if (!analytics) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <span>Loading analytics…</span>
      </div>
    );
  }

  const waitBySpec = analytics.waitBySpecialization || {};
  const specLabels = Object.keys(waitBySpec);
  const specValues = specLabels.map((k) => waitBySpec[k]);

  const consultOverTime = analytics.consultationsOverTime || [];
  const timeLabels = consultOverTime.map((d) => d.date || d.label || '');
  const timeValues = consultOverTime.map((d) => d.count || 0);

  const modeData = analytics.modeDistribution || { video: 0, chat: 0 };
  const fifoAvg = analytics.fifoAvgWait ?? 0;
  const optimizedAvg = analytics.optimizedAvgWait ?? 0;

  const barChartData = {
    labels: specLabels.length ? specLabels : ['No data'],
    datasets: [
      {
        label: 'Avg Wait Time (min)',
        data: specValues.length ? specValues : [0],
        backgroundColor: CHART_COLORS,
        borderRadius: 6
      }
    ]
  };

  const lineChartData = {
    labels: timeLabels.length ? timeLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Consultations',
        data: timeValues.length ? timeValues : [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4
      }
    ]
  };

  const pieChartData = {
    labels: ['Video Call', 'Chat'],
    datasets: [
      {
        data: [modeData.video || 0, modeData.chat || 0],
        backgroundColor: ['#2563eb', '#10b981'],
        borderWidth: 0
      }
    ]
  };

  const comparisonData = {
    labels: ['FIFO', 'Optimized'],
    datasets: [
      {
        label: 'Avg Wait Time (min)',
        data: [fifoAvg, optimizedAvg],
        backgroundColor: ['#ef4444', '#10b981'],
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };

  const improvement = fifoAvg > 0
    ? (((fifoAvg - optimizedAvg) / fifoAvg) * 100).toFixed(1)
    : '0';

  return (
    <div>
      {/* KPI row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{analytics.avgWaitTime?.toFixed(1) ?? '—'} min</div>
          <div className="stat-label">Avg Wait Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-value">{analytics.maxWaitTime?.toFixed(1) ?? '—'} min</div>
          <div className="stat-label">Max Wait Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💤</div>
          <div className="stat-value">{analytics.doctorIdleTime?.toFixed(1) ?? '—'} min</div>
          <div className="stat-label">Doctor Idle Time</div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">⏱️ Avg Wait by Specialization</div>
          <div className="chart-container">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">📈 Consultations (Last 7 Days)</div>
          <div className="chart-container">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">🥧 Consultation Mode Distribution</div>
          <div className="chart-container-sm">
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">⚡ FIFO vs Optimized</div>
          <div className="chart-container-sm">
            <Bar data={comparisonData} options={{ ...chartOptions, indexAxis: 'x' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 14, color: 'var(--secondary)' }}>
            Optimization saves{' '}
            <strong>
              {fifoAvg > optimizedAvg ? improvement : 0}% wait time
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 4: Simulation ─────────────────────────────────────────────────────────
function SimulationTab() {
  const [patientCount, setPatientCount] = useState(20);
  const [emergencyRate, setEmergencyRate] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runSimulation = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.simulate({ patientCount, emergencyRate });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fifoAvg = result?.fifo?.avgWaitTime ?? 0;
  const optAvg = result?.optimized?.avgWaitTime ?? 0;
  const improvement = fifoAvg > 0
    ? (((fifoAvg - optAvg) / fifoAvg) * 100).toFixed(1)
    : '0';

  const simChartData = result
    ? {
        labels: ['FIFO Algorithm', 'Optimized Algorithm'],
        datasets: [
          {
            label: 'Avg Wait Time (min)',
            data: [fifoAvg, optAvg],
            backgroundColor: ['#ef4444', '#10b981'],
            borderRadius: 8
          }
        ]
      }
    : null;

  const metrics = result
    ? [
        {
          metric: 'Avg Wait Time (min)',
          fifo: fifoAvg.toFixed(1),
          optimized: optAvg.toFixed(1),
          improvement: `${improvement}%`,
          positive: parseFloat(improvement) > 0
        },
        {
          metric: 'Max Wait Time (min)',
          fifo: (result.fifo?.maxWaitTime ?? 0).toFixed(1),
          optimized: (result.optimized?.maxWaitTime ?? 0).toFixed(1),
          improvement: result.fifo?.maxWaitTime > 0
            ? `${(((result.fifo.maxWaitTime - result.optimized.maxWaitTime) / result.fifo.maxWaitTime) * 100).toFixed(1)}%`
            : '0%',
          positive: result.optimized?.maxWaitTime < result.fifo?.maxWaitTime
        },
        {
          metric: 'Emergency Response Time (min)',
          fifo: (result.fifo?.emergencyResponseTime ?? 0).toFixed(1),
          optimized: (result.optimized?.emergencyResponseTime ?? 0).toFixed(1),
          improvement: result.fifo?.emergencyResponseTime > 0
            ? `${(((result.fifo.emergencyResponseTime - result.optimized.emergencyResponseTime) / result.fifo.emergencyResponseTime) * 100).toFixed(1)}%`
            : '0%',
          positive: result.optimized?.emergencyResponseTime < result.fifo?.emergencyResponseTime
        },
        {
          metric: 'Doctor Idle Time (min)',
          fifo: (result.fifo?.doctorIdleTime ?? 0).toFixed(1),
          optimized: (result.optimized?.doctorIdleTime ?? 0).toFixed(1),
          improvement: result.fifo?.doctorIdleTime > 0
            ? `${(((result.fifo.doctorIdleTime - result.optimized.doctorIdleTime) / result.fifo.doctorIdleTime) * 100).toFixed(1)}%`
            : '0%',
          positive: result.optimized?.doctorIdleTime < result.fifo?.doctorIdleTime
        }
      ]
    : [];

  return (
    <div>
      <div className="card">
        <div className="card-title">⚙️ Simulation Parameters</div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        <div className="slider-group">
          <label>
            <span>Patient Count</span>
            <strong>{patientCount}</strong>
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={patientCount}
            onChange={(e) => setPatientCount(Number(e.target.value))}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4
            }}
          >
            <span>1</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <div className="slider-group">
          <label>
            <span>Emergency Rate (%)</span>
            <strong>{emergencyRate}%</strong>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={emergencyRate}
            onChange={(e) => setEmergencyRate(Number(e.target.value))}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4
            }}
          >
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 20,
            color: 'var(--text-muted)'
          }}
        >
          Simulating <strong>{patientCount} patients</strong> with{' '}
          <strong>{emergencyRate}% emergency rate</strong> (~
          {Math.round(patientCount * emergencyRate / 100)} emergency cases)
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={runSimulation}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner spinner-sm" /> Running Simulation…
            </>
          ) : (
            '▶️ Run Simulation'
          )}
        </button>
      </div>

      {result && (
        <>
          <div className="charts-grid">
            <div className="card">
              <div className="card-title">📊 Wait Time Comparison</div>
              <div className="chart-container">
                <Bar
                  data={simChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        title: { display: true, text: 'Minutes' },
                        beginAtZero: true
                      }
                    }
                  }}
                />
              </div>
            </div>
            <div className="card">
              <div className="card-title">✅ Results Summary</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  marginTop: 8
                }}
              >
                <div
                  style={{
                    padding: 16,
                    background: '#fef2f2',
                    borderRadius: 10,
                    borderLeft: '4px solid #ef4444'
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#991b1b',
                      marginBottom: 4
                    }}
                  >
                    FIFO Algorithm
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444' }}>
                    {fifoAvg.toFixed(1)} min avg wait
                  </div>
                  <div style={{ fontSize: 13, color: '#991b1b', marginTop: 4 }}>
                    Max: {(result.fifo?.maxWaitTime ?? 0).toFixed(1)} min
                  </div>
                </div>
                <div
                  style={{
                    padding: 16,
                    background: '#d1fae5',
                    borderRadius: 10,
                    borderLeft: '4px solid #10b981'
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#065f46',
                      marginBottom: 4
                    }}
                  >
                    Optimized Algorithm
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981' }}>
                    {optAvg.toFixed(1)} min avg wait
                  </div>
                  <div style={{ fontSize: 13, color: '#065f46', marginTop: 4 }}>
                    Max: {(result.optimized?.maxWaitTime ?? 0).toFixed(1)} min
                  </div>
                </div>
                {parseFloat(improvement) > 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: '#eff6ff',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--primary)'
                    }}
                  >
                    🚀 {improvement}% improvement in wait time!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">📋 Detailed Comparison</div>
            <div className="table-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ color: '#ef4444' }}>FIFO</th>
                    <th style={{ color: '#10b981' }}>Optimized</th>
                    <th>Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{m.metric}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>{m.fifo}</td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>{m.optimized}</td>
                      <td>
                        <span
                          className={
                            m.positive
                              ? 'improvement-positive'
                              : 'improvement-negative'
                          }
                        >
                          {m.positive ? '↑' : '↓'} {m.improvement}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main AdminDashboard ───────────────────────────────────────────────────────
export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [globalQueues, setGlobalQueues] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [qRes, dRes, aRes] = await Promise.allSettled([
        adminApi.getGlobalQueues(),
        adminApi.getAllDoctors(),
        adminApi.getAnalytics()
      ]);
      if (qRes.status === 'fulfilled')
        setGlobalQueues(qRes.value.data.queues || qRes.value.data || []);
      if (dRes.status === 'fulfilled')
        setAllDoctors(dRes.value.data.doctors || dRes.value.data || []);
      if (aRes.status === 'fulfilled')
        setAnalytics(aRes.value.data.analytics || aRes.value.data || null);
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('queue:updated', fetchAll);
    socket.on('admin:alert', fetchAll);
    return () => {
      socket.off('queue:updated', fetchAll);
      socket.off('admin:alert', fetchAll);
    };
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-full">
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Loading admin dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: '📊 Overview' },
    { key: 'queue', label: '📋 Queue Monitor' },
    { key: 'analytics', label: '📈 Analytics' },
    { key: 'simulation', label: '🔬 Simulation' }
  ];

  return (
    <div className="page-wrapper">
      <Navbar />
      <div
        style={{
          paddingTop: 'var(--navbar-height)',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '80px 20px 60px'
        }}
      >
        <div className="page-header">
          <h1 className="page-title">⚙️ Admin Dashboard</h1>
          <p className="page-subtitle">Monitor and manage the entire telemedicine system.</p>
        </div>

        {error && (
          <div className="alert alert-warning">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab
            globalQueues={globalQueues}
            allDoctors={allDoctors}
            analytics={analytics}
          />
        )}
        {activeTab === 'queue' && <QueueMonitorTab globalQueues={globalQueues} />}
        {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
        {activeTab === 'simulation' && <SimulationTab />}
      </div>
      <NotificationBar userRole="admin" />
    </div>
  );
}

export default AdminDashboard;
