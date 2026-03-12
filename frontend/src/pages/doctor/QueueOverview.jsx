import React, { useState, useEffect } from 'react';
import { doctorAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import QueueCard from '../../components/QueueCard';

const QueueOverview = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await doctorAPI.getQueue();
      setQueue(res.data);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const socket = getSocket();
    socket.on('queueUpdated', fetchQueue);
    socket.on('patientJoined', fetchQueue);
    return () => {
      socket.off('queueUpdated');
      socket.off('patientJoined');
    };
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Queue Overview</h1>
          <p>Patients waiting for consultation (sorted by priority)</p>
        </div>
        <span className="badge badge-primary" style={{ fontSize: 14, padding: '6px 16px' }}>
          {queue.length} patients
        </span>
      </div>

      {queue.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <h3>Queue is Empty</h3>
            <p>No patients are waiting for consultation</p>
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
                      <th>Position</th>
                      <th>Patient Name</th>
                      <th>Symptoms</th>
                      <th>Emergency Level</th>
                      <th>Priority Score</th>
                      <th>Predicted Duration</th>
                      <th>Est. Wait</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((entry, i) => {
                      const patient = entry.patientId || {};
                      return (
                        <tr key={entry._id}>
                          <td><strong>#{i + 1}</strong></td>
                          <td>{patient.name || 'N/A'}</td>
                          <td>{patient.symptoms || 'N/A'}</td>
                          <td>
                            <span className={`emergency-badge emergency-${entry.emergencyLevel}`}>
                              {entry.emergencyLevel}
                            </span>
                          </td>
                          <td>
                            <span className="font-bold text-primary">
                              {Math.round(entry.priorityScore || 0)}
                            </span>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {queue.map((entry, i) => (
              <QueueCard key={entry._id} entry={entry} position={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default QueueOverview;
