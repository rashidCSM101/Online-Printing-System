import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiPackage, FiClock, FiCheckCircle, FiXCircle, FiEye,
  FiMenu, FiX, FiHome, FiShoppingBag, FiUpload, FiLogOut, FiUser,
  FiSun, FiMoon, FiSlash, FiCreditCard, FiDownload
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from '../components/NotificationBell';
import './OrderHistory.css';

const OrderHistory = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [payMethod, setPayMethod] = useState('cod');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders/my-orders');
      setOrders(response.data);
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? This cannot be undone.')) return;
    setCancellingId(orderId);
    try {
      await axios.put(`/api/orders/${orderId}/cancel`);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'cancelled' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePayOrder = async (orderId) => {
    setPayingId(orderId);
    try {
      const { data } = await axios.put(`/api/orders/${orderId}/pay`, { paymentMethod: payMethod });
      const updatedOrder = data.order;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updatedOrder : o)));
      if (selectedOrder?._id === orderId) setSelectedOrder(updatedOrder);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  const handleDownloadFile = async (orderId, fileName) => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'order-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'File download failed.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="status-icon completed" />;
      case 'processing':
        return <FiClock className="status-icon processing" />;
      case 'cancelled':
        return <FiXCircle className="status-icon cancelled" />;
      default:
        return <FiPackage className="status-icon pending" />;
    }
  };

  const getStatusClass = (status) => {
    return `status-badge ${status}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="order-history">
            <div className="container">
              <div className="loading">Loading orders...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">PrintHub</h2>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <FiX />
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item">
            <FiHome /> Dashboard
          </Link>
          <Link to="/orders" className="nav-item active">
            <FiShoppingBag /> My Orders
          </Link>
          <Link to="/dashboard#upload" className="nav-item">
            <FiUpload /> New Order
          </Link>
          <div className="nav-divider"></div>
          <button className="nav-item nav-logout" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <FiUser />
            </div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="order-history">
          <div className="container">
            <motion.div
              className="page-header"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="header-left">
                <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                  <FiMenu />
                </button>
                <div>
                  <h1 className="page-title">Order History</h1>
                  <p className="page-subtitle">Track and manage all your printing orders</p>
                </div>
              </div>
              <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'light' ? <FiMoon size={22} /> : <FiSun size={22} />}
              </button>
              <NotificationBell />
            </motion.div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {orders.length === 0 ? (
          <motion.div
            className="empty-state card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FiPackage size={64} />
            <h2>No Orders Yet</h2>
            <p>You haven't placed any orders yet. Start by uploading a document!</p>
          </motion.div>
        ) : (
          <div className="orders-grid">
            {orders.map((order, index) => (
              <motion.div
                key={order._id}
                className="order-card card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="order-header">
                  <div className="order-info">
                    <h3 className="order-title">
                      {order.fileName}
                      {order.converted && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', borderRadius: '12px', padding: '2px 8px', fontWeight: 600, verticalAlign: 'middle' }}>PDF</span>
                      )}
                    </h3>
                    <span className="order-date">{formatDate(order.createdAt)}</span>
                  </div>
                  {getStatusIcon(order.status)}
                </div>

                <div className="order-details">
                  <div className="detail-row">
                    <span className="detail-label">Print Type:</span>
                    <span className="detail-value">
                      {order.printType === 'black-white' ? 'Black & White' : 'Color'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Paper Size:</span>
                    <span className="detail-value">{order.paperSize}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Copies:</span>
                    <span className="detail-value">{order.copies}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Print Sides:</span>
                    <span className="detail-value">
                      {order.printSides === 'single' ? 'Single Side' : 'Double Side'}
                    </span>
                  </div>
                  {order.orientation && (
                    <div className="detail-row">
                      <span className="detail-label">Orientation:</span>
                      <span className="detail-value" style={{ textTransform: 'capitalize' }}>{order.orientation}</span>
                    </div>
                  )}
                  {order.paperType && order.paperType !== 'normal' && (
                    <div className="detail-row">
                      <span className="detail-label">Paper Type:</span>
                      <span className="detail-value" style={{ textTransform: 'capitalize' }}>{order.paperType}</span>
                    </div>
                  )}
                  {order.binding && order.binding !== 'none' && (
                    <div className="detail-row">
                      <span className="detail-label">Binding:</span>
                      <span className="detail-value" style={{ textTransform: 'capitalize' }}>{order.binding}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Delivery:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                      {(order.deliveryStatus || 'not_assigned').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Payment:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                      {order.paymentStatus || 'unpaid'} ({(order.paymentMethod || 'cod').replace(/_/g, ' ')})
                    </span>
                  </div>
                </div>

                <div className="order-footer">
                  <div className={getStatusClass(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </div>
                  <div className="order-price">Rs. {order.totalPrice}</div>
                </div>

                <div className="order-actions">
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <FiEye /> View Details
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleDownloadFile(order._id, order.fileName)}
                  >
                    <FiDownload /> File
                  </button>
                  {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePayOrder(order._id)}
                      disabled={payingId === order._id}
                    >
                      <FiCreditCard /> {payingId === order._id ? 'Paying...' : 'Pay Now'}
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancelOrder(order._id)}
                      disabled={cancellingId === order._id}
                    >
                      <FiSlash /> {cancellingId === order._id ? 'Cancelling…' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {selectedOrder && (
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
            <motion.div
              className="modal-content card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="modal-title">Order Details</h2>
              
              <div className="modal-body">
                <div className="detail-row">
                  <span className="detail-label">File Name:</span>
                  <span className="detail-value">
                    {selectedOrder.fileName}
                    {selectedOrder.converted && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '12px', padding: '2px 8px', fontWeight: 600 }}>Converted to PDF</span>
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Order Date:</span>
                  <span className="detail-value">{formatDate(selectedOrder.createdAt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Print Type:</span>
                  <span className="detail-value">
                    {selectedOrder.printType === 'black-white' ? 'Black & White' : 'Color'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Paper Size:</span>
                  <span className="detail-value">{selectedOrder.paperSize}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Copies:</span>
                  <span className="detail-value">{selectedOrder.copies}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Print Sides:</span>
                  <span className="detail-value">
                    {selectedOrder.printSides === 'single' ? 'Single Side' : 'Double Side'}
                  </span>
                </div>
                {selectedOrder.orientation && (
                  <div className="detail-row">
                    <span className="detail-label">Orientation:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedOrder.orientation}</span>
                  </div>
                )}
                {selectedOrder.paperType && (
                  <div className="detail-row">
                    <span className="detail-label">Paper Type:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedOrder.paperType}</span>
                  </div>
                )}
                {selectedOrder.binding && (
                  <div className="detail-row">
                    <span className="detail-label">Binding:</span>
                    <span className="detail-value" style={{ textTransform: 'capitalize' }}>{selectedOrder.binding}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Delivery Address:</span>
                  <span className="detail-value">{selectedOrder.deliveryAddress}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={getStatusClass(selectedOrder.status)}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Delivery Status:</span>
                  <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                    {(selectedOrder.deliveryStatus || 'not_assigned').replace(/_/g, ' ')}
                  </span>
                </div>
                {selectedOrder.rider && (
                  <div className="detail-row">
                    <span className="detail-label">Rider:</span>
                    <span className="detail-value">
                      {selectedOrder.rider.name} {selectedOrder.rider.phone ? `(${selectedOrder.rider.phone})` : ''}
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Payment:</span>
                  <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                    {selectedOrder.paymentStatus || 'unpaid'} ({(selectedOrder.paymentMethod || 'cod').replace(/_/g, ' ')})
                  </span>
                </div>
                {selectedOrder.paidAt && (
                  <div className="detail-row">
                    <span className="detail-label">Paid At:</span>
                    <span className="detail-value">{formatDate(selectedOrder.paidAt)}</span>
                  </div>
                )}
                {selectedOrder.paymentReference && (
                  <div className="detail-row">
                    <span className="detail-label">Payment Ref:</span>
                    <span className="detail-value">{selectedOrder.paymentReference}</span>
                  </div>
                )}
                <div className="detail-row total">
                  <span className="detail-label">Total Price:</span>
                  <span className="detail-value price-large">Rs. {selectedOrder.totalPrice}</span>
                </div>
              </div>

              <div className="modal-actions">
                {selectedOrder.paymentStatus !== 'paid' && selectedOrder.status !== 'cancelled' && (
                  <>
                    <select
                      className="form-input"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      style={{ marginBottom: '0.5rem' }}
                    >
                      <option value="cod">Cash on Delivery</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="easypaisa">Easypaisa</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="wallet">Wallet</option>
                    </select>
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => handlePayOrder(selectedOrder._id)}
                      disabled={payingId === selectedOrder._id}
                      style={{ marginBottom: '0.5rem' }}
                    >
                      <FiCreditCard /> {payingId === selectedOrder._id ? 'Paying...' : 'Pay Order'}
                    </button>
                  </>
                )}
                <button
                  className="btn btn-outline btn-block"
                  onClick={() => handleDownloadFile(selectedOrder._id, selectedOrder.fileName)}
                  style={{ marginBottom: '0.5rem' }}
                >
                  <FiDownload /> Download File
                </button>
                {selectedOrder.status === 'pending' && (
                  <button
                    className="btn btn-danger btn-block"
                    onClick={() => handleCancelOrder(selectedOrder._id)}
                    disabled={cancellingId === selectedOrder._id}
                  >
                    <FiSlash /> {cancellingId === selectedOrder._id ? 'Cancelling…' : 'Cancel Order'}
                  </button>
                )}
                <button 
                  className="btn btn-primary btn-block"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
