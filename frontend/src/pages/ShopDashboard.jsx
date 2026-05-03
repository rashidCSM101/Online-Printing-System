import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiShoppingBag, FiCheckCircle, FiClock, FiLogOut,
  FiMenu, FiX, FiBarChart2, FiSun, FiMoon, FiUser, FiPrinter, FiRefreshCw, FiEye, FiTruck,
  FiDollarSign, FiSave, FiCalendar, FiDownload
} from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import '../pages/Dashboard.css';
import './AdminDashboard.css';

const STATUS_COLORS = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const NEXT_STATUS = {
  pending: 'processing',
  processing: 'completed',
};

const ShopDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Riders for assignment
  const [riders, setRiders] = useState([]);
  const [assigningRider, setAssigningRider] = useState('');

  // Pricing
  const defaultPricing = { blackWhiteNormal: 3, blackWhiteGlossy: 5, blackWhiteMatte: 5, colorNormal: 10, colorGlossy: 15, colorMatte: 15, bindingStaple: 10, bindingSpiral: 30 };
  const [pricing, setPricing] = useState(defaultPricing);
  const [pricingSaving, setPricingSaving] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/orders/shop/stats');
      setStats(data);
    } catch { /* silent */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params = { page: ordersPage, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await axios.get('/api/orders/all', { params });
      setOrders(data.orders);
      setOrdersTotal(data.total);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load orders');
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, statusFilter]);

  const fetchRiders = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/orders/riders/list');
      setRiders(data);
    } catch { /* silent */ }
  }, []);

  const fetchMyPricing = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/pricing/my');
      setPricing(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchStats(); fetchRiders(); fetchMyPricing(); }, [fetchStats, fetchRiders, fetchMyPricing]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleAssignRider = async (orderId) => {
    if (!assigningRider) return;
    try {
      const { data } = await axios.put(`/api/orders/${orderId}/assign-rider`, { riderId: assigningRider });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, rider: data.rider, deliveryStatus: data.deliveryStatus } : o));
      setSelectedOrder(prev => prev ? { ...prev, rider: data.rider, deliveryStatus: data.deliveryStatus } : null);
      setAssigningRider('');
      setSuccessMsg('Rider assigned successfully.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to assign rider');
    }
  };

  const handleAutoAssignRider = async (orderId) => {
    try {
      const { data } = await axios.put(`/api/orders/${orderId}/auto-assign-rider`);
      const updatedOrder = data.order;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updatedOrder : o)));
      if (selectedOrder?._id === orderId) setSelectedOrder(updatedOrder);
      setSuccessMsg(data.message || 'Rider auto-assigned successfully.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Auto-assign failed');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status: newStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      fetchStats();
      setSuccessMsg('Status updated.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update status');
    }
  };

  const handlePricingChange = (field, value) => {
    setPricing(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePricing = async () => {
    setPricingSaving(true);
    try {
      const { data } = await axios.put('/api/pricing/my', pricing);
      setPricing(data.pricing);
      setSuccessMsg('Pricing saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save pricing.');
    } finally {
      setPricingSaving(false);
    }
  };

  // ─── Earnings Report state ───────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [rptFrom, setRptFrom] = useState(firstOfMonth);
  const [rptTo, setRptTo] = useState(today);
  const [rptOrders, setRptOrders] = useState([]);
  const [rptLoading, setRptLoading] = useState(false);
  const [rptGenerated, setRptGenerated] = useState(false);

  const fetchEarningsReport = useCallback(async () => {
    setRptLoading(true);
    setRptGenerated(false);
    try {
      const { data } = await axios.get('/api/orders/all', { params: { limit: 1000 } });
      const allOrders = data.orders || data;
      const from = new Date(rptFrom);
      const to = new Date(rptTo); to.setHours(23, 59, 59, 999);
      const filtered = allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= from && d <= to;
      });
      setRptOrders(filtered);
      setRptGenerated(true);
    } catch { /* silent */ } finally {
      setRptLoading(false);
    }
  }, [rptFrom, rptTo]);

  const downloadEarningsCSV = () => {
    const headers = ['Order ID', 'Customer', 'Status', 'Total (Rs.)', 'Date'];
    const rows = rptOrders.map(o => [
      o._id,
      o.user?.name || '—',
      o.status,
      o.totalPrice,
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `earnings-${rptFrom}-to-${rptTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = stats ? [
    { label: 'Pending Orders', value: stats.pending, icon: <FiClock />, color: '#f59e0b' },
    { label: 'Processing', value: stats.processing, icon: <FiPrinter />, color: '#3b82f6' },
    { label: 'Completed Today', value: stats.completedToday, icon: <FiCheckCircle />, color: '#10b981' },
    { label: "Today's Revenue", value: `Rs. ${stats.todayRevenue?.toLocaleString()}`, icon: <FiBarChart2 />, color: '#8b5cf6' },
  ] : [
    { label: 'Pending Orders', value: '…', icon: <FiClock />, color: '#f59e0b' },
    { label: 'Processing', value: '…', icon: <FiPrinter />, color: '#3b82f6' },
    { label: 'Completed Today', value: '…', icon: <FiCheckCircle />, color: '#10b981' },
    { label: "Today's Revenue", value: '…', icon: <FiBarChart2 />, color: '#8b5cf6' },
  ];

  const totalOrderPages = Math.ceil(ordersTotal / 15);

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Printsy Shop</h2>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><FiX /></button>
        </div>
        <nav className="sidebar-nav">
          <span className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}><FiBarChart2 /> Overview</span>
          <span className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => { setActiveTab('queue'); setSidebarOpen(false); }}><FiShoppingBag /> Order Queue</span>
          <span className={`nav-item ${activeTab === 'pricing' ? 'active' : ''}`} onClick={() => { setActiveTab('pricing'); setSidebarOpen(false); }}><FiDollarSign /> Set Prices</span>
          <span className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => { setActiveTab('earnings'); setSidebarOpen(false); }}><FiCalendar /> Earnings Report</span>
          <div className="nav-divider"></div>
          <button className="nav-item nav-logout" onClick={handleLogout}><FiLogOut /> Logout</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar"><FiUser /></div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-email">Shop Owner</p>
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
              {['overview', 'queue', 'pricing', 'earnings'].map(tab => (
                <button key={tab} className={`admin-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'queue' ? 'Order Queue' : tab === 'pricing' ? 'Set Prices' : tab === 'earnings' ? 'Earnings' : 'Overview'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <NotificationBell />
            <button className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</button>
          </div>
        </header>

        <div className="dashboard-content" style={{ padding: '2rem' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}<button onClick={() => setError('')} style={{ marginLeft: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button></div>}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="stats-grid">
                {statCards.map((stat, i) => (
                  <motion.div key={i} className="stat-card card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
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
                    <button className="btn btn-primary" onClick={() => { setStatusFilter('pending'); setActiveTab('queue'); }}><FiClock /> View Pending Orders</button>
                    <button className="btn btn-outline" onClick={() => { setStatusFilter('processing'); setActiveTab('queue'); }}><FiPrinter /> View Processing</button>
                    <button className="btn btn-outline" onClick={fetchStats}><FiRefreshCw /> Refresh Stats</button>
                  </div>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Today's Summary</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Completed Today</span>
                      <strong style={{ color: '#10b981' }}>{stats?.completedToday ?? '…'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Revenue Today</span>
                      <strong style={{ color: '#8b5cf6' }}>Rs. {stats?.todayRevenue?.toLocaleString() ?? '…'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>In Queue</span>
                      <strong style={{ color: '#f59e0b' }}>{(stats?.pending ?? 0) + (stats?.processing ?? 0)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ORDER QUEUE */}
          {activeTab === 'queue' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2>Order Queue <span className="count-badge">{ordersTotal}</span></h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select className="form-input admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOrdersPage(1); }}>
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button className="btn btn-outline btn-sm" onClick={fetchOrders}><FiRefreshCw /></button>
                </div>
              </div>

              {ordersLoading ? (
                <div className="loading-state">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="empty-state card"><p>No orders in this category.</p></div>
              ) : (
                <>
                  <div className="admin-table-wrap card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>File</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order._id}>
                            <td>
                              <div className="td-user">
                                <strong>{order.user?.name || '—'}</strong>
                                <small>{order.user?.email}</small>
                              </div>
                            </td>
                            <td className="td-file">{order.fileName}</td>
                            <td><strong>Rs. {order.totalPrice}</strong></td>
                            <td>
                              <span className="status-badge" style={{ color: STATUS_COLORS[order.status], borderColor: STATUS_COLORS[order.status] }}>
                                {order.status}
                              </span>
                            </td>
                            <td><small>{new Date(order.createdAt).toLocaleDateString()}</small></td>
                            <td style={{ display: 'flex', gap: '0.4rem' }}>
                              <button className="icon-btn" title="View details" onClick={() => setSelectedOrder(order)}><FiEye /></button>
                              {!order.rider && order.status === 'completed' && (
                                <button className="btn btn-outline btn-sm" onClick={() => handleAutoAssignRider(order._id)}>
                                  Auto Assign
                                </button>
                              )}
                              {NEXT_STATUS[order.status] && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleStatusChange(order._id, NEXT_STATUS[order.status])}
                                >
                                  → {NEXT_STATUS[order.status]}
                                </button>
                              )}
                              {order.status === 'pending' && (
                                <button className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleStatusChange(order._id, 'cancelled')}>Cancel</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button className="btn btn-outline btn-sm" disabled={ordersPage === 1} onClick={() => setOrdersPage(p => p - 1)}>← Prev</button>
                    <span>Page {ordersPage} of {totalOrderPages || 1}</span>
                    <button className="btn btn-outline btn-sm" disabled={ordersPage >= totalOrderPages} onClick={() => setOrdersPage(p => p + 1)}>Next →</button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* PRICING TAB */}
          {activeTab === 'pricing' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2><FiDollarSign /> Set Print Prices</h2>
              </div>
              <div className="card" style={{ padding: '2rem', maxWidth: 600 }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.92rem' }}>
                  Set per-page prices (in Rs.) for each print type and paper combination. These prices are used to calculate customer order totals.
                </p>
                <h4 style={{ marginBottom: '0.75rem' }}>Black &amp; White Printing</h4>
                {[
                  { label: 'Normal Paper (per page)', field: 'blackWhiteNormal' },
                  { label: 'Glossy Paper (per page)', field: 'blackWhiteGlossy' },
                  { label: 'Matte Paper (per page)', field: 'blackWhiteMatte' },
                ].map(({ label, field }) => (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <label style={{ color: 'var(--text-secondary)', minWidth: 220 }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rs.</span>
                      <input type="number" min="0" step="0.5" className="form-input" style={{ width: 90 }}
                        value={pricing[field] ?? ''} onChange={e => handlePricingChange(field, e.target.value)} />
                    </div>
                  </div>
                ))}
                <h4 style={{ margin: '1.25rem 0 0.75rem' }}>Color Printing</h4>
                {[
                  { label: 'Normal Paper (per page)', field: 'colorNormal' },
                  { label: 'Glossy Paper (per page)', field: 'colorGlossy' },
                  { label: 'Matte Paper (per page)', field: 'colorMatte' },
                ].map(({ label, field }) => (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <label style={{ color: 'var(--text-secondary)', minWidth: 220 }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rs.</span>
                      <input type="number" min="0" step="0.5" className="form-input" style={{ width: 90 }}
                        value={pricing[field] ?? ''} onChange={e => handlePricingChange(field, e.target.value)} />
                    </div>
                  </div>
                ))}
                <h4 style={{ margin: '1.25rem 0 0.75rem' }}>Binding Surcharges (per order)</h4>
                {[
                  { label: 'Staple Binding', field: 'bindingStaple' },
                  { label: 'Spiral Binding', field: 'bindingSpiral' },
                ].map(({ label, field }) => (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                    <label style={{ color: 'var(--text-secondary)', minWidth: 220 }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Rs.</span>
                      <input type="number" min="0" step="1" className="form-input" style={{ width: 90 }}
                        value={pricing[field] ?? ''} onChange={e => handlePricingChange(field, e.target.value)} />
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={handleSavePricing} disabled={pricingSaving}>
                  <FiSave /> {pricingSaving ? 'Saving…' : 'Save Prices'}
                </button>
              </div>
            </motion.div>
          )}

          {/* EARNINGS REPORT TAB */}
          {activeTab === 'earnings' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2><FiCalendar /> Earnings Report</h2>
              </div>
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">From</label>
                  <input type="date" className="form-input" value={rptFrom} max={rptTo} onChange={e => setRptFrom(e.target.value)} style={{ width: 170 }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">To</label>
                  <input type="date" className="form-input" value={rptTo} min={rptFrom} onChange={e => setRptTo(e.target.value)} style={{ width: 170 }} />
                </div>
                <button className="btn btn-primary" onClick={fetchEarningsReport} disabled={rptLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiBarChart2 /> {rptLoading ? 'Loading…' : 'Generate Report'}
                </button>
                {rptGenerated && rptOrders.length > 0 && (
                  <button className="btn btn-outline" onClick={downloadEarningsCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiDownload /> Export CSV
                  </button>
                )}
              </div>
              {rptGenerated && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    {(() => {
                      const completed = rptOrders.filter(o => o.status === 'completed');
                      const revenue = completed.reduce((s, o) => s + (o.totalPrice || 0), 0);
                      return [
                        { label: 'Total Orders', value: rptOrders.length, icon: <FiShoppingBag /> },
                        { label: 'Completed', value: completed.length, icon: <FiCheckCircle /> },
                        { label: 'Pending / Processing', value: rptOrders.filter(o => ['pending','processing'].includes(o.status)).length, icon: <FiClock /> },
                        { label: 'Earnings (Rs.)', value: revenue.toLocaleString(), icon: <FiBarChart2 /> },
                      ].map((s, i) => (
                        <motion.div key={i} className="stat-card card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                          <div className="stat-icon">{s.icon}</div>
                          <div className="stat-info">
                            <p className="stat-label">{s.label}</p>
                            <h3 className="stat-value">{s.value}</h3>
                          </div>
                        </motion.div>
                      ));
                    })()}
                  </div>
                  {rptOrders.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders in this date range.</div>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                      <table className="users-table">
                        <thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Total (Rs.)</th><th>Date</th></tr></thead>
                        <tbody>
                          {rptOrders.map(o => (
                            <tr key={o._id}>
                              <td><code style={{ fontSize: '0.8rem' }}>{o._id.slice(-8)}</code></td>
                              <td>{o.user?.name || '—'}</td>
                              <td><span style={{ background: ({ pending:'#f59e0b',processing:'#3b82f6',completed:'#10b981',cancelled:'#ef4444' }[o.status]||'#888')+'22', color: ({ pending:'#f59e0b',processing:'#3b82f6',completed:'#10b981',cancelled:'#ef4444' }[o.status]||'#888'), padding:'2px 10px', borderRadius:99, fontWeight:600, fontSize:'0.82rem' }}>{o.status}</span></td>
                              <td>{(o.totalPrice || 0).toLocaleString()}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <motion.div className="modal-content card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Order Details</h2>
            <div className="modal-body">
              {[
                ['Customer', selectedOrder.user?.name],
                ['File', selectedOrder.fileName],
                ['Delivery Address', selectedOrder.deliveryAddress],
                ['Total Price', `Rs. ${selectedOrder.totalPrice}`],
                ['Status', selectedOrder.status],
                ['Delivery Status', selectedOrder.deliveryStatus?.replace(/_/g, ' ') || 'not assigned'],
                ['Assigned Rider', selectedOrder.rider?.name || 'None'],
              ].map(([label, val]) => (
                <div key={label} className="detail-row">
                  <span className="detail-label">{label}:</span>
                  <span className="detail-value" style={{ textTransform: ['Status', 'Delivery Status'].includes(label) ? 'capitalize' : undefined }}>{val}</span>
                </div>
              ))}

              {selectedOrder.status === 'completed' && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FiTruck /> Assign Rider</p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      className="form-input"
                      value={assigningRider}
                      onChange={e => setAssigningRider(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— Select rider —</option>
                      {riders.map(r => (
                        <option key={r._id} value={r._id}>{r.name} ({r.phone || r.email})</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={!assigningRider}
                      onClick={() => handleAssignRider(selectedOrder._id)}
                    >
                      Assign
                    </button>
                    {!selectedOrder.rider && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleAutoAssignRider(selectedOrder._id)}
                      >
                        Auto Assign
                      </button>
                    )}
                  </div>
                  {riders.length === 0 && <small style={{ color: 'var(--text-secondary)' }}>No riders registered yet.</small>}
                </div>
              )}
            </div>
            {NEXT_STATUS[selectedOrder.status] && (
              <button className="btn btn-primary btn-block" style={{ marginBottom: '0.5rem' }} onClick={() => { handleStatusChange(selectedOrder._id, NEXT_STATUS[selectedOrder.status]); setSelectedOrder(null); }}>
                Mark as {NEXT_STATUS[selectedOrder.status]}
              </button>
            )}
            <button className="btn btn-outline btn-block" onClick={() => setSelectedOrder(null)}>Close</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ShopDashboard;
