import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI } from '../../services/api';

const JoinQueue = () => {
  const [form, setForm] = useState({
    name: '',
    age: '',
    symptoms: '',
    emergencyLevel: '1',
    preferredDoctor: ''
  });
  const [doctorChoice, setDoctorChoice] = useState('auto'); // 'auto' | 'choose'
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await patientAPI.getAvailableDoctors();
        setDoctors(res.data);
      } catch {
        // non-critical: just leave dropdown empty
      }
    };
    fetchDoctors();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.symptoms) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        age: parseInt(form.age),
        symptoms: form.symptoms,
        emergencyLevel: parseInt(form.emergencyLevel)
      };
      if (form.preferredDoctor) payload.preferredDoctor = form.preferredDoctor;

      const res = await patientAPI.joinQueue(payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join queue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const emergencyDescriptions = {
    1: '😊 Minimal - Routine checkup, no urgency',
    2: '🔵 Low - Minor symptoms, can wait',
    3: '🟡 Medium - Moderate symptoms, needs attention',
    4: '🟠 High - Serious symptoms, priority needed',
    5: '🔴 Critical - Emergency, immediate attention required'
  };

  if (result) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 48 }}>✅</p>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>Successfully Joined Queue!</h2>
            <p className="text-muted mb-4">
              You have been added to the telemedicine queue.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ border: 'none', background: 'var(--gray-50)' }}>
                <div className="card-body text-center">
                  <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>
                    #{result.position}
                  </p>
                  <p className="text-xs text-muted">Queue Position</p>
                </div>
              </div>
              <div className="card" style={{ border: 'none', background: 'var(--gray-50)' }}>
                <div className="card-body text-center">
                  <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}>
                    {result.estimatedWaitTime} min
                  </p>
                  <p className="text-xs text-muted">Est. Wait</p>
                </div>
              </div>
              <div className="card" style={{ border: 'none', background: 'var(--gray-50)' }}>
                <div className="card-body text-center">
                  <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
                    {result.patient?.predictedDuration} min
                  </p>
                  <p className="text-xs text-muted">Predicted Duration</p>
                </div>
              </div>
            </div>
            {result.doctor && (
              <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: 16 }}>
                <strong>👨‍⚕️ Assigned Doctor:</strong> {result.doctor.name}<br />
                <strong>Specialization:</strong> {result.doctor.specialization}
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/patient/queue-status')}
              >
                View Queue Status
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { setResult(null); setDoctorChoice('auto'); setForm({ name: '', age: '', symptoms: '', emergencyLevel: '1', preferredDoctor: '' }); }}
              >
                Join Another Queue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Join Consultation Queue</h1>
          <p>Fill in your details to join the telemedicine queue</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Age *</label>
                <input
                  type="number"
                  name="age"
                  className="form-control"
                  placeholder="Your age"
                  value={form.age}
                  onChange={handleChange}
                  min="1"
                  max="120"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Symptoms / Chief Complaint *</label>
              <textarea
                name="symptoms"
                className="form-control"
                placeholder="Describe your symptoms in detail (e.g., fever with headache for 2 days, chest pain, eye pain...)"
                value={form.symptoms}
                onChange={handleChange}
                rows={4}
                required
              />
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Be specific for accurate doctor assignment and duration prediction
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Emergency Level *</label>
              <select
                name="emergencyLevel"
                className="form-control"
                value={form.emergencyLevel}
                onChange={handleChange}
              >
                <option value="1">1 - Minimal</option>
                <option value="2">2 - Low</option>
                <option value="3">3 - Medium</option>
                <option value="4">4 - High</option>
                <option value="5">5 - Critical</option>
              </select>
              <div className="alert alert-info" style={{ marginTop: 8, fontSize: 13 }}>
                {emergencyDescriptions[form.emergencyLevel]}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Doctor (Optional)</label>

              {/* Option 1 – Auto-assign */}
              <div
                onClick={() => { setDoctorChoice('auto'); setForm(f => ({ ...f, preferredDoctor: '' })); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  border: `2px solid ${doctorChoice === 'auto' ? 'var(--primary)' : 'var(--gray-200)'}`,
                  borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                  background: doctorChoice === 'auto' ? 'var(--primary-light, #eff6ff)' : 'var(--gray-50)'
                }}
              >
                <input
                  type="radio"
                  name="doctorChoice"
                  value="auto"
                  checked={doctorChoice === 'auto'}
                  onChange={() => { setDoctorChoice('auto'); setForm(f => ({ ...f, preferredDoctor: '' })); }}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>🤖 Auto-assign (Recommended)</p>
                  <p className="text-xs text-muted" style={{ margin: '2px 0 0' }}>
                    The system will assign the best available doctor based on your symptoms and emergency level.
                  </p>
                </div>
              </div>

              {/* Option 2 – Choose a specific doctor */}
              <div
                onClick={() => setDoctorChoice('choose')}
                style={{
                  border: `2px solid ${doctorChoice === 'choose' ? 'var(--primary)' : 'var(--gray-200)'}`,
                  borderRadius: 8, cursor: 'pointer',
                  background: doctorChoice === 'choose' ? 'var(--primary-light, #eff6ff)' : 'var(--gray-50)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px' }}>
                  <input
                    type="radio"
                    name="doctorChoice"
                    value="choose"
                    checked={doctorChoice === 'choose'}
                    onChange={() => setDoctorChoice('choose')}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>👨‍⚕️ Choose a specific doctor</p>
                    <p className="text-xs text-muted" style={{ margin: '2px 0 0' }}>
                      Select from the list of currently available doctors.
                    </p>
                  </div>
                </div>

                {/* Doctor list — shown only when 'choose' is selected */}
                {doctorChoice === 'choose' && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {doctors.length === 0 ? (
                      <p className="text-sm text-muted" style={{ margin: 0 }}>
                        No doctors are currently available. Use Auto-assign or try again later.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {doctors.map((doc) => (
                          <div
                            key={doc._id}
                            onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, preferredDoctor: doc._id })); }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                              border: `2px solid ${form.preferredDoctor === doc._id ? 'var(--success)' : 'var(--gray-200)'}`,
                              background: form.preferredDoctor === doc._id ? '#f0fdf4' : '#fff'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input
                                type="radio"
                                name="selectedDoctor"
                                checked={form.preferredDoctor === doc._id}
                                onChange={() => setForm(f => ({ ...f, preferredDoctor: doc._id }))}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Dr. {doc.name}</p>
                                <p className="text-xs text-muted" style={{ margin: 0 }}>{doc.specialization}</p>
                              </div>
                            </div>
                            <span
                              className={`badge ${doc.queueLength === 0 ? 'badge-success' : 'badge-warning'}`}
                              style={{ fontSize: 11 }}
                            >
                              {doc.queueLength === 0 ? '✅ Available' : `${doc.queueLength} in queue`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {doctorChoice === 'choose' && !form.preferredDoctor && (
                      <p className="text-xs text-muted" style={{ marginTop: 8, marginBottom: 0 }}>
                        Please select a doctor above, or switch to Auto-assign.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
            >
              {loading ? '⏳ Joining Queue...' : '➕ Join Queue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinQueue;
