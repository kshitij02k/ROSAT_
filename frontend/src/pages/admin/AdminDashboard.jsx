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
const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const badgeBase = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

function statusBadgeClass(status) {
  if (status === 'waiting') return `${badgeBase} bg-amber-100 text-amber-700`;
  if (status === 'in-progress') return `${badgeBase} bg-green-100 text-green-700`;
  return `${badgeBase} bg-gray-100 text-gray-600`;
}

function emergencyBadgeClass(level) {
  if (level <= 2) return `${badgeBase} bg-green-100 text-green-700`;
  if (level === 3) return `${badgeBase} bg-amber-100 text-amber-700`;
  return `${badgeBase} bg-red-100 text-red-700`;
}

function priorityBadgeClass(level) {
  if (level <= 2) return `${badgeBase} bg-green-100 text-green-700`;
  if (level === 3) return `${badgeBase} bg-amber-100 text-amber-700`;
  if (level === 4) return `${badgeBase} bg-orange-100 text-orange-700`;
  return `${badgeBase} bg-red-100 text-red-700`;
}

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: '👥', value: totalPatients, label: 'Patients Today' },
          { icon: '👨‍⚕️', value: activeDoctors, label: 'Active Doctors' },
          { icon: '⏱️', value: `${avgWait} min`, label: 'Avg Wait Time' },
          { icon: '🚨', value: emergencyCases, label: 'Emergency Cases (4+)' }
        ].map(({ icon, value, label }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="text-3xl">{icon}</div>
            <div>
              <div className="text-3xl font-black text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">👨‍⚕️ All Doctors</h2>
        {allDoctors.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">No doctors registered.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Specialization</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Queue Length</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Experience</th>
                </tr>
              </thead>
              <tbody>
                {allDoctors.map((doc, idx) => (
                  <tr key={doc._id || idx}>
                    <td className="px-4 py-3 border-t border-gray-100 font-semibold">Dr. {doc.name}</td>
                    <td className="px-4 py-3 border-t border-gray-100">{doc.specialization || '—'}</td>
                    <td className="px-4 py-3 border-t border-gray-100">
                      <span className={`${badgeBase} ${doc.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {doc.isOnline ? '🟢 Online' : '⚫ Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100">
                      <span className={`${badgeBase} bg-blue-100 text-blue-700`}>{doc.queueLength ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 border-t border-gray-100">
                      {doc.experience != null ? `${doc.experience} yrs` : '—'}
                    </td>
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">🌐 Live Global Queue</h2>
        <span className={`${badgeBase} bg-blue-100 text-blue-700`}>{globalQueues.length} entries</span>
      </div>

      {globalQueues.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-3xl mb-2">✅</div>
          <div className="font-semibold text-gray-700 mb-1">All Clear</div>
          <div className="text-sm">No active queue entries.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Specialization</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Emergency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Wait Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Priority Score</th>
              </tr>
            </thead>
            <tbody>
              {globalQueues.map((entry, idx) => (
                <tr
                  key={entry._id || idx}
                  className={
                    entry.emergencyLevel <= 2
                      ? 'bg-green-50'
                      : entry.emergencyLevel === 3
                      ? 'bg-amber-50'
                      : 'bg-red-50'
                  }
                >
                  <td className="px-4 py-3 border-t border-gray-100 font-semibold">
                    {entry.patientName || entry.name || '—'}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100">
                    {entry.doctorName ? `Dr. ${entry.doctorName}` : '—'}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100">
                    {entry.specialization || entry.doctorSpecialization || '—'}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100">
                    <span className={emergencyBadgeClass(entry.emergencyLevel)}>
                      {entry.emergencyLevel} – {EMERGENCY_LABELS[entry.emergencyLevel] || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100">
                    <span className={statusBadgeClass(entry.status)}>
                      {entry.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100">
                    {entry.waitTime != null ? `${entry.waitTime} min` : '—'}
                  </td>
                  <td className="px-4 py-3 border-t border-gray-100">
                    <span className={priorityBadgeClass(entry.emergencyLevel || 1)}>
                      {entry.priorityScore != null ? entry.priorityScore.toFixed(1) : '—'}
                    </span>
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
      <div className="flex items-center gap-3 justify-center py-12 text-gray-500">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: '⏱️', value: `${analytics.avgWaitTime?.toFixed(1) ?? '—'} min`, label: 'Avg Wait Time' },
          { icon: '📈', value: `${analytics.maxWaitTime?.toFixed(1) ?? '—'} min`, label: 'Max Wait Time' },
          { icon: '💤', value: `${analytics.doctorIdleTime?.toFixed(1) ?? '—'} min`, label: 'Doctor Idle Time' }
        ].map(({ icon, value, label }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="text-3xl">{icon}</div>
            <div>
              <div className="text-3xl font-black text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">⏱️ Avg Wait by Specialization</h2>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">📈 Consultations (Last 7 Days)</h2>
          <div className="h-64">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">🥧 Consultation Mode Distribution</h2>
          <div className="h-64">
            <Pie data={pieChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">⚡ FIFO vs Optimized</h2>
          <div className="h-64">
            <Bar data={comparisonData} options={{ ...chartOptions, indexAxis: 'x' }} />
          </div>
          <div className="text-center mt-3 text-sm text-gray-600">
            Optimization saves{' '}
            <strong>{fifoAvg > optimizedAvg ? improvement : 0}% wait time</strong>
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
          improvement:
            result.fifo?.maxWaitTime > 0
              ? `${(
                  ((result.fifo.maxWaitTime - result.optimized.maxWaitTime) /
                    result.fifo.maxWaitTime) *
                  100
                ).toFixed(1)}%`
              : '0%',
          positive: result.optimized?.maxWaitTime < result.fifo?.maxWaitTime
        },
        {
          metric: 'Emergency Response Time (min)',
          fifo: (result.fifo?.emergencyResponseTime ?? 0).toFixed(1),
          optimized: (result.optimized?.emergencyResponseTime ?? 0).toFixed(1),
          improvement:
            result.fifo?.emergencyResponseTime > 0
              ? `${(
                  ((result.fifo.emergencyResponseTime -
                    result.optimized.emergencyResponseTime) /
                    result.fifo.emergencyResponseTime) *
                  100
                ).toFixed(1)}%`
              : '0%',
          positive:
            result.optimized?.emergencyResponseTime <
            result.fifo?.emergencyResponseTime
        },
        {
          metric: 'Doctor Idle Time (min)',
          fifo: (result.fifo?.doctorIdleTime ?? 0).toFixed(1),
          optimized: (result.optimized?.doctorIdleTime ?? 0).toFixed(1),
          improvement:
            result.fifo?.doctorIdleTime > 0
              ? `${(
                  ((result.fifo.doctorIdleTime - result.optimized.doctorIdleTime) /
                    result.fifo.doctorIdleTime) *
                  100
                ).toFixed(1)}%`
              : '0%',
          positive:
            result.optimized?.doctorIdleTime < result.fifo?.doctorIdleTime
        }
      ]
    : [];

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">⚙️ Simulation Parameters</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-4">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Patient Count</label>
            <strong className="text-sm font-bold text-gray-900">{patientCount}</strong>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={patientCount}
            onChange={(e) => setPatientCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1</span><span>50</span><span>100</span>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">Emergency Rate (%)</label>
            <strong className="text-sm font-bold text-gray-900">{emergencyRate}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={emergencyRate}
            onChange={(e) => setEmergencyRate(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 mb-5">
          Simulating <strong>{patientCount} patients</strong> with{' '}
          <strong>{emergencyRate}% emergency rate</strong> (~
          {Math.round((patientCount * emergencyRate) / 100)} emergency cases)
        </div>

        <button
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition flex items-center gap-2 disabled:opacity-60"
          onClick={runSimulation}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Running Simulation…
            </>
          ) : (
            '▶️ Run Simulation'
          )}
        </button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">📊 Wait Time Comparison</h2>
              <div className="h-64">
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
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">✅ Results Summary</h2>
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-red-50 rounded-xl border-l-4 border-red-500">
                  <div className="text-xs font-bold text-red-800 mb-1">FIFO Algorithm</div>
                  <div className="text-2xl font-black text-red-500">{fifoAvg.toFixed(1)} min avg wait</div>
                  <div className="text-xs text-red-700 mt-1">Max: {(result.fifo?.maxWaitTime ?? 0).toFixed(1)} min</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
                  <div className="text-xs font-bold text-green-800 mb-1">Optimized Algorithm</div>
                  <div className="text-2xl font-black text-green-500">{optAvg.toFixed(1)} min avg wait</div>
                  <div className="text-xs text-green-700 mt-1">Max: {(result.optimized?.maxWaitTime ?? 0).toFixed(1)} min</div>
                </div>
                {parseFloat(improvement) > 0 && (
                  <div className="text-center p-3 bg-blue-50 rounded-xl text-sm font-bold text-primary">
                    🚀 {improvement}% improvement in wait time!
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">📋 Detailed Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase border border-gray-200">Metric</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-red-500 uppercase border border-gray-200">FIFO</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-green-500 uppercase border border-gray-200">Optimized</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase border border-gray-200">Improvement</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 border border-gray-200 font-semibold">{m.metric}</td>
                      <td className="px-4 py-3 border border-gray-200 font-bold text-red-500">{m.fifo}</td>
                      <td className="px-4 py-3 border border-gray-200 font-bold text-green-500">{m.optimized}</td>
                      <td className="px-4 py-3 border border-gray-200">
                        <span
                          className={`font-semibold ${
                            m.positive ? 'text-green-600' : 'text-red-500'
                          }`}
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
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar />
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-gray-500">Loading admin dashboard…</span>
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
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">⚙️ Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor and manage the entire telemedicine system.</p>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-6">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        <div className="flex border-b border-gray-200 mb-6 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-sm font-medium cursor-pointer transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab globalQueues={globalQueues} allDoctors={allDoctors} analytics={analytics} />
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
