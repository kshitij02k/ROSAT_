import React, { useState, useEffect } from 'react';
import { patientAPI } from '../../services/api';

const PatientHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await patientAPI.getHistory();
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Consultation History</h1>
          <p>Your past telemedicine consultations</p>
        </div>
      </div>

      <div className="card">
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No History Yet</h3>
            <p>Your consultation history will appear here after your first appointment</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Doctor</th>
                  <th>Symptoms</th>
                  <th>Emergency</th>
                  <th>Predicted</th>
                  <th>Actual Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c._id}>
                    <td>{new Date(c.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}</td>
                    <td>{c.doctorName || (c.doctorId?.name) || 'N/A'}</td>
                    <td>{c.symptoms || 'N/A'}</td>
                    <td>
                      <span className={`emergency-badge emergency-${c.emergencyLevel}`}>
                        {c.emergencyLevel}
                      </span>
                    </td>
                    <td>{c.predictedDuration} min</td>
                    <td>{c.actualDuration || '—'} {c.actualDuration ? 'min' : ''}</td>
                    <td>
                      <span className={`badge ${c.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                        {c.status}
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
  );
};

export default PatientHistory;
