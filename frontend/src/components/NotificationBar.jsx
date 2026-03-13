import React, { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../services/socket';

const ICONS = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '🚨'
};

const TYPE_CLASS = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-800'
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
          data.message || "It's your turn! Please join the session.",
          'success'
        );
      handlers['consultation:started'] = (data) =>
        addNotification(
          data.message || 'Your consultation has started! Please select your preferred mode.',
          'success'
        );
      handlers['patient:reassigned'] = (data) =>
        addNotification(
          data.message || 'You have been reassigned to another doctor.',
          'warning'
        );
      handlers['patient:position-update'] = (data) =>
        addNotification(
          data.message || `Your queue position is now #${data.position}.`,
          'info'
        );
    }

    // Cascade effect: delay notification for all waiting patients
    handlers['queue:delay-update'] = (data) =>
      addNotification(
        data.message || 'The doctor is handling a critical case. Your wait time has been updated.',
        'warning'
      );

    // Critical surge alert for admins
    if (userRole === 'admin') {
      handlers['admin:critical-surge'] = (data) =>
        addNotification(
          data.message || '🚨 Critical surge detected! No doctors available for critical patient.',
          'danger'
        );
      handlers['admin:urgent-request'] = (data) =>
        addNotification(
          data.message || 'Urgent patient request received.',
          'danger'
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
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start gap-3 p-3 rounded-xl shadow-lg border text-sm font-medium ${TYPE_CLASS[n.type] || TYPE_CLASS.info}`}
        >
          <span className="text-base">{ICONS[n.type] || ICONS.info}</span>
          <span className="flex-1">{n.message}</span>
          <button
            className="ml-auto opacity-60 hover:opacity-100 text-lg leading-none"
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
