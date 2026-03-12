import React, { useState } from 'react';

const Navbar = ({ title, user, onMenuToggle }) => {
  const initials = (user?.name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          ☰
        </button>
        <h2 className="navbar-title">{title || 'Dashboard'}</h2>
      </div>
      <div className="navbar-right">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div>
            <p className="user-name">{user?.name}</p>
            <p className="user-role" style={{ textTransform: 'capitalize' }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
