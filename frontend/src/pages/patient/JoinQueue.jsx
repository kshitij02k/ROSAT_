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

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function EmergencyWarningModal({ level, onConfirm, onChange }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="text-4xl mb-3 text-center">⚠️</div>
        <h2 className="text-xl font-bold text-red-600 text-center">High Emergency Warning</h2>
        <p className="text-gray-700 text-sm mt-2 text-center">
          You selected <strong>Level {level} – {EMERGENCY_LABELS[level]}</strong>.{' '}
          Selecting a high emergency level is reserved for <strong>genuinely severe cases</strong>.
          Misuse may result in a <strong>fine or queue penalty</strong>.
          Please confirm only if your condition truly warrants urgent attention.
        </p>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            onClick={onChange}
          >
            ← Change Level
          </button>
          <button
            className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition font-semibold"
            onClick={onConfirm}
          >
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

  const [patientInfo, setPatientInfo] = useState({
    name: user?.name || '',
    age: user?.age || '',
    gender: user?.gender || '',
    visitType: 'Checkup',
    previousVisitCount: ''
  });

  const [medical, setMedical] = useState({
    symptoms: '',
    emergencyLevel: 1,
    consultationMode: 'video'
  });
  const [showWarning, setShowWarning] = useState(false);
  const [pendingLevel, setPendingLevel] = useState(null);

  const [mlSpec, setMlSpec] = useState('');
  const [mlLoading, setMlLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('auto');

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
      fetchMlPrediction();
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError('');
    setStep((s) => s - 1);
  };

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
      setStep(4);
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

  function getEmergencyButtonClass(level) {
    const isSelected = medical.emergencyLevel === level;
    if (level <= 2) {
      return isSelected
        ? 'border-green-500 bg-green-50 text-green-700'
        : 'border-gray-200 hover:border-green-400 text-gray-700';
    }
    if (level === 3) {
      return isSelected
        ? 'border-amber-500 bg-amber-50 text-amber-700'
        : 'border-gray-200 hover:border-amber-400 text-gray-700';
    }
    return isSelected
      ? 'border-red-500 bg-red-50 text-red-700'
      : 'border-gray-200 hover:border-red-400 text-gray-700';
  }

  const renderStepper = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((label, idx) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx < step
                  ? 'bg-green-500 text-white'
                  : idx === step
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {idx < step ? '✓' : idx + 1}
            </div>
            <span
              className={`text-sm font-medium hidden sm:block ${
                idx === step ? 'text-primary' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 ${idx < step ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep0 = () => (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">👤 Patient Information</h2>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input
            className={inputClass}
            value={patientInfo.name}
            onChange={(e) => setPatientInfo((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className={labelClass}>Age *</label>
          <input
            className={inputClass}
            type="number"
            min="1"
            max="120"
            value={patientInfo.age}
            onChange={(e) => setPatientInfo((p) => ({ ...p, age: e.target.value }))}
            placeholder="e.g. 35"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass}>Gender *</label>
          <select
            className={inputClass}
            value={patientInfo.gender}
            onChange={(e) => setPatientInfo((p) => ({ ...p, gender: e.target.value }))}
          >
            <option value="">Select gender</option>
            {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Visit Type *</label>
          <select
            className={inputClass}
            value={patientInfo.visitType}
            onChange={(e) => setPatientInfo((p) => ({ ...p, visitType: e.target.value }))}
          >
            <option value="Checkup">Checkup</option>
            <option value="Follow-up">Follow-up</option>
          </select>
        </div>
      </div>
      {patientInfo.visitType === 'Follow-up' && (
        <div className="mb-4">
          <label className={labelClass}>Previous Visit Count *</label>
          <input
            className={inputClass}
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
      <h2 className="text-base font-semibold text-gray-900 mb-4">🩺 Medical Details</h2>
      <div className="mb-4">
        <label className={labelClass}>Symptoms / Chief Complaint *</label>
        <textarea
          className={inputClass}
          rows={4}
          value={medical.symptoms}
          onChange={(e) => setMedical((m) => ({ ...m, symptoms: e.target.value }))}
          placeholder="Describe your symptoms in detail…"
        />
      </div>

      <div className="mb-4">
        <label className={labelClass}>Emergency Level *</label>
        <div className="grid grid-cols-5 gap-2 mb-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              className={`p-3 rounded-xl border-2 text-center cursor-pointer transition ${getEmergencyButtonClass(level)}`}
              onClick={() => handleEmergencySelect(level)}
            >
              <div className="text-lg font-bold">{level}</div>
              <div className="text-xs mt-0.5">{EMERGENCY_LABELS[level]}</div>
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Selected: <strong>Level {medical.emergencyLevel} – {EMERGENCY_LABELS[medical.emergencyLevel]}</strong>
        </p>
      </div>

      <div className="mb-4">
        <label className={labelClass}>Consultation Mode *</label>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-6 rounded-xl border-2 cursor-pointer text-center hover:border-primary transition ${
              medical.consultationMode === 'video'
                ? 'border-primary bg-blue-50'
                : 'border-gray-200'
            }`}
            onClick={() => setMedical((m) => ({ ...m, consultationMode: 'video' }))}
          >
            <div className="text-3xl mb-2">📹</div>
            <div className="font-semibold text-sm text-gray-800">Video Call</div>
            <div className="text-xs text-gray-500 mt-1">Face-to-face consultation</div>
          </div>
          <div
            className={`p-6 rounded-xl border-2 cursor-pointer text-center hover:border-primary transition ${
              medical.consultationMode === 'chat'
                ? 'border-primary bg-blue-50'
                : 'border-gray-200'
            }`}
            onClick={() => setMedical((m) => ({ ...m, consultationMode: 'chat' }))}
          >
            <div className="text-3xl mb-2">💬</div>
            <div className="font-semibold text-sm text-gray-800">Chat</div>
            <div className="text-xs text-gray-500 mt-1">Text-based consultation</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-4">👨‍⚕️ Doctor Selection</h2>

      {mlLoading ? (
        <div className="flex items-center gap-3 py-6 justify-center">
          <div className="animate-spin h-5 w-5 rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-gray-600">Analyzing symptoms with ML…</span>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg flex items-center gap-2 text-sm mb-5">
            <span>🤖</span>
            <span>
              <strong>ML Recommendation:</strong> Based on your symptoms, we suggest a{' '}
              <strong>{mlSpec}</strong>.
            </span>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Assignment Method</label>
            <div
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-primary transition mb-3 ${
                selectedDoctor === 'auto' ? 'border-primary bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedDoctor('auto')}
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">��</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-900">Auto-Assign</div>
                <div className="text-xs text-gray-500">Best available {mlSpec} doctor</div>
              </div>
              {selectedDoctor === 'auto' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  Selected
                </span>
              )}
            </div>
          </div>

          {doctors.length > 0 && (
            <div className="mb-4">
              <label className={labelClass}>Or choose a specific doctor</label>
              {doctors.map((doc) => (
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
                  <div className="text-xs text-gray-500">Queue: {doc.queueLength ?? 0}</div>
                  {selectedDoctor === (doc._id || doc.id) && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Selected
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {doctors.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg flex items-center gap-2 text-sm">
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
      <h2 className="text-base font-semibold text-gray-900 mb-4">✅ Confirm Queue Entry</h2>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">Patient</div>
            <div className="font-semibold text-sm text-gray-900">{patientInfo.name}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Age / Gender</div>
            <div className="font-semibold text-sm text-gray-900">{patientInfo.age} / {patientInfo.gender}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Visit Type</div>
            <div className="font-semibold text-sm text-gray-900">{patientInfo.visitType}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Consultation Mode</div>
            <div className="font-semibold text-sm text-gray-900">
              {medical.consultationMode === 'video' ? '📹 Video' : '💬 Chat'}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-gray-500">Symptoms</div>
            <div className="font-semibold text-sm text-gray-900">{medical.symptoms}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Emergency Level</div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                medical.emergencyLevel <= 2
                  ? 'bg-green-100 text-green-700'
                  : medical.emergencyLevel === 3
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              Level {medical.emergencyLevel} – {EMERGENCY_LABELS[medical.emergencyLevel]}
            </span>
          </div>
          <div>
            <div className="text-xs text-gray-500">Specialization</div>
            <div className="font-semibold text-sm text-gray-900">{mlSpec || 'Auto-detect'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Doctor</div>
            <div className="font-semibold text-sm text-gray-900">
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
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-2xl font-bold text-gray-900">You're in the Queue!</div>
        <div className="text-gray-500 text-sm mt-1">Your request has been submitted successfully.</div>
      </div>
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6 mb-6">
        <div className="text-6xl font-black text-center">#{success?.position ?? '—'}</div>
        <div className="text-center text-sm opacity-75 mt-1">Your position in queue</div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{success?.patientsAhead ?? 0}</div>
            <div className="text-sm opacity-75">Patients Ahead</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{success?.estimatedWait ?? '—'} min</div>
            <div className="text-sm opacity-75">Est. Wait Time</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {success?.doctorName ? `Dr. ${success.doctorName}` : '—'}
            </div>
            <div className="text-sm opacity-75">Assigned Doctor</div>
          </div>
        </div>
      </div>
      <button
        className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition"
        onClick={() => navigate('/patient/dashboard')}
      >
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📋 Join Live Queue</h1>
          <p className="text-gray-500 mt-1">Fill in your details to get in the virtual queue.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step < 4 && renderStepper()}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm mb-4">
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
            <div className="flex justify-between mt-6 gap-3">
              {step > 0 ? (
                <button
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                  onClick={prevStep}
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}

              {step < 3 ? (
                <button
                  className="px-5 py-2 text-sm bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition disabled:opacity-60"
                  onClick={nextStep}
                  disabled={mlLoading}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="px-5 py-2 text-sm bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition disabled:opacity-60 flex items-center gap-2"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
