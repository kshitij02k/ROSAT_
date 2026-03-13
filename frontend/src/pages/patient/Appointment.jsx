import React, { useState, useEffect } from 'react';
import { patient as patientApi, doctor as doctorApi } from '../../services/api';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

const TIME_SLOTS = [];
(function buildSlots() {
  for (let h = 9; h < 17; h++) {
    const hh = String(h).padStart(2, '0');
    TIME_SLOTS.push(`${hh}:00`);
    TIME_SLOTS.push(`${hh}:30`);
  }
})();

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function getDayDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  return [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: tomorrow },
    { label: 'Day After Tomorrow', date: dayAfter }
  ];
}

export function Appointment() {
  const days = getDayDates();

  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [fetchingDoctors, setFetchingDoctors] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setFetchingDoctors(true);
    try {
      const res = await doctorApi.getDoctors({});
      setDoctors(res.data.doctors || []);
    } catch {
      setDoctors([]);
    } finally {
      setFetchingDoctors(false);
    }
  };

  // Simple pseudo-randomness to show some slots as "unavailable" based on slot + day
  const isSlotUnavailable = (slot, dayIdx) => {
    const seed = slot.replace(':', '') + dayIdx;
    return seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 7 === 0;
  };

  const handleSubmit = async () => {
    if (!selectedSlot) {
      setError('Please select a time slot.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        date: days[selectedDay].date.toISOString().split('T')[0],
        timeSlot: selectedSlot,
        doctorId: selectedDoctor !== 'auto' ? selectedDoctor : undefined
      };
      const res = await patientApi.bookAppointment(payload);
      setSuccess(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to book appointment.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div
          style={{
            paddingTop: 'var(--navbar-height)',
            maxWidth: 560,
            margin: '0 auto',
            padding: '80px 20px 60px'
          }}
        >
          <div className="success-banner">
            <div className="success-icon">📅</div>
            <div className="success-title">Appointment Booked!</div>
            <div className="success-subtitle">
              {formatDate(days[selectedDay].date)} at {selectedSlot}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Appointment Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex justify-between">
                <span className="text-muted">Date</span>
                <span className="fw-bold">{formatDate(days[selectedDay].date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Time</span>
                <span className="fw-bold">{selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Doctor</span>
                <span className="fw-bold">
                  {selectedDoctor === 'auto'
                    ? '🤖 Auto-Assigned'
                    : `Dr. ${doctors.find((d) => (d._id || d.id) === selectedDoctor)?.name || 'TBD'}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Confirmation ID</span>
                <span className="fw-bold">{success.appointmentId || success._id || '—'}</span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => setSuccess(null)}
          >
            Book Another
          </button>
        </div>
        <NotificationBar userRole="patient" />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div
        style={{
          paddingTop: 'var(--navbar-height)',
          maxWidth: 680,
          margin: '0 auto',
          padding: '80px 20px 60px'
        }}
      >
        <div className="page-header">
          <h1 className="page-title">📅 Book Appointment</h1>
          <p className="page-subtitle">Schedule a future telemedicine consultation.</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        {/* Day selector */}
        <div className="card">
          <div className="card-title">Select Day</div>
          <div className="day-selector">
            {days.map(({ label, date }, idx) => (
              <div
                key={label}
                className={`day-btn ${selectedDay === idx ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedDay(idx);
                  setSelectedSlot('');
                }}
              >
                <div className="day-btn-name">{label}</div>
                <div className="day-btn-date">{formatDate(date)}</div>
              </div>
            ))}
          </div>

          <div className="card-title" style={{ marginTop: 8 }}>Select Time Slot</div>
          <div className="slot-grid">
            {TIME_SLOTS.map((slot) => {
              const unavailable = isSlotUnavailable(slot, selectedDay);
              return (
                <button
                  key={slot}
                  className={`slot-btn ${unavailable ? 'unavailable' : ''} ${selectedSlot === slot && !unavailable ? 'selected' : ''}`}
                  onClick={() => !unavailable && setSelectedSlot(slot)}
                  disabled={unavailable}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {selectedSlot && (
            <div className="alert alert-success" style={{ marginTop: 12 }}>
              <span>✅</span>
              <span>
                Selected: <strong>{selectedSlot}</strong> on{' '}
                <strong>{formatDate(days[selectedDay].date)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Doctor selection */}
        <div className="card">
          <div className="card-title">Select Doctor</div>
          <div
            className={`doctor-card ${selectedDoctor === 'auto' ? 'selected' : ''}`}
            onClick={() => setSelectedDoctor('auto')}
          >
            <div className="doctor-avatar">🤖</div>
            <div className="doctor-info">
              <div className="doctor-name">Auto-Assign</div>
              <div className="doctor-spec">Best available doctor will be assigned</div>
            </div>
            {selectedDoctor === 'auto' && (
              <span className="badge badge-success">Selected</span>
            )}
          </div>

          {fetchingDoctors ? (
            <div className="loading-spinner" style={{ padding: '16px 0' }}>
              <div className="spinner" />
            </div>
          ) : (
            doctors.map((doc) => (
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span
                    className={`badge ${doc.isOnline ? 'badge-success' : 'badge-secondary'}`}
                  >
                    {doc.isOnline ? '● Online' : '● Offline'}
                  </span>
                  <span className="text-sm text-muted">Queue: {doc.queueLength ?? 0}</span>
                </div>
                {selectedDoctor === (doc._id || doc.id) && (
                  <span className="badge badge-success">Selected</span>
                )}
              </div>
            ))
          )}
        </div>

        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={handleSubmit}
          disabled={loading || !selectedSlot}
        >
          {loading ? (
            <>
              <div className="spinner spinner-sm" /> Booking…
            </>
          ) : (
            '📅 Confirm Appointment'
          )}
        </button>
      </div>
      <NotificationBar userRole="patient" />
    </div>
  );
}

export default Appointment;
