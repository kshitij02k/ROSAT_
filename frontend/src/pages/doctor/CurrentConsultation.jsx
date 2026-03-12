import React, { useState, useEffect, useRef } from 'react';
import { doctorAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const CurrentConsultation = () => {
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);

  const fetchData = async () => {
    try {
      const [queueRes, currentRes] = await Promise.all([
        doctorAPI.getQueue(),
        doctorAPI.getCurrentPatient()
      ]);
      setQueue(queueRes.data);
      setCurrentPatient(currentRes.data?.patient || null);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('queueUpdated', fetchData);
    return () => {
      socket.off('queueUpdated');
      stopTimer();
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setTimer(0);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStart = async (patient) => {
    try {
      const res = await doctorAPI.startConsultation({ patientId: patient._id || patient.patientId?._id });
      setConsultation(res.data.consultation);
      setCurrentPatient(patient.patientId || patient);
      startTimer();
      setMessage('Consultation started!');
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to start consultation');
    }
  };

  const handleEnd = async () => {
    if (!consultation) return;
    try {
      await doctorAPI.endConsultation({
        patientId: currentPatient?._id,
        consultationId: consultation._id
      });
      stopTimer();
      setConsultation(null);
      setCurrentPatient(null);
      setMessage('Consultation ended successfully!');
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to end consultation');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const predicted = currentPatient?.predictedDuration || 10;
  const timerMin = timer / 60;
  const exceeds = timerMin > predicted;
  const nextPatient = queue[0];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Current Consultation</h1>
      </div>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {currentPatient ? (
        <div className="card mb-4">
          <div className="card-header">
            <h3>🩺 Active Patient</h3>
            <span className="badge badge-success">In Progress</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <p className="text-xs text-muted">Patient</p>
                <p className="font-semibold">{currentPatient.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Age</p>
                <p className="font-semibold">{currentPatient.age} years</p>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <p className="text-xs text-muted">Symptoms</p>
                <p className="font-semibold">{currentPatient.symptoms}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Emergency Level</p>
                <span className={`emergency-badge emergency-${currentPatient.emergencyLevel}`}>
                  {currentPatient.emergencyLevel}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted">Predicted Duration</p>
                <p className="font-semibold">{predicted} min</p>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--gray-50)', border: 'none', marginBottom: 16 }}>
              <div className="card-body text-center">
                <div className={`timer ${exceeds ? 'text-danger' : 'text-primary'}`}>
                  {formatTime(timer)}
                </div>
                {exceeds && (
                  <p className="text-danger text-sm">
                    ⚠️ Exceeded by {Math.floor(timerMin - predicted)} min — Queue recalculating
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {!consultation && (
                <button className="btn btn-success" onClick={() => handleStart(currentPatient)}>
                  ▶️ Start Consultation
                </button>
              )}
              {consultation && (
                <button className="btn btn-danger" onClick={handleEnd}>
                  ⏹️ End Consultation
                </button>
              )}
            </div>
          </div>
        </div>
      ) : nextPatient ? (
        <div className="card mb-4">
          <div className="card-header">
            <h3>⏭️ Next Patient</h3>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <h4>{nextPatient.patientId?.name || 'Patient'}</h4>
              <p className="text-muted">{nextPatient.patientId?.symptoms}</p>
              <div className="flex gap-4 items-center" style={{ marginTop: 8 }}>
                <span className={`emergency-badge emergency-${nextPatient.emergencyLevel}`}>
                  Level {nextPatient.emergencyLevel}
                </span>
                <span className="text-sm text-muted">
                  Predicted: {nextPatient.predictedDuration} min
                </span>
              </div>
            </div>
            <button className="btn btn-success" onClick={() => handleStart(nextPatient)}>
              ▶️ Start Consultation
            </button>
          </div>
        </div>
      ) : (
        <div className="card mb-4">
          <div className="card-body empty-state">
            <div className="empty-icon">✨</div>
            <h3>No Patients</h3>
            <p>Your queue is empty. Patients will appear here when they join.</p>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>📋 Upcoming Queue ({queue.length})</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Patient</th>
                    <th>Symptoms</th>
                    <th>Emergency</th>
                    <th>Predicted</th>
                    <th>Wait</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((entry, i) => {
                    const p = entry.patientId || entry;
                    return (
                      <tr key={entry._id}>
                        <td>{i + 1}</td>
                        <td>{p.name || 'N/A'}</td>
                        <td>{p.symptoms || 'N/A'}</td>
                        <td><span className={`emergency-badge emergency-${entry.emergencyLevel}`}>{entry.emergencyLevel}</span></td>
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
      )}
    </div>
  );
};

export default CurrentConsultation;
