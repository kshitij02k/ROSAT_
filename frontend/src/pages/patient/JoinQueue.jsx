import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patient as patientApi, doctor as doctorApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

const EMERGENCY_LABELS = {
  1: 'Mild',
  2: 'Moderate',
  3: 'Significant',
  4: 'Severe',
  5: 'Critical'
};

const STEPS = ['Patient Info', 'Medical Details', 'Doctor Selection', 'Confirm'];

function EmergencyWarningModal({ level, onConfirm, onChange }) {
  return (
    <div className="modal-overlay">
      <div className="modal emergency-modal">
        <div className="modal-title">⚠️ High Emergency Warning</div>
        <div className="modal-body">
          You selected <strong>Level {level} – {EMERGENCY_LABELS[level]}</strong>.{' '}
          Selecting a high emergency level is reserved for <strong>genuinely severe cases</strong>.
          Misuse may result in a <strong>fine or queue penalty</strong>.
          Please confirm only if your condition truly warrants urgent attention.
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onChange}>
            ← Change Level
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            I Understand – Proceed
          </button>
        </div>
      </div>
    </div>
  );
}

export function JoinQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Step 1 – Patient Info
  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    visitType: 'Checkup',
    previousVisitCount: ''
  });

  // Step 2 – Medical Details
  const [medical, setMedical] = useState({
    symptoms: '',
    emergencyLevel: 1,
    consultationMode: 'video'
  });
  const [showWarning, setShowWarning] = useState(false);
  const [pendingLevel, setPendingLevel] = useState(null);

  // Step 3 – Doctor
  const [mlSpec, setMlSpec] = useState('');
  const [mlLoading, setMlLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('auto');

  // ─── Step navigation ───────────────────────────────────────────────────────
  const nextStep = () => {
    setError('');
    if (step === 0) {
      if (!patientInfo.name || !patientInfo.age || !patientInfo.gender) {
        setError('Please fill in all patient information fields.');
        return;
      }
      if (patientInfo.visitType === 'Follow-up' && !patientInfo.previousVisitCount) {
        setError('Please enter previous visit count for Follow-up.');
        return;
      }
    }
    if (step === 1) {
      if (!medical.symptoms.trim()) {
        setError('Please describe your symptoms.');
        return;
      }
    }
    if (step === 1) {
      // Fetch ML prediction when advancing to step 2
      fetchMlPrediction();
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError('');
    setStep((s) => s - 1);
  };

  // ─── ML Prediction ────────────────────────────────────────────────────────
  const fetchMlPrediction = async () => {
    setMlLoading(true);
    setMlSpec('');
    try {
      const res = await doctorApi.getDoctors({ symptoms: medical.symptoms });
      setMlSpec(res.data.predictedSpecialization || res.data.specialization || 'General Physician');
      const activeDocs = (res.data.doctors || []).filter((d) => d.isOnline);
      setDoctors(activeDocs);
    } catch {
      setMlSpec('General Physician');
      setDoctors([]);
    } finally {
      setMlLoading(false);
    }
  };

  // ─── Emergency level selection ────────────────────────────────────────────
  const handleEmergencySelect = (level) => {
    if (level >= 4) {
      setPendingLevel(level);
      setShowWarning(true);
    } else {
      setMedical((m) => ({ ...m, emergencyLevel: level }));
    }
  };

  const confirmEmergency = () => {
    setMedical((m) => ({ ...m, emergencyLevel: pendingLevel }));
    setShowWarning(false);
    setPendingLevel(null);
  };

  const cancelEmergency = () => {
    setShowWarning(false);
    setPendingLevel(null);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: patientInfo.name,
        age: Number(patientInfo.age),
        gender: patientInfo.gender,
        visitType: patientInfo.visitType,
        previousVisitCount: patientInfo.visitType === 'Follow-up'
          ? Number(patientInfo.previousVisitCount)
          : 0,
        symptoms: medical.symptoms,
        emergencyLevel: medical.emergencyLevel,
        consultationMode: medical.consultationMode,
        doctorId: selectedDoctor !== 'auto' ? selectedDoctor : undefined,
        predictedSpecialization: mlSpec
      };
      const res = await patientApi.joinQueue(payload);
      setSuccess(res.data);
      setStep(4); // success screen
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to join queue. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderStepper = () => (
    <div className="stepper">
      {STEPS.map((label, idx) => (
        <div
          key={label}
          className={`step ${idx < step ? 'completed' : ''} ${idx === step ? 'active' : ''}`}
        >
          <div className="step-circle">
            {idx < step ? '✓' : idx + 1}
          </div>
          <span className="step-label">{label}</span>
        </div>
      ))}
    </div>
  );

  const renderStep0 = () => (
    <div>
      <h2 className="card-title">👤 Patient Information</h2>
      <div className="form-row">
        <div className="form-group">
          <label>Full Name *</label>
          <input
            className="form-control"
            value={patientInfo.name}
            onChange={(e) => setPatientInfo((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your full name"
          />
        </div>
        <div className="form-group">
          <label>Age *</label>
          <input
            className="form-control"
            type="number"
            min="1"
            max="120"
            value={patientInfo.age}
            onChange={(e) => setPatientInfo((p) => ({ ...p, age: e.target.value }))}
            placeholder="e.g. 35"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Gender *</label>
          <select
            className="form-control"
            value={patientInfo.gender}
            onChange={(e) => setPatientInfo((p) => ({ ...p, gender: e.target.value }))}
          >
            <option value="">Select gender</option>
            {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Visit Type *</label>
          <select
            className="form-control"
            value={patientInfo.visitType}
            onChange={(e) => setPatientInfo((p) => ({ ...p, visitType: e.target.value }))}
          >
            <option value="Checkup">Checkup</option>
            <option value="Follow-up">Follow-up</option>
          </select>
        </div>
      </div>
      {patientInfo.visitType === 'Follow-up' && (
        <div className="form-group">
          <label>Previous Visit Count *</label>
          <input
            className="form-control"
            type="number"
            min="1"
            value={patientInfo.previousVisitCount}
            onChange={(e) =>
              setPatientInfo((p) => ({ ...p, previousVisitCount: e.target.value }))
            }
            placeholder="Number of previous visits"
          />
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 className="card-title">🩺 Medical Details</h2>
      <div className="form-group">
        <label>Symptoms / Chief Complaint *</label>
        <textarea
          className="form-control"
          rows={4}
          value={medical.symptoms}
          onChange={(e) => setMedical((m) => ({ ...m, symptoms: e.target.value }))}
          placeholder="Describe your symptoms in detail…"
        />
      </div>

      <div className="form-group">
        <label>Emergency Level *</label>
        <div className="emergency-levels">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              className={`emergency-btn ${medical.emergencyLevel === level ? 'selected' : ''}`}
              data-level={level}
              onClick={() => handleEmergencySelect(level)}
            >
              <div style={{ fontSize: 18 }}>{level}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>{EMERGENCY_LABELS[level]}</div>
            </button>
          ))}
        </div>
        <div className="emergency-level-desc">
          Selected: <strong>Level {medical.emergencyLevel} – {EMERGENCY_LABELS[medical.emergencyLevel]}</strong>
        </div>
      </div>

      <div className="form-group">
        <label>Consultation Mode *</label>
        <div className="mode-cards">
          <div
            className={`mode-card ${medical.consultationMode === 'video' ? 'selected' : ''}`}
            onClick={() => setMedical((m) => ({ ...m, consultationMode: 'video' }))}
          >
            <div className="mode-card-icon">📹</div>
            <div className="mode-card-title">Video Call</div>
            <div className="mode-card-desc">Face-to-face consultation</div>
          </div>
          <div
            className={`mode-card ${medical.consultationMode === 'chat' ? 'selected' : ''}`}
            onClick={() => setMedical((m) => ({ ...m, consultationMode: 'chat' }))}
          >
            <div className="mode-card-icon">💬</div>
            <div className="mode-card-title">Chat</div>
            <div className="mode-card-desc">Text-based consultation</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="card-title">👨‍⚕️ Doctor Selection</h2>

      {mlLoading ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <span>Analyzing symptoms with ML…</span>
        </div>
      ) : (
        <>
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <span>🤖</span>
            <span>
              <strong>ML Recommendation:</strong> Based on your symptoms, we suggest a{' '}
              <strong>{mlSpec}</strong>.
            </span>
          </div>

          <div className="form-group">
            <label>Assignment Method</label>
            <div
              className={`doctor-card ${selectedDoctor === 'auto' ? 'selected' : ''}`}
              onClick={() => setSelectedDoctor('auto')}
            >
              <div className="doctor-avatar">🤖</div>
              <div className="doctor-info">
                <div className="doctor-name">Auto-Assign</div>
                <div className="doctor-spec">Best available {mlSpec} doctor</div>
              </div>
              {selectedDoctor === 'auto' && <span className="badge badge-success">Selected</span>}
            </div>
          </div>

          {doctors.length > 0 && (
            <div className="form-group">
              <label>Or choose a specific doctor</label>
              {doctors.map((doc) => (
                <div
                  key={doc._id || doc.id}
                  className={`doctor-card ${selectedDoctor === (doc._id || doc.id) ? 'selected' : ''}`}
                  onClick={() => setSelectedDoctor(doc._id || doc.id)}
                >
                  <div className="doctor-avatar">
                    {doc.name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div className="doctor-info">
                    <div className="doctor-name">Dr. {doc.name}</div>
                    <div className="doctor-spec">{doc.specialization}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>
                    Queue: {doc.queueLength ?? 0}
                  </div>
                  {selectedDoctor === (doc._id || doc.id) && (
                    <span className="badge badge-success">Selected</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {doctors.length === 0 && (
            <div className="alert alert-warning">
              <span>ℹ️</span>
              <span>No active doctors available. Auto-assign will find the best option.</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="card-title">✅ Confirm Queue Entry</h2>
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 20,
          marginBottom: 20
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          <div>
            <div className="text-muted text-sm">Patient</div>
            <div className="fw-bold">{patientInfo.name}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Age / Gender</div>
            <div className="fw-bold">{patientInfo.age} / {patientInfo.gender}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Visit Type</div>
            <div className="fw-bold">{patientInfo.visitType}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Consultation Mode</div>
            <div className="fw-bold">{medical.consultationMode === 'video' ? '📹 Video' : '💬 Chat'}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="text-muted text-sm">Symptoms</div>
            <div className="fw-bold">{medical.symptoms}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Emergency Level</div>
            <span
              className={`badge ${medical.emergencyLevel <= 2 ? 'badge-success' : medical.emergencyLevel === 3 ? 'badge-warning' : 'badge-danger'}`}
            >
              Level {medical.emergencyLevel} – {EMERGENCY_LABELS[medical.emergencyLevel]}
            </span>
          </div>
          <div>
            <div className="text-muted text-sm">Specialization</div>
            <div className="fw-bold">{mlSpec || 'Auto-detect'}</div>
          </div>
          <div>
            <div className="text-muted text-sm">Doctor</div>
            <div className="fw-bold">
              {selectedDoctor === 'auto'
                ? '🤖 Auto-Assign'
                : doctors.find((d) => (d._id || d.id) === selectedDoctor)?.name
                  ? `Dr. ${doctors.find((d) => (d._id || d.id) === selectedDoctor)?.name}`
                  : 'Selected'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div>
      <div className="success-banner">
        <div className="success-icon">🎉</div>
        <div className="success-title">You're in the Queue!</div>
        <div className="success-subtitle">Your request has been submitted successfully.</div>
      </div>
      <div className="queue-status-card">
        <div className="queue-position">#{success?.position ?? '—'}</div>
        <div className="queue-position-label">Your position in queue</div>
        <div className="queue-info-grid">
          <div className="queue-info-item">
            <div className="queue-info-item-value">{success?.patientsAhead ?? 0}</div>
            <div className="queue-info-item-label">Patients Ahead</div>
          </div>
          <div className="queue-info-item">
            <div className="queue-info-item-value">{success?.estimatedWait ?? '—'} min</div>
            <div className="queue-info-item-label">Est. Wait Time</div>
          </div>
          <div className="queue-info-item">
            <div className="queue-info-item-value">
              {success?.doctorName ? `Dr. ${success.doctorName}` : '—'}
            </div>
            <div className="queue-info-item-label">Assigned Doctor</div>
          </div>
        </div>
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() => navigate('/patient/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="page-wrapper">
      <Navbar />
      <div style={{ paddingTop: 'var(--navbar-height)', maxWidth: 660, margin: '0 auto', padding: '80px 20px 60px' }}>
        <div className="page-header">
          <h1 className="page-title">📋 Join Live Queue</h1>
          <p className="page-subtitle">Fill in your details to get in the virtual queue.</p>
        </div>

        <div className="card">
          {step < 4 && renderStepper()}

          {error && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderSuccess()}

          {step < 4 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 24,
                gap: 12
              }}
            >
              {step > 0 ? (
                <button className="btn btn-outline" onClick={prevStep}>
                  ← Back
                </button>
              ) : (
                <span />
              )}

              {step < 3 ? (
                <button
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={mlLoading}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner spinner-sm" />
                      Submitting…
                    </>
                  ) : (
                    '✅ Confirm & Join Queue'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showWarning && (
        <EmergencyWarningModal
          level={pendingLevel}
          onConfirm={confirmEmergency}
          onChange={cancelEmergency}
        />
      )}

      <NotificationBar userRole="patient" />
    </div>
  );
}

export default JoinQueue;
