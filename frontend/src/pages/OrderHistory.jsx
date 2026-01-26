import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiClock, FiCheckCircle, FiXCircle, FiEye } from 'react-icons/fi';
import axios from 'axios';
import './OrderHistory.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

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
      <div className="order-history">
        <div className="container">
          <div className="loading">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history">
      <div className="container">
        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">Track and manage all your printing orders</p>
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
                    <h3 className="order-title">{order.fileName}</h3>
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
                </div>

                <div className="order-footer">
                  <div className={getStatusClass(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </div>
                  <div className="order-price">Rs. {order.totalPrice}</div>
                </div>

                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setSelectedOrder(order)}
                >
                  <FiEye /> View Details
                </button>
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
                  <span className="detail-value">{selectedOrder.fileName}</span>
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
                <div className="detail-row total">
                  <span className="detail-label">Total Price:</span>
                  <span className="detail-value price-large">Rs. {selectedOrder.totalPrice}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-block"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
