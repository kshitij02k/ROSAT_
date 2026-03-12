import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initSocket } from './services/socket';

// Layout
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard';
import JoinQueue from './pages/patient/JoinQueue';
import QueueStatus from './pages/patient/QueueStatus';
import ConsultationPage from './pages/patient/ConsultationPage';
import PatientHistory from './pages/patient/PatientHistory';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import CurrentConsultation from './pages/doctor/CurrentConsultation';
import QueueOverview from './pages/doctor/QueueOverview';
import DoctorHistory from './pages/doctor/DoctorHistory';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import QueueMonitor from './pages/admin/QueueMonitor';
import OptimizationDashboard from './pages/admin/OptimizationDashboard';
import DoctorManagement from './pages/admin/DoctorManagement';
import Analytics from './pages/admin/Analytics';

// Route titles
const ROUTE_TITLES = {
  '/patient/dashboard': 'Patient Dashboard',
  '/patient/join-queue': 'Join Queue',
  '/patient/queue-status': 'Queue Status',
  '/patient/consultation': 'Consultation',
  '/patient/history': 'History',
  '/doctor/dashboard': 'Doctor Dashboard',
  '/doctor/current-consultation': 'Current Consultation',
  '/doctor/queue': 'Queue Overview',
  '/doctor/history': 'History',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/queue-monitor': 'Queue Monitor',
  '/admin/optimization': 'Optimization Dashboard',
  '/admin/doctors': 'Doctor Management',
  '/admin/analytics': 'Analytics'
};

// Protected route wrapper
const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirect = user.role === 'admin' ? '/admin/dashboard'
      : user.role === 'doctor' ? '/doctor/dashboard'
      : '/patient/dashboard';
    return <Navigate to={redirect} replace />;
  }
  return children;
};

// Dashboard layout wrapper
const DashboardLayout = ({ user, title, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="main-content">
        <Navbar
          title={title}
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      initSocket();
    }
  }, [user]);

  const handleLogin = (userData, token) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const getTitle = (path) => ROUTE_TITLES[path] || 'Dashboard';

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <LoginPage onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <RegisterPage onLogin={handleLogin} />}
        />

        {/* Patient routes */}
        <Route path="/patient/dashboard" element={
          <ProtectedRoute user={user} allowedRoles={['patient']}>
            <DashboardLayout user={user} title="Patient Dashboard" onLogout={handleLogout}>
              <PatientDashboard user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/patient/join-queue" element={
          <ProtectedRoute user={user} allowedRoles={['patient']}>
            <DashboardLayout user={user} title="Join Queue" onLogout={handleLogout}>
              <JoinQueue user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/patient/queue-status" element={
          <ProtectedRoute user={user} allowedRoles={['patient']}>
            <DashboardLayout user={user} title="Queue Status" onLogout={handleLogout}>
              <QueueStatus user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/patient/consultation" element={
          <ProtectedRoute user={user} allowedRoles={['patient']}>
            <DashboardLayout user={user} title="Consultation" onLogout={handleLogout}>
              <ConsultationPage user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/patient/history" element={
          <ProtectedRoute user={user} allowedRoles={['patient']}>
            <DashboardLayout user={user} title="History" onLogout={handleLogout}>
              <PatientHistory user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Doctor routes */}
        <Route path="/doctor/dashboard" element={
          <ProtectedRoute user={user} allowedRoles={['doctor']}>
            <DashboardLayout user={user} title="Doctor Dashboard" onLogout={handleLogout}>
              <DoctorDashboard user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/doctor/current-consultation" element={
          <ProtectedRoute user={user} allowedRoles={['doctor']}>
            <DashboardLayout user={user} title="Current Consultation" onLogout={handleLogout}>
              <CurrentConsultation user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/doctor/queue" element={
          <ProtectedRoute user={user} allowedRoles={['doctor']}>
            <DashboardLayout user={user} title="Queue Overview" onLogout={handleLogout}>
              <QueueOverview user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/doctor/history" element={
          <ProtectedRoute user={user} allowedRoles={['doctor']}>
            <DashboardLayout user={user} title="Doctor History" onLogout={handleLogout}>
              <DoctorHistory user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <DashboardLayout user={user} title="Admin Dashboard" onLogout={handleLogout}>
              <AdminDashboard user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/queue-monitor" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <DashboardLayout user={user} title="Queue Monitor" onLogout={handleLogout}>
              <QueueMonitor user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/optimization" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <DashboardLayout user={user} title="Optimization Dashboard" onLogout={handleLogout}>
              <OptimizationDashboard user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/doctors" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <DashboardLayout user={user} title="Doctor Management" onLogout={handleLogout}>
              <DoctorManagement user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute user={user} allowedRoles={['admin']}>
            <DashboardLayout user={user} title="Analytics" onLogout={handleLogout}>
              <Analytics user={user} />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={
          user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/" replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
