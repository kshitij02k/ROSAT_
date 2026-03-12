import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import QueueCard from '../../components/QueueCard';

const QueueMonitor = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchQueue = async () => {
    try {
      const res = await adminAPI.getQueueMonitor();
      setQueue(res.data);
      setLastUpdated(new Date());
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const socket = getSocket();
    socket.on('queueUpdated', fetchQueue);
    socket.on('patientJoined', fetchQueue);
    socket.on('consultationStarted', fetchQueue);
    socket.on('consultationEnded', fetchQueue);

    const interval = setInterval(fetchQueue, 30000);

    return () => {
      socket.off('queueUpdated');
      socket.off('patientJoined');
      socket.off('consultationStarted');
      socket.off('consultationEnded');
      clearInterval(interval);
    };
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const criticalCount = queue.filter(e => e.emergencyLevel >= 4).length;
  const avgPriority = queue.length > 0
    ? Math.round(queue.reduce((sum, e) => sum + (e.priorityScore || 0), 0) / queue.length)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Live Queue Monitor</h1>
          <p>Real-time patient queue &bull; Updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="badge badge-success">● Live</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchQueue}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div className="stat-info">
            <h4>{queue.length}</h4>
            <p>Total in Queue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚨</div>
          <div className="stat-info">
            <h4>{criticalCount}</h4>
            <p>Critical Cases</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⚡</div>
          <div className="stat-info">
            <h4>{avgPriority}</h4>
            <p>Avg Priority Score</p>
          </div>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>Queue is Empty</h3>
            <p>No patients are currently waiting</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Symptoms</th>
                      <th>Emergency</th>
                      <th>Priority Score</th>
                      <th>Predicted</th>
                      <th>Est. Wait</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((entry, i) => {
                      const patient = entry.patientId || {};
                      const doctor = entry.doctorId || {};
                      return (
                        <tr key={entry._id} style={entry.emergencyLevel >= 4 ? { background: '#fff5f5' } : {}}>
                          <td><strong>#{i + 1}</strong></td>
                          <td>{patient.name || 'N/A'}</td>
                          <td>{doctor.name || 'Unassigned'}</td>
                          <td>{patient.symptoms || 'N/A'}</td>
                          <td>
                            <span className={`emergency-badge emergency-${entry.emergencyLevel}`}>
                              {entry.emergencyLevel}
                            </span>
                          </td>
                          <td className="font-bold text-primary">
                            {Math.round(entry.priorityScore || 0)}
                          </td>
                          <td>{entry.predictedDuration} min</td>
                          <td>{entry.estimatedWaitTime} min</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {queue.map((entry, i) => (
              <QueueCard key={entry._id} entry={entry} position={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default QueueMonitor;
