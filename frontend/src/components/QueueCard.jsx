import React from 'react';

const QueueCard = ({ entry, position }) => {
  const patient = entry.patientId || entry;
  const emergencyLevel = entry.emergencyLevel || patient?.emergencyLevel || 1;

  const getEmergencyLabel = (level) => {
    const labels = { 5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Minimal' };
    return labels[level] || 'Unknown';
  };

  return (
    <div className="queue-card">
      <div className="queue-position">{position || entry.position || 1}</div>
      <div className="queue-info">
        <h4>{patient?.name || 'Unknown Patient'}</h4>
        <p>
          {patient?.symptoms || 'No symptoms listed'} &bull; Age: {patient?.age || 'N/A'}
        </p>
        <p className="text-sm text-muted">
          Wait: {entry.estimatedWaitTime || 0} min &bull;
          Duration: {entry.predictedDuration || patient?.predictedDuration || 10} min
        </p>
      </div>
      <div>
        <span className={`emergency-badge emergency-${emergencyLevel}`}>
          {emergencyLevel}
        </span>
        <p className="text-xs text-muted text-center" style={{ marginTop: 4 }}>
          {getEmergencyLabel(emergencyLevel)}
        </p>
      </div>
      <div>
        <p className="text-sm font-semibold text-primary">
          Score: {Math.round(entry.priorityScore || 0)}
        </p>
      </div>
    </div>
  );
};

export default QueueCard;
