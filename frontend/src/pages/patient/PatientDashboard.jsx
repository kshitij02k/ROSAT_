import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { patient as patientApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import NotificationBar from '../../components/NotificationBar';

const EMERGENCY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Significant', 4: 'Severe', 5: 'Critical' };

function emergencyBadgeClass(level) {
  if (level <= 2) return 'bg-green-100 text-green-700';
  if (level === 3) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function statusBadgeClass(status) {
  if (status === 'waiting') return 'bg-amber-100 text-amber-700';
  if (status === 'in-progress') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const badgeBase = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';

export function PatientDashboard() {
  const navigate = useNavigate();

  const [queueEntry, setQueueEntry] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Urgent Request state
  const [showUrgent, setShowUrgent] = useState(false);
  const [urgentSymptoms, setUrgentSymptoms] = useState('');
  const [urgentLoading, setUrgentLoading] = useState(false);
  const [urgentResult, setUrgentResult] = useState(null);

  // Consultation mode selection popup
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [modeConsultationId, setModeConsultationId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [qRes, apptRes, histRes] = await Promise.allSettled([
        patientApi.getMyQueue(),
        patientApi.getMyAppointments(),
        patientApi.getHistory()
      ]);
      if (qRes.status === 'fulfilled') {
        const data = qRes.value.data;
        // Backend returns { consultation, queuePosition } — flatten for the UI
        if (data.consultation) {
          setQueueEntry({
            ...data.consultation,
            position: data.queuePosition,
            queuePosition: data.queuePosition,
          });
        } else {
          setQueueEntry(null);
        }
      }
      if (apptRes.status === 'fulfilled')
        setAppointments(apptRes.value.data.appointments || apptRes.value.data || []);
      if (histRes.status === 'fulfilled')
        setHistory(histRes.value.data.consultations || histRes.value.data.history || histRes.value.data || []);
    } catch (err) {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleQueueUpdate = (data) => {
      setQueueEntry((prev) => (prev ? { ...prev, ...data } : data));
    };
    const handleWaitUpdate = (data) => {
      setQueueEntry((prev) =>
        prev ? { ...prev, estimatedWait: data.estimatedWait } : prev
      );
    };
    const handleConsultationStarted = (data) => {
      // When doctor starts session, prompt patient for consultation mode
      setModeConsultationId(data.consultationId);
      setShowModeSelect(true);
      fetchAll();
    };
    const handleReassigned = () => {
      fetchAll();
    };

    socket.on('queue:updated', handleQueueUpdate);
    socket.on('patient:wait-updated', handleWaitUpdate);
    socket.on('patient:called', fetchAll);
    socket.on('consultation:started', handleConsultationStarted);
    socket.on('patient:reassigned', handleReassigned);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
      socket.off('patient:wait-updated', handleWaitUpdate);
      socket.off('patient:called', fetchAll);
      socket.off('consultation:started', handleConsultationStarted);
      socket.off('patient:reassigned', handleReassigned);
    };
  }, [fetchAll]);

  const handleUrgentSubmit = async () => {
    if (!urgentSymptoms.trim()) return;
    setUrgentLoading(true);
    try {
      const res = await patientApi.urgentRequest({ symptoms: urgentSymptoms });
      setUrgentResult(res.data);
      setShowUrgent(false);
      setUrgentSymptoms('');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Urgent request failed.');
    } finally {
      setUrgentLoading(false);
    }
  };

  const handleModeSelect = (mode) => {
    const socket = getSocket();
    if (socket && modeConsultationId) {
      socket.emit('consultation:select-mode', {
        consultationId: modeConsultationId,
        mode,
      });
    }
    setShowModeSelect(false);
    navigate(`/patient/consultation/${modeConsultationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <Navbar />
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-gray-500">Loading dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  const hasQueue = queueEntry && queueEntry.status !== 'completed' && queueEntry.status !== 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🏠 My Dashboard</h1>
          <p className="text-gray-500 mt-1">Track your queue position and appointments in real-time.</p>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-6">
            <span>⚠️</span> <span>{error}</span>
          </div>
        )}

        {/* Queue Status */}
        {hasQueue ? (
          <div>
            <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6 mb-6">
              <div className="text-6xl font-black text-center">#{queueEntry.position ?? '—'}</div>
              <div className="text-center text-sm opacity-75 mt-1">Your Queue Position</div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueEntry.patientsAhead ?? 0}</div>
                  <div className="text-sm opacity-75">Patients Ahead</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{queueEntry.estimatedWait ?? '—'} min</div>
                  <div className="text-sm opacity-75">Est. Wait Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {queueEntry.status === 'in-progress' ? '🟢' : '⏳'}
                  </div>
                  <div className="text-sm opacity-75">
                    {queueEntry.status === 'in-progress' ? 'Active' : 'Waiting'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Consultation Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Assigned Doctor</div>
                  <div className="font-semibold text-sm text-gray-900">
                    {queueEntry.doctorName
                      ? `Dr. ${queueEntry.doctorName}`
                      : queueEntry.doctorId?.name
                      ? `Dr. ${queueEntry.doctorId.name}`
                      : queueEntry.doctor?.name
                      ? `Dr. ${queueEntry.doctor.name}`
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {queueEntry.doctorSpecialization || queueEntry.doctor?.specialization || ''}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Consultation Mode</div>
                  <span className={`${badgeBase} bg-blue-100 text-blue-700`}>
                    {queueEntry.consultationMode === 'video' ? '📹 Video Call'
                      : queueEntry.consultationMode === 'chat' ? '💬 Chat'
                      : '📋 Pending Selection'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Emergency Level</div>
                  <span className={`${badgeBase} ${emergencyBadgeClass(queueEntry.emergencyLevel)}`}>
                    Level {queueEntry.emergencyLevel ?? '—'} –{' '}
                    {EMERGENCY_LABELS[queueEntry.emergencyLevel] || ''}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Priority Score</div>
                  <span className={`${badgeBase} ${emergencyBadgeClass(queueEntry.emergencyLevel)}`}>
                    {queueEntry.priorityScore?.toFixed(1) ?? '—'}
                  </span>
                </div>
              </div>

              {queueEntry.status === 'in-progress' && (
                <div className="mt-5">
                  <button
                    className="px-5 py-2.5 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition text-sm"
                    onClick={() =>
                      navigate(`/patient/consultation/${queueEntry._id || queueEntry.id}`)
                    }
                  >
                    {queueEntry.consultationMode === 'video'
                      ? '📹 Join Video Session'
                      : '💬 Join Chat Session'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">📋</div>
              <div className="text-lg font-semibold text-gray-700 mb-1">No Active Queue Entry</div>
              <div className="text-sm mb-4">Join the live queue to get started.</div>
              <button
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition text-sm"
                onClick={() => navigate('/patient/join-queue')}
              >
                Join Queue Now
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">📅 Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm mb-3">No upcoming appointments.</div>
              <button
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                onClick={() => navigate('/patient/appointment')}
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a, idx) => (
                    <tr key={a._id || idx}>
                      <td className="px-4 py-3 border-t border-gray-100">{formatDate(a.date)}</td>
                      <td className="px-4 py-3 border-t border-gray-100">{a.timeSlot || '—'}</td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        {a.doctorName ? `Dr. ${a.doctorName}` : a.doctor?.name ? `Dr. ${a.doctor.name}` : '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <span className={`${badgeBase} ${statusBadgeClass(a.status)}`}>
                          {a.status || 'scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">📜 Consultation History</h2>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm">No consultation history yet.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Symptoms</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => (
                    <tr key={h._id || idx}>
                      <td className="px-4 py-3 border-t border-gray-100">{formatDate(h.createdAt || h.date)}</td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        {h.doctorName ? `Dr. ${h.doctorName}` : h.doctor?.name ? `Dr. ${h.doctor.name}` : '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                        {h.symptoms || '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        {h.duration != null ? `${h.duration} min` : '—'}
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <span className={`${badgeBase} bg-blue-100 text-blue-700`}>
                          {h.consultationMode === 'video' ? '📹 Video' : '💬 Chat'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-gray-100">
                        <span className={`${badgeBase} ${statusBadgeClass(h.status)}`}>
                          {h.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Urgent Appointment Button */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">🚨 Need Immediate Help?</h2>
              <p className="text-sm text-gray-500 mt-1">Request an urgent consultation processed by AI instantly.</p>
            </div>
            <button
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition text-sm"
              onClick={() => setShowUrgent(true)}
            >
              🚨 Urgent Request
            </button>
          </div>
          {urgentResult && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">
              ✅ Urgent request submitted. AI Level: {urgentResult.triage?.emergencyLevel}, Specialist: {urgentResult.triage?.specialization}. You will be connected shortly.
            </div>
          )}
        </div>
      </div>

      {/* Urgent Request Modal */}
      {showUrgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-4xl mb-3 text-center">🚨</div>
            <h2 className="text-xl font-bold text-red-600 text-center">Urgent Consultation Request</h2>
            <p className="text-gray-600 text-sm mt-2 text-center">
              Describe your symptoms. AI will instantly triage and connect you with the appropriate doctor.
            </p>
            <textarea
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mt-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={4}
              value={urgentSymptoms}
              onChange={(e) => setUrgentSymptoms(e.target.value)}
              placeholder="Describe your urgent symptoms in detail…"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                onClick={() => { setShowUrgent(false); setUrgentSymptoms(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold flex items-center gap-2"
                onClick={handleUrgentSubmit}
                disabled={urgentLoading || !urgentSymptoms.trim()}
              >
                {urgentLoading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing…
                  </>
                ) : (
                  '🚨 Submit Urgent Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Mode Selection Modal */}
      {showModeSelect && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="text-4xl mb-3 text-center">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 text-center">Your Consultation is Ready!</h2>
            <p className="text-gray-600 text-sm mt-2 text-center">
              How would you like to consult?
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                className="p-6 rounded-xl border-2 border-gray-200 cursor-pointer text-center hover:border-primary transition"
                onClick={() => handleModeSelect('chat')}
              >
                <div className="text-3xl mb-2">💬</div>
                <div className="font-semibold text-sm text-gray-800">Start Chat</div>
                <div className="text-xs text-gray-500 mt-1">Text-based consultation</div>
              </button>
              <button
                className="p-6 rounded-xl border-2 border-gray-200 cursor-pointer text-center hover:border-primary transition"
                onClick={() => handleModeSelect('video')}
              >
                <div className="text-3xl mb-2">📹</div>
                <div className="font-semibold text-sm text-gray-800">Start Video Call</div>
                <div className="text-xs text-gray-500 mt-1">Face-to-face consultation</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDashboard;
