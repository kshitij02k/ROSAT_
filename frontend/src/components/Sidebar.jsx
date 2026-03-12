import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const Sidebar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const patientLinks = [
    { path: '/patient/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/patient/join-queue', icon: '➕', label: 'Join Queue' },
    { path: '/patient/queue-status', icon: '📋', label: 'Queue Status' },
    { path: '/patient/history', icon: '📜', label: 'History' }
  ];

  const doctorLinks = [
    { path: '/doctor/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/doctor/current-consultation', icon: '🩺', label: 'Current Consultation' },
    { path: '/doctor/queue', icon: '📋', label: 'Queue Overview' },
    { path: '/doctor/history', icon: '📜', label: 'History' }
  ];

  const adminLinks = [
    { path: '/admin/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/admin/queue-monitor', icon: '👁', label: 'Queue Monitor' },
    { path: '/admin/optimization', icon: '⚡', label: 'Optimization' },
    { path: '/admin/doctors', icon: '👨‍⚕️', label: 'Doctors' },
    { path: '/admin/analytics', icon: '📊', label: 'Analytics' }
  ];

  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'doctor' ? doctorLinks
    : patientLinks;

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h2>🏥 TeleMed</h2>
          <p>Queue Optimization System</p>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-title">
            {user?.role === 'admin' ? 'Admin Panel'
              : user?.role === 'doctor' ? 'Doctor Panel'
              : 'Patient Panel'}
          </p>
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: 12 }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
              {user?.name}
            </p>
            <p className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>
              {user?.role}
            </p>
          </div>
          <button className="btn btn-secondary btn-block" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>
      {isOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export { Sidebar };
export default Sidebar;
