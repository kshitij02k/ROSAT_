import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SPECIALIZATIONS = [
  'Cardiologist',
  'Neurologist',
  'General Physician',
  'Orthopedist',
  'Dermatologist',
  'Pulmonologist',
  'Gastroenterologist',
  'Psychiatrist'
];

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    // doctor fields
    specialization: '',
    experience: '',
    // patient fields
    age: '',
    gender: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.role === 'doctor' && !form.specialization) {
      setError('Please select a specialization.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role
      };
      if (form.role === 'doctor') {
        payload.specialization = form.specialization;
        payload.experience = Number(form.experience) || 0;
      } else {
        payload.age = Number(form.age) || undefined;
        payload.gender = form.gender || undefined;
      }
      await register(payload);
      navigate('/login', {
        state: { message: 'Registration successful! Please log in.' }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">🏥</div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join TeleQueue today</p>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div className="form-group">
            <label>I am a</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['patient', 'doctor'].map((r) => (
                <label
                  key={r}
                  style={{
                    flex: 1,
                    border: `2px solid ${form.role === r ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '10px 16px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 14,
                    background: form.role === r ? '#eff6ff' : 'var(--card-bg)',
                    color: form.role === r ? 'var(--primary)' : 'var(--text)',
                    transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={form.role === r}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  {r === 'patient' ? '🧑‍⚕️ Patient' : '👨‍⚕️ Doctor'}
                </label>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-control"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password * (min 6 chars)</label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Doctor fields */}
          {form.role === 'doctor' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="specialization">Specialization *</label>
                <select
                  id="specialization"
                  name="specialization"
                  className="form-control"
                  value={form.specialization}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="experience">Experience (years)</label>
                <input
                  id="experience"
                  name="experience"
                  type="number"
                  className="form-control"
                  placeholder="e.g. 5"
                  min="0"
                  max="60"
                  value={form.experience}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {/* Patient fields */}
          {form.role === 'patient' && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="age">Age</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  className="form-control"
                  placeholder="e.g. 35"
                  min="1"
                  max="120"
                  value={form.age}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  className="form-control"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
