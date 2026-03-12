import React, { useState, useEffect } from 'react';
import { doctorAPI } from '../../services/api';

const DoctorHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await doctorAPI.getHistory();
        setHistory(res.data);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const avgDuration = history.length > 0
    ? Math.round(history.reduce((sum, c) => sum + (c.actualDuration || 0), 0) / history.length)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Consultation History</h1>
          <p>Your completed consultations</p>
        </div>
        <div className="flex gap-4">
          <div className="stat-card" style={{ padding: '12px 20px' }}>
            <div className="stat-icon blue">📋</div>
            <div className="stat-info">
              <h4>{history.length}</h4>
              <p>Total Consultations</p>
            </div>
          </div>
          <div className="stat-card" style={{ padding: '12px 20px' }}>
            <div className="stat-icon green">⏱️</div>
            <div className="stat-info">
              <h4>{avgDuration} min</h4>
              <p>Avg Duration</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No History Yet</h3>
            <p>Your completed consultations will appear here</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Symptoms</th>
                  <th>Emergency</th>
                  <th>Predicted</th>
                  <th>Actual</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => {
                  const accuracy = c.predictedDuration && c.actualDuration
                    ? Math.round((1 - Math.abs(c.actualDuration - c.predictedDuration) / c.predictedDuration) * 100)
                    : null;
                  return (
                    <tr key={c._id}>
                      <td>{new Date(c.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}</td>
                      <td>{c.patientName || 'N/A'}</td>
                      <td>{c.symptoms || 'N/A'}</td>
                      <td>
                        <span className={`emergency-badge emergency-${c.emergencyLevel}`}>
                          {c.emergencyLevel}
                        </span>
                      </td>
                      <td>{c.predictedDuration} min</td>
                      <td>{c.actualDuration || '—'} {c.actualDuration ? 'min' : ''}</td>
                      <td>
                        {accuracy !== null ? (
                          <span className={`badge ${accuracy >= 80 ? 'badge-success' : accuracy >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                            {accuracy}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorHistory;
