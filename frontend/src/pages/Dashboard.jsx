import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUpload, FiFile, FiSettings, FiDollarSign, FiClock, 
  FiCheckCircle, FiPackage, FiPrinter, FiMenu, FiX,
  FiHome, FiShoppingBag, FiUser, FiLogOut, FiTrendingUp,
  FiSun, FiMoon
} from 'react-icons/fi';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0
  });
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

  useEffect(() => {
    fetchOrderStats();
  }, []);

  const fetchOrderStats = async () => {
    try {
      const response = await axios.get('/api/orders/my-orders');
      const orders = response.data;
      const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      
      setStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        completedOrders: orders.filter(o => o.status === 'completed').length,
        totalSpent: totalSpent
      });
      
      // Get recent 5 orders
      setRecentOrders(orders.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Chart data for orders trend
  const ordersChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Orders',
        data: [3, 7, 4, 8, 5, 9, 6],
        borderColor: '#0F2854',
        backgroundColor: 'rgba(15, 40, 84, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Chart data for print type distribution
  const printTypeChartData = {
    labels: ['Black & White', 'Color'],
    datasets: [
      {
        data: [stats.totalOrders * 0.7, stats.totalOrders * 0.3],
        backgroundColor: ['#0F2854', '#4988C4'],
        borderWidth: 0
      }
    ]
  };

  // Chart data for monthly spending
  const spendingChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Spending (Rs.)',
        data: [1200, 1900, 1500, 2200, 1800, stats.totalSpent],
        backgroundColor: 'rgba(73, 136, 196, 0.8)',
        borderRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
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
      fetchOrderStats(); // Update stats
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
          <Link to="/dashboard" className="nav-item active">
            <FiHome /> Dashboard
          </Link>
          <Link to="/orders" className="nav-item">
            <FiShoppingBag /> My Orders
          </Link>
          <a href="#upload" className="nav-item" onClick={() => setSidebarOpen(false)}>
            <FiUpload /> New Order
          </a>
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
        <div className="dashboard">
          <div className="container">
            {/* Header with Menu Button */}
            <motion.div
              className="dashboard-header"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="header-content">
                <div className="header-left">
                  <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
                    <FiMenu />
                  </button>
                  <div>
                    <h1 className="dashboard-title">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                    <p className="dashboard-subtitle">Here's what's happening with your printing orders today</p>
                  </div>
                </div>
                <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === 'light' ? <FiMoon size={22} /> : <FiSun size={22} />}
                </button>
              </div>
            </motion.div>

        {/* Statistics Cards */}
        <motion.div 
          className="stats-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">
              <FiPackage />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Orders</p>
              <h3 className="stat-value">{stats.totalOrders}</h3>
              <span className="stat-change">+12% from last month</span>
            </div>
          </div>
          
          <div className="stat-card stat-card-warning">
            <div className="stat-icon">
              <FiClock />
            </div>
            <div className="stat-content">
              <p className="stat-label">Pending</p>
              <h3 className="stat-value">{stats.pendingOrders}</h3>
              <span className="stat-change">In progress</span>
            </div>
          </div>
          
          <div className="stat-card stat-card-success">
            <div className="stat-icon">
              <FiCheckCircle />
            </div>
            <div className="stat-content">
              <p className="stat-label">Completed</p>
              <h3 className="stat-value">{stats.completedOrders}</h3>
              <span className="stat-change">+5 this week</span>
            </div>
          </div>
          
          <div className="stat-card stat-card-info">
            <div className="stat-icon">
              <FiDollarSign />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Spent</p>
              <h3 className="stat-value">Rs. {stats.totalSpent}</h3>
              <span className="stat-change">This month</span>
            </div>
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div 
          className="charts-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="chart-card">
            <div className="chart-header">
              <h3><FiTrendingUp /> Orders Trend</h3>
              <p>Last 7 days</p>
            </div>
            <div className="chart-container">
              <Line data={ordersChartData} options={chartOptions} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3><FiPrinter /> Print Types</h3>
              <p>Distribution</p>
            </div>
            <div className="chart-container chart-doughnut">
              <Doughnut data={printTypeChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3><FiDollarSign /> Monthly Spending</h3>
              <p>Last 6 months</p>
            </div>
            <div className="chart-container">
              <Bar data={spendingChartData} options={chartOptions} />
            </div>
          </div>
        </motion.div>

        {/* Upload Section */}
        <div className="dashboard-content" id="upload">
          <motion.div
            className="upload-section card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="section-header">
              <h2 className="section-title">
                <FiUpload /> New Print Order
              </h2>
              <p className="section-subtitle">Upload your document and configure print settings</p>
            </div>

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
      </div>
    </div>
  );
};

export default Dashboard;
