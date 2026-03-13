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

const ROLE_BADGE_CLASS = {
  patient: 'bg-blue-100 text-blue-700',
  doctor: 'bg-green-100 text-green-700',
  admin: 'bg-amber-100 text-amber-700'
};

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const links = ROLE_LINKS[user.role] || [];
  const badgeClass = ROLE_BADGE_CLASS[user.role] || 'bg-gray-100 text-gray-700';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <Link to={`/${user.role}/dashboard`} className="text-xl font-bold text-primary flex items-center gap-2">
          🏥 TeleQueue
        </Link>

        <ul className="hidden md:flex gap-6 list-none m-0 p-0">
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'text-sm font-medium text-primary border-b-2 border-primary pb-1'
                    : 'text-sm font-medium text-gray-600 hover:text-primary transition-colors'
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {user.role}
            </span>
          </div>
          <button
            className="hidden md:inline-flex text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
            onClick={logout}
          >
            Logout
          </button>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed top-16 inset-x-0 bg-white border-b shadow-lg z-40 p-4 flex flex-col gap-2">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-primary font-medium text-sm'
                  : 'flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 text-sm'
              }
              onClick={() => setMenuOpen(false)}
            >
              {icon} {label}
            </NavLink>
          ))}
          <hr className="border-gray-200 my-1" />
          <button
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition text-left"
            onClick={() => { logout(); setMenuOpen(false); }}
          >
            Logout
          </button>
        </div>
      )}
    </>
  );
}

export default Navbar;
