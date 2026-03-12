import React, { useState, useEffect, useRef } from 'react';
import { patientAPI } from '../../services/api';
import { getSocket } from '../../services/socket';

const ConsultationPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [isConsulting, setIsConsulting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await patientAPI.getQueueStatus();
        setStatus(res.data);
        if (res.data?.patient?.status === 'in-consultation') {
          setIsConsulting(true);
          startTimer();
        }
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    const socket = getSocket();
    socket.on('consultationStarted', () => {
      setIsConsulting(true);
      startTimer();
      fetchStatus();
    });
    socket.on('consultationEnded', () => {
      setIsConsulting(false);
      stopTimer();
    });

    return () => {
      socket.off('consultationStarted');
      socket.off('consultationEnded');
      stopTimer();
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const patient = status?.patient;
  const predictedDuration = patient?.predictedDuration || 10;
  const timerMinutes = timer / 60;
  const exceeds = timerMinutes > predictedDuration;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Consultation Room</h1>
      </div>

      {!patient ? (
        <div className="card">
          <div className="card-body text-center" style={{ padding: 40 }}>
            <p style={{ fontSize: 48 }}>🔍</p>
            <h3>No Active Consultation</h3>
            <p className="text-muted">You don't have an active consultation session.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-header">
              <h3>🩺 Patient Information</h3>
              <span className={`badge ${isConsulting ? 'badge-success' : 'badge-warning'}`}>
                {isConsulting ? 'In Progress' : 'Waiting'}
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <p className="text-xs text-muted">Patient Name</p>
                  <p className="font-semibold">{patient.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Age</p>
                  <p className="font-semibold">{patient.age} years</p>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <p className="text-xs text-muted">Symptoms</p>
                  <p className="font-semibold">{patient.symptoms}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Emergency Level</p>
                  <span className={`emergency-badge emergency-${patient.emergencyLevel}`}>
                    {patient.emergencyLevel}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted">Predicted Duration</p>
                  <p className="font-semibold">{predictedDuration} minutes</p>
                </div>
              </div>
            </div>
          </div>

          {isConsulting && (
            <div className="card mb-4">
              <div className="card-header">
                <h3>⏱️ Consultation Timer</h3>
              </div>
              <div className="card-body text-center">
                <div className={`timer ${exceeds ? 'text-danger' : 'text-primary'}`}>
                  {formatTime(timer)}
                </div>
                <p className="text-muted">
                  Predicted: {predictedDuration} min
                  {exceeds && (
                    <span className="text-danger" style={{ marginLeft: 8 }}>
                      ⚠️ Exceeded prediction by {Math.floor(timerMinutes - predictedDuration)} min
                    </span>
                  )}
                </p>
                {exceeds && (
                  <div className="alert alert-warning" style={{ marginTop: 12 }}>
                    The queue is being recalculated due to consultation exceeding predicted duration.
                  </div>
                )}
              </div>
            </div>
          )}

          {status?.assignedDoctor && (
            <div className="card">
              <div className="card-header">
                <h3>👨‍⚕️ Your Doctor</h3>
              </div>
              <div className="card-body">
                <h4>{status.assignedDoctor.name}</h4>
                <p className="text-muted">{status.assignedDoctor.specialization}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConsultationPage;
