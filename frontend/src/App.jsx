import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import OrderHistory from './pages/OrderHistory';
import AdminDashboard from './pages/AdminDashboard';
import ShopDashboard from './pages/ShopDashboard';
import RiderDashboard from './pages/RiderDashboard';

// Components
import Navbar from './components/Navbar';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavbarRoutes = ['/dashboard', '/orders', '/admin', '/shop', '/rider'];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
};

// Redirect logged-in users to their role's home
const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'shop_owner') return <Navigate to="/shop" />;
  if (user.role === 'rider') return <Navigate to="/rider" />;
  return <Navigate to="/dashboard" />;
};

// Protect route by role
const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" />;
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="app">
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={!user ? <Login /> : <RoleRedirect />} />
            <Route path="/signup" element={!user ? <Signup /> : <RoleRedirect />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Customer routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['customer']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute roles={['customer']}>
                  <OrderHistory />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Shop Owner routes */}
            <Route
              path="/shop"
              element={
                <ProtectedRoute roles={['shop_owner']}>
                  <ShopDashboard />
                </ProtectedRoute>
              }
            />

            {/* Rider routes */}
            <Route
              path="/rider"
              element={
                <ProtectedRoute roles={['rider']}>
                  <RiderDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/unauthorized"
              element={
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <h2>403 — Access Denied</h2>
                  <p>You don't have permission to view this page.</p>
                </div>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
