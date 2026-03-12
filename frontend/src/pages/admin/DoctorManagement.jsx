import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import DoctorCard from '../../components/DoctorCard';

const DoctorManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState('');

  const fetchDoctors = async () => {
    try {
      const res = await adminAPI.getDoctors();
      setDoctors(res.data);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleEdit = (doctor) => {
    setEditingId(doctor._id);
    setEditForm({
      availability: doctor.availability,
      specialization: doctor.specialization
    });
  };

  const handleUpdate = async (id) => {
    try {
      await adminAPI.updateDoctor(id, editForm);
      setMessage('Doctor updated successfully!');
      setEditingId(null);
      fetchDoctors();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    }
  };

  const specializations = [
    'physician', 'cardiologist', 'neurologist', 'ophthalmologist',
    'dermatologist', 'orthopedist', 'psychiatrist', 'dentist',
    'gastroenterologist', 'pediatrician', 'general'
  ];

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const online = doctors.filter(d => d.isOnline).length;
  const available = doctors.filter(d => d.availability).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Doctor Management</h1>
          <p>Manage doctor profiles and availability</p>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('failed') || message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon blue">👨‍⚕️</div>
          <div className="stat-info">
            <h4>{doctors.length}</h4>
            <p>Total Doctors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🟢</div>
          <div className="stat-info">
            <h4>{online}</h4>
            <p>Online Now</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">✅</div>
          <div className="stat-info">
            <h4>{available}</h4>
            <p>Available</p>
          </div>
        </div>
      </div>

      {doctors.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👨‍⚕️</div>
            <h3>No Doctors Registered</h3>
            <p>Doctors will appear here after they register with the system</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Specialization</th>
                      <th>Status</th>
                      <th>Queue</th>
                      <th>Patients Today</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor._id}>
                        <td><strong>{doctor.name}</strong></td>
                        <td>
                          {editingId === doctor._id ? (
                            <select
                              className="form-control"
                              value={editForm.specialization}
                              onChange={e => setEditForm({ ...editForm, specialization: e.target.value })}
                              style={{ minWidth: 140 }}
                            >
                              {specializations.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          ) : doctor.specialization}
                        </td>
                        <td>
                          {editingId === doctor._id ? (
                            <select
                              className="form-control"
                              value={editForm.availability}
                              onChange={e => setEditForm({ ...editForm, availability: e.target.value === 'true' })}
                              style={{ minWidth: 130 }}
                            >
                              <option value="true">Available</option>
                              <option value="false">Unavailable</option>
                            </select>
                          ) : (
                            <span>
                              <span className={`status-dot ${doctor.isOnline ? (doctor.availability ? 'status-online' : 'status-busy') : 'status-offline'}`}
                                style={{ display: 'inline-block', marginRight: 6 }}></span>
                              {doctor.isOnline ? (doctor.availability ? 'Available' : 'Busy') : 'Offline'}
                            </span>
                          )}
                        </td>
                        <td>{doctor.queueLength || 0}</td>
                        <td>{doctor.totalPatientsToday || 0}</td>
                        <td>
                          {editingId === doctor._id ? (
                            <div className="flex gap-2">
                              <button className="btn btn-success btn-sm" onClick={() => handleUpdate(doctor._id)}>
                                Save
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(doctor)}>
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {doctors.map(doctor => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DoctorManagement;
