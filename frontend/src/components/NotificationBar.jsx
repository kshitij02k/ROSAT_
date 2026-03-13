import React, { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../services/socket';

const ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '🚨'
};

let _id = 0;

export function NotificationBar({ userRole }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = ++_id;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlers = {
      'notification:alert': (data) =>
        addNotification(data.message || data, data.type || 'info'),
      'queue:updated': (data) =>
        addNotification(data.message || 'Queue has been updated.', 'info'),
      'patient:wait-updated': (data) =>
        addNotification(
          `Your estimated wait time is now ${data.estimatedWait ?? data} min.`,
          'info'
        ),
      'doctor:reassigned': (data) =>
        addNotification(
          data.message || 'You have been reassigned to another doctor.',
          'warning'
        ),
      'admin:alert': (data) =>
        addNotification(data.message || data, data.type || 'warning')
    };

    // Role-specific events
    if (userRole === 'doctor') {
      handlers['doctor:inaction-alert'] = () =>
        addNotification(
          '⏰ No action in 3 minutes. Please attend to the next patient.',
          'warning'
        );
    }

    if (userRole === 'patient') {
      handlers['patient:called'] = (data) =>
        addNotification(
          data.message || 'It\'s your turn! Please join the session.',
          'success'
        );
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [userRole, addNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((n) => (
        <div key={n.id} className={`notification-bar ${n.type}`}>
          <span className="notification-icon">{ICONS[n.type] || ICONS.info}</span>
          <span className="notification-text">{n.message}</span>
          <button
            className="notification-close"
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default NotificationBar;
