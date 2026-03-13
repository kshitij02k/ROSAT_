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
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📅</div>
            <div className="text-2xl font-bold text-gray-900">Appointment Booked!</div>
            <div className="text-gray-500 text-sm mt-1">
              {formatDate(days[selectedDay].date)} at {selectedSlot}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Appointment Details</h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Date</span>
                <span className="font-semibold text-sm">{formatDate(days[selectedDay].date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Time</span>
                <span className="font-semibold text-sm">{selectedSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Doctor</span>
                <span className="font-semibold text-sm">
                  {selectedDoctor === 'auto'
                    ? '🤖 Auto-Assigned'
                    : `Dr. ${doctors.find((d) => (d._id || d.id) === selectedDoctor)?.name || 'TBD'}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Confirmation ID</span>
                <span className="font-semibold text-sm">{success.appointmentId || success._id || '—'}</span>
              </div>
            </div>
          </div>
          <button
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition"
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
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📅 Book Appointment</h1>
          <p className="text-gray-500 mt-1">Schedule a future telemedicine consultation.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-4">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        {/* Day selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Select Day</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {days.map(({ label, date }, idx) => (
              <div
                key={label}
                className={`p-4 rounded-xl border-2 cursor-pointer text-center transition ${
                  selectedDay === idx
                    ? 'border-primary bg-blue-50 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
                onClick={() => {
                  setSelectedDay(idx);
                  setSelectedSlot('');
                }}
              >
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-xs mt-1 opacity-75">{formatDate(date)}</div>
              </div>
            ))}
          </div>

          <h2 className="text-base font-semibold text-gray-900 mb-3">Select Time Slot</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {TIME_SLOTS.map((slot) => {
              const unavailable = isSlotUnavailable(slot, selectedDay);
              const isSelected = selectedSlot === slot && !unavailable;
              return (
                <button
                  key={slot}
                  className={`px-3 py-2 rounded-lg border text-sm text-center cursor-pointer transition ${
                    unavailable
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60 border-gray-200'
                      : isSelected
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 hover:border-primary hover:bg-blue-50 text-gray-700'
                  }`}
                  onClick={() => !unavailable && setSelectedSlot(slot)}
                  disabled={unavailable}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {selectedSlot && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg flex items-center gap-2 text-sm mt-3">
              <span>✅</span>
              <span>
                Selected: <strong>{selectedSlot}</strong> on{' '}
                <strong>{formatDate(days[selectedDay].date)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Doctor selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Select Doctor</h2>
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-primary transition mb-3 ${
              selectedDoctor === 'auto' ? 'border-primary bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedDoctor('auto')}
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">🤖</div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-gray-900">Auto-Assign</div>
              <div className="text-xs text-gray-500">Best available doctor will be assigned</div>
            </div>
            {selectedDoctor === 'auto' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                Selected
              </span>
            )}
          </div>

          {fetchingDoctors ? (
            <div className="flex items-center justify-center py-4 gap-2">
              <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            doctors.map((doc) => (
              <div
                key={doc._id || doc.id}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-primary transition mb-3 ${
                  selectedDoctor === (doc._id || doc.id) ? 'border-primary bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setSelectedDoctor(doc._id || doc.id)}
              >
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                  {doc.name?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">Dr. {doc.name}</div>
                  <div className="text-xs text-gray-500">{doc.specialization}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      doc.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {doc.isOnline ? '● Online' : '● Offline'}
                  </span>
                  <span className="text-xs text-gray-500">Queue: {doc.queueLength ?? 0}</span>
                </div>
                {selectedDoctor === (doc._id || doc.id) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    Selected
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <button
          className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
          onClick={handleSubmit}
          disabled={loading || !selectedSlot}
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Booking…
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
