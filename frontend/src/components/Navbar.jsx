import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LINKS = {
  patient: [
    { to: '/patient/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/patient/join-queue', label: 'Join Queue', icon: '📋' },
    { to: '/patient/appointment', label: 'Appointments', icon: '📅' }
  ],
  doctor: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: '🏠' }
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠' }
  ]
};

const ROLE_BADGE = {
  patient: 'badge-info',
  doctor: 'badge-success',
  admin: 'badge-warning'
};

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const links = ROLE_LINKS[user.role] || [];
  const badgeClass = ROLE_BADGE[user.role] || 'badge-secondary';

  return (
    <>
      <nav className="navbar">
        <Link to={`/${user.role}/dashboard`} className="navbar-brand">
          🏥 TeleQueue
        </Link>

        <ul className="navbar-nav">
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="navbar-end">
          <div className="navbar-user">
            <span className="text-sm fw-bold">{user.name}</span>
            <span className={`badge ${badgeClass}`}>{user.role}</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={logout}>
            Logout
          </button>
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <div className={`navbar-mobile-menu ${menuOpen ? 'open' : ''}`}>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMenuOpen(false)}
          >
            {icon} {label}
          </NavLink>
        ))}
        <hr className="divider" />
        <button
          className="btn btn-outline btn-sm"
          onClick={() => { logout(); setMenuOpen(false); }}
          style={{ width: '100%' }}
        >
          Logout
        </button>
      </div>
    </>
  );
}

export default Navbar;
