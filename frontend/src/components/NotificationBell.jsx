import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FiBell, FiCheck } from 'react-icons/fi';
import './NotificationBell.css';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await axios.get('/api/notifications/unread-count');
      setUnread(data.unread || 0);
    } catch {
      // Silent fail to avoid interrupting page UX.
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/notifications/my', { params: { page: 1, limit: 10 } });
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // Silent fail to avoid interrupting page UX.
    } finally {
      setLoading(false);
    }
  };

  const markOneRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore failures for optional UX action.
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // Ignore failures for optional UX action.
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 25000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onClickAway = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await fetchNotifications();
    }
  };

  return (
    <div className="notify-wrap" ref={wrapRef}>
      <button className="notify-btn" onClick={toggle} aria-label="Open notifications">
        <FiBell size={18} />
        {unread > 0 && <span className="notify-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notify-panel">
          <div className="notify-header">
            <h4>Notifications</h4>
            <button onClick={markAllRead} className="notify-mark-all">Mark all read</button>
          </div>

          {loading ? (
            <div className="notify-empty">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="notify-empty">No notifications yet.</div>
          ) : (
            <div className="notify-list">
              {notifications.map((n) => (
                <div key={n._id} className={`notify-item ${n.isRead ? 'read' : 'unread'}`}>
                  <div className="notify-content">
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <small>{new Date(n.createdAt).toLocaleString()}</small>
                  </div>
                  {!n.isRead && (
                    <button className="notify-read-btn" onClick={() => markOneRead(n._id)} title="Mark as read">
                      <FiCheck size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
