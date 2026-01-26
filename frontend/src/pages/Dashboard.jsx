import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiFile, FiSettings, FiDollarSign } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [orderDetails, setOrderDetails] = useState({
    printType: 'black-white',
    paperSize: 'A4',
    copies: 1,
    printSides: 'single',
    deliveryAddress: user?.address || ''
  });
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const prices = {
    'black-white': { single: 5, double: 8 },
    'color': { single: 15, double: 25 }
  };

  const calculatePrice = () => {
    const basePrice = prices[orderDetails.printType][orderDetails.printSides];
    return basePrice * orderDetails.copies;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleChange = (e) => {
    setOrderDetails({
      ...orderDetails,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to print');
      return;
    }

    if (!orderDetails.deliveryAddress) {
      setError('Please enter delivery address');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // In production, upload file to cloud storage first
      // For now, we'll simulate with a dummy URL
      const orderData = {
        fileName: selectedFile.name,
        fileUrl: 'http://example.com/files/' + selectedFile.name, // Placeholder
        printType: orderDetails.printType,
        paperSize: orderDetails.paperSize,
        copies: parseInt(orderDetails.copies),
        printSides: orderDetails.printSides,
        totalPrice: calculatePrice(),
        deliveryAddress: orderDetails.deliveryAddress
      };

      await axios.post('/api/orders', orderData);
      setSuccess('Order placed successfully! Check your order history.');
      setSelectedFile(null);
      setOrderDetails({
        ...orderDetails,
        copies: 1
      });
      
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="dashboard-title">Welcome, {user?.name}!</h1>
          <p className="dashboard-subtitle">Upload your documents and place printing orders</p>
        </motion.div>

        <div className="dashboard-content">
          <motion.div
            className="upload-section card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="section-title">
              <FiUpload /> Upload Document
            </h2>

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="upload-form">
              <div className="file-upload">
                <input
                  type="file"
                  id="file-input"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="file-input" className="file-label">
                  <FiFile size={30} />
                  <span>{selectedFile ? selectedFile.name : 'Choose file to upload'}</span>
                  <small>PDF, Word, or Image (Max 10MB)</small>
                </label>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="printType" className="form-label">
                    Print Type
                  </label>
                  <select
                    id="printType"
                    name="printType"
                    value={orderDetails.printType}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="black-white">Black & White</option>
                    <option value="color">Color</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="paperSize" className="form-label">
                    Paper Size
                  </label>
                  <select
                    id="paperSize"
                    name="paperSize"
                    value={orderDetails.paperSize}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="printSides" className="form-label">
                    Print Sides
                  </label>
                  <select
                    id="printSides"
                    name="printSides"
                    value={orderDetails.printSides}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="single">Single Side</option>
                    <option value="double">Double Side</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="copies" className="form-label">
                    Number of Copies
                  </label>
                  <input
                    type="number"
                    id="copies"
                    name="copies"
                    min="1"
                    max="100"
                    value={orderDetails.copies}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="deliveryAddress" className="form-label">
                  Delivery Address
                </label>
                <textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  rows="3"
                  value={orderDetails.deliveryAddress}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter delivery address"
                  required
                />
              </div>

              <div className="price-summary">
                <FiDollarSign size={24} />
                <div>
                  <strong>Total Price:</strong>
                  <span className="price-amount">Rs. {calculatePrice()}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={uploading}>
                {uploading ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>
          </motion.div>

          <motion.div
            className="info-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="card info-card">
              <h3><FiSettings /> Printing Options</h3>
              <ul>
                <li>Black & White: Rs. 5 per page (single side)</li>
                <li>Black & White: Rs. 8 per page (double side)</li>
                <li>Color: Rs. 15 per page (single side)</li>
                <li>Color: Rs. 25 per page (double side)</li>
              </ul>
            </div>

            <div className="card info-card">
              <h3><FiFile /> Accepted Formats</h3>
              <ul>
                <li>PDF Documents</li>
                <li>Word Documents (.doc, .docx)</li>
                <li>Images (.jpg, .jpeg, .png)</li>
                <li>Maximum file size: 10MB</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
