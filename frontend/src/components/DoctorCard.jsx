import React from 'react';

const DoctorCard = ({ doctor }) => {
  const statusClass = doctor.isOnline
    ? doctor.availability ? 'status-online' : 'status-busy'
    : 'status-offline';

  const statusLabel = doctor.isOnline
    ? doctor.availability ? 'Available' : 'In Consultation'
    : 'Offline';

  const initials = (doctor.name || 'Dr')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="doctor-card">
      <div className="doctor-card-header">
        <div className="doctor-avatar">{initials}</div>
        <div className="doctor-info">
          <h4>{doctor.name}</h4>
          <p>{doctor.specialization || 'General'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="doctor-status">
          <span className={`status-dot ${statusClass}`}></span>
          <span className="text-sm">{statusLabel}</span>
        </div>
        <span className="badge badge-secondary">
          Queue: {doctor.queueLength || 0}
        </span>
      </div>
      <div style={{ marginTop: 12, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
        <p className="text-xs text-muted">Experience: {doctor.experience || 0} years</p>
        <p className="text-xs text-muted">Patients today: {doctor.totalPatientsToday || 0}</p>
      </div>
    </div>
  );
};

export default DoctorCard;
