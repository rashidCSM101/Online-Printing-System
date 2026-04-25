import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiPhone, FiMapPin, FiAlertCircle, FiShoppingBag } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    shopName: '',
    shopAddress: '',
  });
  const [isShopOwner, setIsShopOwner] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...rest } = formData;
      const signupData = { ...rest, role: isShopOwner ? 'shop_owner' : 'customer' };
      const response = await axios.post('/api/auth/register', signupData);

      if (isShopOwner) {
        // Shop owner registration — no auto-login, show pending message
        setSuccessMsg(response.data.message || 'Registration submitted! Please wait for admin approval.');
        setLoading(false);
        return;
      }

      // Redirect to login page after successful customer registration
      navigate('/login', { 
        state: { message: 'Account created successfully! Please login.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join us to start printing online</p>
        </div>

        {error && (
          <div className="error-message">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {successMsg ? (
          <div className="auth-success-card">
            <FiShoppingBag size={40} style={{ color: 'var(--accent)', marginBottom: '1rem' }} />
            <h3>Registration Submitted!</h3>
            <p>{successMsg}</p>
            <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }}>
              Back to Login
            </Link>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Account type toggle */}
          <div className="account-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${!isShopOwner ? 'active' : ''}`}
              onClick={() => setIsShopOwner(false)}
            >
              <FiUser /> Customer
            </button>
            <button
              type="button"
              className={`toggle-btn ${isShopOwner ? 'active' : ''}`}
              onClick={() => setIsShopOwner(true)}
            >
              <FiShoppingBag /> Shop Owner
            </button>
          </div>

          {isShopOwner && (
            <div className="info-banner">
              Your shop owner application will be reviewed by an admin before you can log in.
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              <FiUser /> Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <FiMail /> Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              <FiPhone /> Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="form-input"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address" className="form-label">
              <FiMapPin /> Address
            </label>
            <textarea
              id="address"
              name="address"
              className="form-input"
              placeholder="Enter your address"
              rows="2"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          {isShopOwner && (
            <>
              <div className="form-group">
                <label htmlFor="shopName" className="form-label">
                  <FiShoppingBag /> Shop Name
                </label>
                <input
                  type="text"
                  id="shopName"
                  name="shopName"
                  className="form-input"
                  placeholder="Enter your shop name"
                  value={formData.shopName}
                  onChange={handleChange}
                  required={isShopOwner}
                />
              </div>
              <div className="form-group">
                <label htmlFor="shopAddress" className="form-label">
                  <FiMapPin /> Shop Address
                </label>
                <textarea
                  id="shopAddress"
                  name="shopAddress"
                  className="form-input"
                  placeholder="Enter your shop address"
                  rows="2"
                  value={formData.shopAddress}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <FiLock /> Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              <FiLock /> Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="form-input"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : isShopOwner ? 'Submit Application' : 'Sign Up'}
          </button>
        </form>
        )}

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Login here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
