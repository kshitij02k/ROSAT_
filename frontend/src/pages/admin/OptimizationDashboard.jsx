import React, { useState } from 'react';
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

const OptimizationDashboard = () => {
  const [simParams, setSimParams] = useState({
    numPatients: 30,
    numDoctors: 3,
    emergencyRate: 0.3,
    avgConsultDuration: 10
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setSimParams({ ...simParams, [e.target.name]: val });
  };

  const runSimulation = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.runSimulation(simParams);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Optimization Dashboard</h1>
          <p>Compare FIFO vs Priority Queue performance</p>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="card mb-4">
        <div className="card-header">
          <h3>⚙️ Simulation Parameters</h3>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="simulation-form">
            <div className="form-group">
              <label className="form-label">Number of Patients</label>
              <input
                type="number"
                name="numPatients"
                className="form-control"
                value={simParams.numPatients}
                onChange={handleChange}
                min="5"
                max="200"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Number of Doctors</label>
              <input
                type="number"
                name="numDoctors"
                className="form-control"
                value={simParams.numDoctors}
                onChange={handleChange}
                min="1"
                max="20"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Emergency Rate (0.0 - 1.0)</label>
              <input
                type="number"
                name="emergencyRate"
                className="form-control"
                value={simParams.emergencyRate}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.05"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Avg Consultation Duration (min)</label>
              <input
                type="number"
                name="avgConsultDuration"
                className="form-control"
                value={simParams.avgConsultDuration}
                onChange={handleChange}
                min="5"
                max="60"
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={runSimulation}
            disabled={loading}
          >
            {loading ? '⏳ Running Simulation...' : '▶️ Run Simulation'}
          </button>
        </div>
      </div>

      {result && (
        <>
          {/* Comparison Cards */}
          <div className="comparison-grid mb-4">
            <div className="comparison-card">
              <h3>📋 Baseline Queue (FIFO)</h3>
              <div className="comparison-metric">
                <span>Average Wait Time</span>
                <span className="metric-value">{result.fifo.metrics.avgWaitTime} min</span>
              </div>
              <div className="comparison-metric">
                <span>Maximum Wait Time</span>
                <span className="metric-value">{result.fifo.metrics.maxWaitTime} min</span>
              </div>
              <div className="comparison-metric">
                <span>Patient Throughput</span>
                <span className="metric-value">{result.fifo.metrics.throughput}</span>
              </div>
              <div className="comparison-metric">
                <span>Queue Efficiency</span>
                <span className="metric-value">Baseline</span>
              </div>
            </div>

            <div className="comparison-card optimized">
              <h3>⚡ Optimized Queue (Priority)</h3>
              <div className="comparison-metric">
                <span>Average Wait Time</span>
                <div>
                  <span className="metric-value">{result.optimized.metrics.avgWaitTime} min</span>
                  {result.fifo.metrics.avgWaitTime > 0 && (
                    <span className="metric-improvement" style={{ marginLeft: 8 }}>
                      ↓ {Math.round(((result.fifo.metrics.avgWaitTime - result.optimized.metrics.avgWaitTime) / result.fifo.metrics.avgWaitTime) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="comparison-metric">
                <span>Maximum Wait Time</span>
                <div>
                  <span className="metric-value">{result.optimized.metrics.maxWaitTime} min</span>
                </div>
              </div>
              <div className="comparison-metric">
                <span>Patient Throughput</span>
                <span className="metric-value">{result.optimized.metrics.throughput}</span>
              </div>
              <div className="comparison-metric">
                <span>Queue Efficiency</span>
                <span className="metric-improvement">Improved ✓</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid mb-4">
            <div className="card">
              <div className="card-header">
                <h3>📊 Wait Time Comparison (Bar)</h3>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <Bar
                    data={{
                      labels: ['Avg Wait Time', 'Max Wait Time', 'Throughput'],
                      datasets: [
                        {
                          label: 'FIFO',
                          data: [
                            result.fifo.metrics.avgWaitTime,
                            result.fifo.metrics.maxWaitTime,
                            result.fifo.metrics.throughput
                          ],
                          backgroundColor: '#94a3b8'
                        },
                        {
                          label: 'Optimized',
                          data: [
                            result.optimized.metrics.avgWaitTime,
                            result.optimized.metrics.maxWaitTime,
                            result.optimized.metrics.throughput
                          ],
                          backgroundColor: '#2563eb'
                        }
                      ]
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>📈 Queue Length Over Time (Line)</h3>
              </div>
              <div className="card-body">
                <div className="chart-container">
                  <Line
                    data={{
                      labels: result.queueLengthOverTime.map(d => `T${d.time}`),
                      datasets: [
                        {
                          label: 'FIFO Queue',
                          data: result.queueLengthOverTime.map(d => d.fifo),
                          borderColor: '#94a3b8',
                          backgroundColor: 'rgba(148,163,184,0.1)',
                          tension: 0.3
                        },
                        {
                          label: 'Optimized Queue',
                          data: result.queueLengthOverTime.map(d => d.optimized),
                          borderColor: '#2563eb',
                          backgroundColor: 'rgba(37,99,235,0.1)',
                          tension: 0.3
                        }
                      ]
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">
              <h3>🥧 Priority Distribution (Pie)</h3>
            </div>
            <div className="card-body">
              <div style={{ maxWidth: 400, margin: '0 auto' }}>
                <div className="chart-container">
                  <Pie
                    data={{
                      labels: result.priorityDistribution.map(d => d.level),
                      datasets: [{
                        data: result.priorityDistribution.map(d => d.count),
                        backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981']
                      }]
                    }}
                    options={{ ...chartOptions, plugins: { legend: { position: 'right' } } }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>📋 Simulation Results ({result.numPatients} patients)</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Emergency</th>
                      <th>Duration</th>
                      <th>FIFO Wait</th>
                      <th>Optimized Wait</th>
                      <th>Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.optimized.patients.slice(0, 15).map((p, i) => {
                      const fifoP = result.fifo.patients.find(fp => fp.id === p.id);
                      const improvement = fifoP ? fifoP.waitTime - p.waitTime : 0;
                      return (
                        <tr key={i}>
                          <td>{p.name}</td>
                          <td>
                            <span className={`emergency-badge emergency-${p.emergencyLevel}`}>
                              {p.emergencyLevel}
                            </span>
                          </td>
                          <td>{p.duration} min</td>
                          <td>{fifoP?.waitTime || 0} min</td>
                          <td>{p.waitTime} min</td>
                          <td>
                            <span className={improvement > 0 ? 'text-success' : improvement < 0 ? 'text-danger' : 'text-muted'}>
                              {improvement > 0 ? '↓' : improvement < 0 ? '↑' : '='} {Math.abs(improvement)} min
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h3>Run a Simulation</h3>
            <p>Configure the parameters above and click Run Simulation to compare FIFO vs Priority Queue performance</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationDashboard;
