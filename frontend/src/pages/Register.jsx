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

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    specialization: '',
    experience: '',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xl">
        <div className="text-5xl text-center mb-4">🏥</div>
        <h1 className="text-2xl font-bold text-gray-900 text-center">Create Account</h1>
        <p className="text-gray-500 text-center mb-6">Join TeleQueue today</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-4">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Role selector */}
          <div className="mb-4">
            <label className={labelClass}>I am a</label>
            <div className="grid grid-cols-2 gap-3">
              {['patient', 'doctor'].map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer text-center font-semibold text-sm transition ${
                    form.role === r
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={form.role === r}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {r === 'patient' ? '🧑‍⚕️ Patient' : '👨‍⚕️ Doctor'}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className={labelClass}>Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                className={inputClass}
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                className={inputClass}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="password" className={labelClass}>Password * (min 6 chars)</label>
            <input
              id="password"
              name="password"
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {form.role === 'doctor' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="specialization" className={labelClass}>Specialization *</label>
                <select
                  id="specialization"
                  name="specialization"
                  className={inputClass}
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
              <div>
                <label htmlFor="experience" className={labelClass}>Experience (years)</label>
                <input
                  id="experience"
                  name="experience"
                  type="number"
                  className={inputClass}
                  placeholder="e.g. 5"
                  min="0"
                  max="60"
                  value={form.experience}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          {form.role === 'patient' && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="age" className={labelClass}>Age</label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  className={inputClass}
                  placeholder="e.g. 35"
                  min="1"
                  max="120"
                  value={form.age}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="gender" className={labelClass}>Gender</label>
                <select
                  id="gender"
                  name="gender"
                  className={inputClass}
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
            className="mt-2 w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating account…
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
