import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiUsers, FiShoppingBag, FiLogOut, FiMenu, FiX,
  FiBarChart2, FiSun, FiMoon, FiUser, FiTrash2, FiEdit2, FiRefreshCw, FiTruck, FiAlertTriangle,
  FiCheckCircle, FiSlash, FiCalendar, FiDownload
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

const ROLE_LABELS = { customer: 'Customer', shop_owner: 'Shop Owner', admin: 'Admin', rider: 'Rider' };

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Stats
  const [stats, setStats] = useState(null);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Riders for assignment
  const [riders, setRiders] = useState([]);
  const [assigningRider, setAssigningRider] = useState('');
  const [assignableShops, setAssignableShops] = useState([]);
  const [selectedShopOwner, setSelectedShopOwner] = useState('');

  // Auto-delete
  const [autoDeleting, setAutoDeleting] = useState(false);
  const [autoDeleteResult, setAutoDeleteResult] = useState(null);

  // Shop approvals
  const [shopOwners, setShopOwners] = useState([]);
  const [shopOwnersLoading, setShopOwnersLoading] = useState(false);
  const [shopFilter, setShopFilter] = useState('pending');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogout = () => { logout(); navigate('/'); };

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/orders/admin/stats');
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

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = { page: usersPage, limit: 15 };
      if (roleFilter) params.role = roleFilter;
      const { data } = await axios.get('/api/auth/admin/users', { params });
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, roleFilter]);

  const fetchRiders = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/orders/riders/list');
      setRiders(data);
    } catch { /* silent */ }
  }, []);

  const fetchAssignableShops = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/auth/admin/users', {
        params: { role: 'shop_owner', limit: 200 },
      });
      const approved = (data.users || []).filter((user) => user.shopStatus === 'approved');
      setAssignableShops(approved);
    } catch {
      // Silent fail to avoid blocking admin dashboard.
    }
  }, []);

  const fetchShopOwners = useCallback(async () => {
    setShopOwnersLoading(true);
    try {
      const params = { role: 'shop_owner', limit: 100 };
      const { data } = await axios.get('/api/auth/admin/users', { params });
      setShopOwners(data.users);
    } catch { /* silent */ } finally {
      setShopOwnersLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); fetchRiders(); fetchAssignableShops(); }, [fetchStats, fetchRiders, fetchAssignableShops]);
  useEffect(() => { if (activeTab === 'orders') fetchOrders(); }, [activeTab, fetchOrders]);
  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, fetchUsers]);
  useEffect(() => { if (activeTab === 'shops') fetchShopOwners(); }, [activeTab, fetchShopOwners]);
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedShopOwner('');
      return;
    }
    setSelectedShopOwner(selectedOrder.shopOwner?._id || '');
  }, [selectedOrder]);

  // ─── Reports state ────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [reportFrom, setReportFrom] = useState(firstOfMonth);
  const [reportTo, setReportTo] = useState(today);
  const [reportOrders, setReportOrders] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setReportGenerated(false);
    try {
      const { data } = await axios.get('/api/orders/all', { params: { limit: 1000 } });
      const allOrders = data.orders || data;
      const from = new Date(reportFrom);
      const to = new Date(reportTo); to.setHours(23, 59, 59, 999);
      const filtered = allOrders.filter(o => {
        const d = new Date(o.createdAt);
        return d >= from && d <= to;
      });
      setReportOrders(filtered);
      setReportGenerated(true);
    } catch { /* silent */ } finally {
      setReportLoading(false);
    }
  }, [reportFrom, reportTo]);

  const downloadReportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Status', 'Print Type', 'Copies', 'Total Price (Rs.)', 'Date'];
    const rows = reportOrders.map(o => [
      o._id,
      o.user?.name || '—',
      o.status,
      o.printType,
      o.copies,
      o.totalPrice,
      new Date(o.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `printsy-report-${reportFrom}-to-${reportTo}.csv`; a.click();
    URL.revokeObjectURL(url);
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

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/auth/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      fetchStats();
      setSuccessMsg('Role updated.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update role');
    }
  };

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

  const handleAssignShop = async (orderId) => {
    if (!selectedShopOwner) return;
    try {
      const { data } = await axios.put(`/api/orders/${orderId}/assign-shop`, { shopOwnerId: selectedShopOwner });
      const updatedOrder = data.order;
      setOrders((prev) => prev.map((order) => (order._id === orderId ? updatedOrder : order)));
      if (selectedOrder?._id === orderId) setSelectedOrder(updatedOrder);
      setSuccessMsg(data.message || 'Shop assigned successfully.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to assign shop.');
    }
  };

  const handleAutoAssignShop = async (orderId) => {
    try {
      const { data } = await axios.put(`/api/orders/${orderId}/auto-assign-shop`);
      const updatedOrder = data.order;
      setOrders((prev) => prev.map((order) => (order._id === orderId ? updatedOrder : order)));
      if (selectedOrder?._id === orderId) setSelectedOrder(updatedOrder);
      setSuccessMsg(data.message || 'Shop auto-assigned successfully.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to auto-assign shop.');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/auth/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      setUsersTotal(t => t - 1);
      fetchStats();
      setSuccessMsg('User deleted.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleAutoDelete = async () => {
    if (!window.confirm('Run auto-delete now? This will permanently remove all completed/cancelled orders older than the configured retention period (default 30 days), along with their uploaded files.')) return;
    setAutoDeleting(true);
    setAutoDeleteResult(null);
    try {
      const { data } = await axios.post('/api/admin/auto-delete');
      setAutoDeleteResult({ type: 'success', message: data.message });
      fetchStats();
      if (activeTab === 'orders') fetchOrders();
    } catch (e) {
      setAutoDeleteResult({ type: 'error', message: e.response?.data?.message || 'Auto-delete failed.' });
    } finally {
      setAutoDeleting(false);
    }
  };

  const handleApproveShop = async (userId) => {
    try {
      const { data } = await axios.put(`/api/auth/admin/shops/${userId}/approve`);
      setShopOwners(prev => prev.map(u => u._id === userId ? { ...u, shopStatus: 'approved' } : u));
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to approve shop.');
    }
  };

  const handleDisableShop = async (userId) => {
    if (!window.confirm('Disable this shop owner? They will no longer be able to log in.')) return;
    try {
      const { data } = await axios.put(`/api/auth/admin/shops/${userId}/disable`);
      setShopOwners(prev => prev.map(u => u._id === userId ? { ...u, shopStatus: 'disabled' } : u));
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to disable shop.');
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers />, color: '#3b82f6' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag />, color: '#8b5cf6' },
    { label: 'Shop Owners', value: stats.shopOwners, icon: <FiUser />, color: '#f59e0b' },
    { label: 'Total Revenue', value: `Rs. ${stats.totalRevenue?.toLocaleString()}`, icon: <FiBarChart2 />, color: '#10b981' },
  ] : [
    { label: 'Total Users', value: '…', icon: <FiUsers />, color: '#3b82f6' },
    { label: 'Total Orders', value: '…', icon: <FiShoppingBag />, color: '#8b5cf6' },
    { label: 'Shop Owners', value: '…', icon: <FiUser />, color: '#f59e0b' },
    { label: 'Total Revenue', value: '…', icon: <FiBarChart2 />, color: '#10b981' },
  ];

  const totalOrderPages = Math.ceil(ordersTotal / 15);
  const totalUserPages = Math.ceil(usersTotal / 15);

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Printsy Admin</h2>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><FiX /></button>
        </div>
        <nav className="sidebar-nav">
          <span className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}><FiBarChart2 /> Overview</span>
          <span className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setSidebarOpen(false); }}><FiShoppingBag /> All Orders</span>
          <span className={`nav-item ${activeTab === 'shops' ? 'active' : ''}`} onClick={() => { setActiveTab('shops'); setSidebarOpen(false); }}><FiCheckCircle /> Shop Approvals</span>
          <span className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}><FiUsers /> Manage Users</span>
          <span className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }}><FiCalendar /> Reports</span>
          <div className="nav-divider"></div>
          <button className="nav-item nav-logout" onClick={handleLogout}><FiLogOut /> Logout</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar"><FiUser /></div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-email">Admin</p>
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
              {['overview', 'orders', 'shops', 'users', 'reports'].map(tab => (
                <button key={tab} className={`admin-tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'shops' ? 'Shop Approvals' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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

          {/* OVERVIEW TAB */}
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
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiShoppingBag /> Quick Actions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('orders')}><FiShoppingBag /> View All Orders</button>
                    <button className="btn btn-outline" onClick={() => setActiveTab('users')}><FiUsers /> Manage Users</button>
                    <button className="btn btn-outline" onClick={fetchStats}><FiRefreshCw /> Refresh Stats</button>
                  </div>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiBarChart2 /> Today</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Orders Today</span>
                      <strong>{stats?.todayOrders ?? '…'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Revenue</span>
                      <strong style={{ color: '#10b981' }}>Rs. {stats?.totalRevenue?.toLocaleString() ?? '…'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-Delete Card */}
              <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiTrash2 style={{ color: '#ef4444' }} /> Auto-Delete Old Orders
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Automatically runs every day at 2:00 AM. Permanently deletes <strong>completed</strong> and <strong>cancelled</strong> orders (and their uploaded files) older than the configured retention period (default: 30 days). You can also trigger it manually below.
                </p>
                {autoDeleteResult && (
                  <div
                    className={autoDeleteResult.type === 'success' ? 'alert alert-success' : 'alert alert-error'}
                    style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <FiAlertTriangle />
                    {autoDeleteResult.message}
                    <button onClick={() => setAutoDeleteResult(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
                  </div>
                )}
                <button
                  className="btn"
                  style={{ background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={handleAutoDelete}
                  disabled={autoDeleting}
                >
                  <FiTrash2 /> {autoDeleting ? 'Running…' : 'Run Auto-Delete Now'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2>All Orders <span className="count-badge">{ordersTotal}</span></h2>
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
                <div className="empty-state card"><p>No orders found.</p></div>
              ) : (
                <>
                  <div className="admin-table-wrap card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>File</th>
                          <th>Options</th>
                          <th>Price</th>
                          <th>Assigned Shop</th>
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
                            <td>
                              <small style={{ color: 'var(--text-secondary)' }}>
                                {order.printType === 'black-white' ? 'B&W' : 'Color'} · {order.paperSize} · {order.copies}x · {order.printSides}
                                {order.binding !== 'none' ? ` · ${order.binding}` : ''}
                              </small>
                            </td>
                            <td><strong>Rs. {order.totalPrice}</strong></td>
                            <td>
                              <small>
                                {order.shopOwner?.shopName || order.shopOwner?.name || 'Unassigned'}
                              </small>
                            </td>
                            <td>
                              <select
                                className="status-select"
                                value={order.status}
                                style={{ color: STATUS_COLORS[order.status] }}
                                onChange={e => handleStatusChange(order._id, e.target.value)}
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td><small>{new Date(order.createdAt).toLocaleDateString()}</small></td>
                            <td>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ marginRight: '0.35rem' }}
                                onClick={() => handleAutoAssignShop(order._id)}
                              >
                                Auto Shop
                              </button>
                              {!order.rider && order.status === 'completed' && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ marginRight: '0.35rem' }}
                                  onClick={() => handleAutoAssignRider(order._id)}
                                >
                                  Auto Assign
                                </button>
                              )}
                              <button className="icon-btn" title="View" onClick={() => setSelectedOrder(order)}><FiEdit2 /></button>
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

          {/* SHOP APPROVALS TAB */}
          {activeTab === 'shops' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2>Shop Owner Applications</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select className="form-input admin-filter-select" value={shopFilter} onChange={e => setShopFilter(e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="disabled">Disabled</option>
                    <option value="">All</option>
                  </select>
                  <button className="btn btn-outline btn-sm" onClick={fetchShopOwners}><FiRefreshCw /></button>
                </div>
              </div>
              {shopOwnersLoading ? (
                <div className="loading-state">Loading shop owners…</div>
              ) : (
                (() => {
                  const filtered = shopOwners.filter(u => shopFilter ? u.shopStatus === shopFilter : true);
                  return filtered.length === 0 ? (
                    <div className="empty-state card"><p>No shop owners found.</p></div>
                  ) : (
                    <div className="admin-table-wrap card">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Shop Name</th>
                            <th>Shop Address</th>
                            <th>Status</th>
                            <th>Registered</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(s => (
                            <tr key={s._id}>
                              <td>{s.name}</td>
                              <td>{s.email}</td>
                              <td>{s.shopName || '—'}</td>
                              <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.shopAddress || '—'}</td>
                              <td>
                                <span className={`status-badge ${s.shopStatus === 'approved' ? 'completed' : s.shopStatus === 'disabled' ? 'cancelled' : 'pending'}`}>
                                  {s.shopStatus}
                                </span>
                              </td>
                              <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  {s.shopStatus !== 'approved' && (
                                    <button className="btn btn-sm" style={{ background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                      onClick={() => handleApproveShop(s._id)}>
                                      <FiCheckCircle /> Approve
                                    </button>
                                  )}
                                  {s.shopStatus !== 'disabled' && (
                                    <button className="btn btn-sm" style={{ background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                      onClick={() => handleDisableShop(s._id)}>
                                      <FiSlash /> Disable
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2>All Users <span className="count-badge">{usersTotal}</span></h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select className="form-input admin-filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setUsersPage(1); }}>
                    <option value="">All Roles</option>
                    <option value="customer">Customer</option>
                    <option value="shop_owner">Shop Owner</option>
                    <option value="rider">Rider</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn btn-outline btn-sm" onClick={fetchUsers}><FiRefreshCw /></button>
                </div>
              </div>

              {usersLoading ? (
                <div className="loading-state">Loading users…</div>
              ) : users.length === 0 ? (
                <div className="empty-state card"><p>No users found.</p></div>
              ) : (
                <>
                  <div className="admin-table-wrap card">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Role</th>
                          <th>Joined</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u._id}>
                            <td><strong>{u.name}</strong></td>
                            <td>{u.email}</td>
                            <td>{u.phone || '—'}</td>
                            <td>
                              <select
                                className="role-select"
                                value={u.role}
                                disabled={u._id === user?._id}
                                onChange={e => handleRoleChange(u._id, e.target.value)}
                              >
                                <option value="customer">Customer</option>
                                <option value="shop_owner">Shop Owner</option>
                                <option value="rider">Rider</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td><small>{new Date(u.createdAt).toLocaleDateString()}</small></td>
                            <td>
                              <button
                                className="icon-btn danger"
                                title="Delete user"
                                disabled={u._id === user?._id}
                                onClick={() => handleDeleteUser(u._id, u.name)}
                              >
                                <FiTrash2 />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button className="btn btn-outline btn-sm" disabled={usersPage === 1} onClick={() => setUsersPage(p => p - 1)}>← Prev</button>
                    <span>Page {usersPage} of {totalUserPages || 1}</span>
                    <button className="btn btn-outline btn-sm" disabled={usersPage >= totalUserPages} onClick={() => setUsersPage(p => p + 1)}>Next →</button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="admin-toolbar">
                <h2><FiCalendar /> Date-Range Report</h2>
              </div>
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1.5rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">From</label>
                  <input type="date" className="form-input" value={reportFrom} max={reportTo} onChange={e => setReportFrom(e.target.value)} style={{ width: 170 }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">To</label>
                  <input type="date" className="form-input" value={reportTo} min={reportFrom} onChange={e => setReportTo(e.target.value)} style={{ width: 170 }} />
                </div>
                <button className="btn btn-primary" onClick={fetchReport} disabled={reportLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiBarChart2 /> {reportLoading ? 'Generating…' : 'Generate Report'}
                </button>
                {reportGenerated && reportOrders.length > 0 && (
                  <button className="btn btn-outline" onClick={downloadReportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiDownload /> Export CSV
                  </button>
                )}
              </div>
              {reportGenerated && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    {(() => {
                      const completed = reportOrders.filter(o => o.status === 'completed');
                      const revenue = completed.reduce((s, o) => s + (o.totalPrice || 0), 0);
                      const cancelled = reportOrders.filter(o => o.status === 'cancelled').length;
                      return [
                        { label: 'Total Orders', value: reportOrders.length, icon: <FiShoppingBag /> },
                        { label: 'Completed', value: completed.length, icon: <FiCheckCircle /> },
                        { label: 'Cancelled', value: cancelled, icon: <FiSlash /> },
                        { label: 'Total Revenue (Rs.)', value: revenue.toLocaleString(), icon: <FiBarChart2 /> },
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
                  {reportOrders.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No orders in this date range.</div>
                  ) : (
                    <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                      <table className="users-table">
                        <thead><tr><th>Order ID</th><th>Customer</th><th>Print Type</th><th>Copies</th><th>Status</th><th>Total (Rs.)</th><th>Date</th></tr></thead>
                        <tbody>
                          {reportOrders.map(o => (
                            <tr key={o._id}>
                              <td><code style={{ fontSize: '0.8rem' }}>{o._id.slice(-8)}</code></td>
                              <td>{o.user?.name || '—'}</td>
                              <td style={{ textTransform: 'capitalize' }}>{o.printType}</td>
                              <td>{o.copies}</td>
                              <td><span style={{ background: (STATUS_COLORS[o.status]||'#888')+'22', color: STATUS_COLORS[o.status]||'#888', padding:'2px 10px', borderRadius:99, fontWeight:600, fontSize:'0.82rem' }}>{o.status}</span></td>
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
                ['Email', selectedOrder.user?.email],
                ['File', selectedOrder.fileName],
                ['Print Type', selectedOrder.printType === 'black-white' ? 'Black & White' : 'Color'],
                ['Paper Size', selectedOrder.paperSize],
                ['Copies', selectedOrder.copies],
                ['Print Sides', selectedOrder.printSides],
                ['Orientation', selectedOrder.orientation],
                ['Paper Type', selectedOrder.paperType],
                ['Binding', selectedOrder.binding],
                ['Delivery Address', selectedOrder.deliveryAddress],
                ['Total Price', `Rs. ${selectedOrder.totalPrice}`],
                ['Status', selectedOrder.status],
                ['Assigned Shop', selectedOrder.shopOwner?.shopName || selectedOrder.shopOwner?.name || 'Unassigned'],
                ['Assignment Mode', selectedOrder.shopAssignmentMethod || 'none'],
                ['Delivery Status', selectedOrder.deliveryStatus?.replace(/_/g, ' ') || 'not assigned'],
                ['Assigned Rider', selectedOrder.rider?.name || 'None'],
                ['Placed On', new Date(selectedOrder.createdAt).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="detail-row">
                  <span className="detail-label">{label}:</span>
                  <span className="detail-value" style={{ textTransform: ['Orientation','Paper Type','Binding','Status','Delivery Status'].includes(label) ? 'capitalize' : undefined }}>{val}</span>
                </div>
              ))}

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FiShoppingBag /> Assign Shop
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select
                    className="form-input"
                    value={selectedShopOwner}
                    onChange={(e) => setSelectedShopOwner(e.target.value)}
                    style={{ flex: 1, minWidth: 220 }}
                  >
                    <option value="">— Select shop —</option>
                    {assignableShops.map((shop) => (
                      <option key={shop._id} value={shop._id}>
                        {shop.shopName || shop.name} ({shop.shopAddress || shop.email})
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!selectedShopOwner}
                    onClick={() => handleAssignShop(selectedOrder._id)}
                  >
                    Assign Shop
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleAutoAssignShop(selectedOrder._id)}
                  >
                    Auto by Location
                  </button>
                </div>
                {assignableShops.length === 0 && (
                  <small style={{ color: 'var(--text-secondary)' }}>No approved shops available.</small>
                )}
              </div>

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
            <button className="btn btn-primary btn-block" onClick={() => setSelectedOrder(null)}>Close</button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

