import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiTruck, FiCheckCircle, FiLogOut,
  FiMenu, FiX, FiMapPin, FiSun, FiMoon, FiUser,
  FiBarChart2, FiRefreshCw, FiPackage
} from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import '../pages/Dashboard.css';
import './AdminDashboard.css';

const DELIVERY_COLORS = {
  assigned: '#f59e0b',
  picked_up: '#3b82f6',
  in_transit: '#8b5cf6',
  delivered: '#10b981',
};

const NEXT_DELIVERY = {
  assigned: { status: 'picked_up', label: 'Mark Picked Up' },
  picked_up: { status: 'in_transit', label: 'Mark In Transit' },
  in_transit: { status: 'delivered', label: 'Mark Delivered' },
};

const RiderDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/orders/rider/stats');
      setStats(data);
    } catch { /* silent */ }
  }, []);

  const fetchDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    try {
      const params = {};
      if (deliveryFilter) params.deliveryStatus = deliveryFilter;
      const { data } = await axios.get('/api/orders/rider/my-deliveries', { params });
      setDeliveries(data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load deliveries');
    } finally {
      setDeliveriesLoading(false);
    }
  }, [deliveryFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const handleAdvanceStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/orders/${orderId}/delivery-status`, {
        deliveryStatus: newStatus,
        deliveryNotes: deliveryNote,
      });
      setDeliveries(prev => prev.map(d =>
        d._id === orderId ? { ...d, deliveryStatus: newStatus, deliveryNotes: deliveryNote } : d
      ));
      if (selectedDelivery?._id === orderId) {
        setSelectedDelivery(prev => ({ ...prev, deliveryStatus: newStatus, deliveryNotes: deliveryNote }));
      }
      setDeliveryNote('');
      fetchStats();
      setSuccessMsg('Delivery status updated.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update status');
    }
  };

  const statCards = stats ? [
    { label: 'Assigned', value: stats.assigned, icon: <FiPackage />, color: '#f59e0b' },
    { label: 'Picked Up', value: stats.pickedUp, icon: <FiTruck />, color: '#3b82f6' },
    { label: 'In Transit', value: stats.inTransit, icon: <FiMapPin />, color: '#8b5cf6' },
    { label: 'Delivered Today', value: stats.deliveredToday, icon: <FiCheckCircle />, color: '#10b981' },
  ] : [
    { label: 'Assigned', value: '…', icon: <FiPackage />, color: '#f59e0b' },
    { label: 'Picked Up', value: '…', icon: <FiTruck />, color: '#3b82f6' },
    { label: 'In Transit', value: '…', icon: <FiMapPin />, color: '#8b5cf6' },
    { label: 'Delivered Today', value: '…', icon: <FiCheckCircle />, color: '#10b981' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Printsy Rider</h2>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><FiX /></button>
        </div>
        <nav className="sidebar-nav">
          <span
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
          >
            <FiBarChart2 /> Overview
          </span>
          <span
            className={`nav-item ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('deliveries'); setSidebarOpen(false); }}
          >
            <FiTruck /> My Deliveries
          </span>
          <div className="nav-divider"></div>
          <button className="nav-item nav-logout" onClick={handleLogout}><FiLogOut /> Logout</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar"><FiUser /></div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-email">Rider</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}><FiMenu size={22} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="admin-tabs">
              {['overview', 'deliveries'].map(tab => (
                <button
                  key={tab}
                  className={`admin-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'deliveries' ? 'My Deliveries' : 'Overview'}
                </button>
              ))}
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>
        </header>

        <div className="dashboard-content" style={{ padding: '2rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
              <button onClick={() => setError('')} style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
            </div>
          )}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="stats-grid">
                {statCards.map((stat, i) => (
                  <motion.div
                    key={i}
                    className="stat-card card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
                    <div className="stat-info">
                      <p className="stat-label">{stat.label}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => { setDeliveryFilter('assigned'); setActiveTab('deliveries'); }}>
                      <FiPackage /> View Assigned
                    </button>
                    <button className="btn btn-outline" onClick={() => { setDeliveryFilter('in_transit'); setActiveTab('deliveries'); }}>
                      <FiTruck /> View In Transit
                    </button>
                    <button className="btn btn-outline" onClick={fetchStats}><FiRefreshCw /> Refresh Stats</button>
                  </div>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Today's Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Delivered Today</span>
                      <strong style={{ color: '#10b981' }}>{stats?.deliveredToday ?? '…'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>In Transit</span>
                      <strong style={{ color: '#8b5cf6' }}>{stats?.inTransit ?? '…'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Pending Pickup</span>
                      <strong style={{ color: '#f59e0b' }}>{(stats?.assigned ?? 0) + (stats?.pickedUp ?? 0)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* DELIVERIES */}
          {activeTab === 'deliveries' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2>My Deliveries</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    className="form-input admin-filter-select"
                    value={deliveryFilter}
                    onChange={e => setDeliveryFilter(e.target.value)}
                  >
                    <option value="">All Active</option>
                    <option value="assigned">Assigned</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <button className="btn btn-outline btn-sm" onClick={fetchDeliveries}><FiRefreshCw /></button>
                </div>
              </div>

              {deliveriesLoading ? (
                <div className="loading-state">Loading deliveries…</div>
              ) : deliveries.length === 0 ? (
                <div className="empty-state card">
                  <FiTruck size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                  <p>No deliveries {deliveryFilter ? `with status "${deliveryFilter.replace(/_/g, ' ')}"` : 'assigned to you yet'}.</p>
                </div>
              ) : (
                <div className="admin-table-wrap card">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Address</th>
                        <th>Print Details</th>
                        <th>Price</th>
                        <th>Delivery Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveries.map(order => (
                        <tr key={order._id}>
                          <td>
                            <div className="td-user">
                              <strong>{order.user?.name || '—'}</strong>
                              <small>{order.user?.phone || order.user?.email}</small>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                              <FiMapPin size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--text-secondary)' }} />
                              <small>{order.deliveryAddress || '—'}</small>
                            </div>
                          </td>
                          <td>
                            <small style={{ color: 'var(--text-secondary)' }}>
                              {order.printType === 'black-white' ? 'B&W' : 'Color'} · {order.paperSize} · {order.copies}x
                              <br />{order.fileName}
                            </small>
                          </td>
                          <td><strong>Rs. {order.totalPrice}</strong></td>
                          <td>
                            <span
                              className="status-badge"
                              style={{
                                color: DELIVERY_COLORS[order.deliveryStatus],
                                borderColor: DELIVERY_COLORS[order.deliveryStatus],
                                textTransform: 'capitalize',
                              }}
                            >
                              {order.deliveryStatus?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              className="icon-btn"
                              title="View details"
                              onClick={() => { setSelectedDelivery(order); setDeliveryNote(order.deliveryNotes || ''); }}
                            >
                              <FiMapPin />
                            </button>
                            {NEXT_DELIVERY[order.deliveryStatus] && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAdvanceStatus(order._id, NEXT_DELIVERY[order.deliveryStatus].status)}
                              >
                                {NEXT_DELIVERY[order.deliveryStatus].label}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Delivery detail modal */}
      {selectedDelivery && (
        <div className="modal-overlay" onClick={() => setSelectedDelivery(null)}>
          <motion.div
            className="modal-content card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="modal-title">Delivery Details</h2>
            <div className="modal-body">
              {[
                ['Customer', selectedDelivery.user?.name],
                ['Phone', selectedDelivery.user?.phone || '—'],
                ['Email', selectedDelivery.user?.email],
                ['Delivery Address', selectedDelivery.deliveryAddress],
                ['File', selectedDelivery.fileName],
                ['Print Type', selectedDelivery.printType === 'black-white' ? 'Black & White' : 'Color'],
                ['Paper Size', selectedDelivery.paperSize],
                ['Copies', selectedDelivery.copies],
                ['Total Price', `Rs. ${selectedDelivery.totalPrice}`],
                ['Order Status', selectedDelivery.status],
                ['Delivery Status', selectedDelivery.deliveryStatus?.replace(/_/g, ' ')],
                ['Order Date', new Date(selectedDelivery.createdAt).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="detail-row">
                  <span className="detail-label">{label}:</span>
                  <span
                    className="detail-value"
                    style={{ textTransform: ['Order Status', 'Delivery Status'].includes(label) ? 'capitalize' : undefined }}
                  >
                    {val}
                  </span>
                </div>
              ))}

              {NEXT_DELIVERY[selectedDelivery.deliveryStatus] && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                    Delivery Note (optional)
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Left at door, called customer…"
                    value={deliveryNote}
                    onChange={e => setDeliveryNote(e.target.value)}
                    style={{ width: '100%', resize: 'vertical', marginBottom: '0.75rem' }}
                  />
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => handleAdvanceStatus(selectedDelivery._id, NEXT_DELIVERY[selectedDelivery.deliveryStatus].status)}
                  >
                    {NEXT_DELIVERY[selectedDelivery.deliveryStatus].label}
                  </button>
                </div>
              )}
            </div>
            <button className="btn btn-outline btn-block" style={{ marginTop: '0.5rem' }} onClick={() => setSelectedDelivery(null)}>Close</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;

