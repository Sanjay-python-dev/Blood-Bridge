import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Toast from './components/Toast';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import FindBlood from './pages/FindBlood';
import DonateBlood from './pages/DonateBlood';
import RequestBlood from './pages/RequestBlood';
import MyRequests from './pages/MyRequests';
import Login from './pages/Login';
import Register from './pages/Register';
import DonorDashboard from './pages/DonorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HospitalPortal from './pages/HospitalPortal';
import HospitalDashboard from './pages/HospitalDashboard';
import BombaySecureAccess from './pages/BombaySecureAccess';
import Contact from './pages/Contact';
import DevEmailTest from './pages/DevEmailTest';

// Auth & Protection
import { AuthProvider, USER_ROLES } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Toast />
        <div className="min-h-screen flex flex-col bg-[#050508] text-white selection:bg-[#E50914] selection:text-white relative">
          {/* Ambient Apple Healthcare Layered Background Orbs */}
          <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute -top-40 left-1/4 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(229,9,20,0.12)_0%,transparent_70%)] blur-[120px]" />
            <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,43,43,0.08)_0%,transparent_70%)] blur-[140px]" />
            <div className="absolute bottom-1/4 -left-40 w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(180,10,20,0.07)_0%,transparent_70%)] blur-[130px]" />
            <div className="absolute -bottom-40 right-1/4 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(229,9,20,0.09)_0%,transparent_70%)] blur-[150px]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(25,25,35,0.4)_0%,_rgba(5,5,8,0.92)_100%)]" />
          </div>
          <Navbar />
          <div className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/find-blood" element={<FindBlood />} />
              <Route path="/donate-blood" element={<DonateBlood />} />
              <Route path="/request-blood" element={<RequestBlood />} />
              <Route
                path="/my-requests"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.USER, USER_ROLES.DONOR, USER_ROLES.SEEKER, USER_ROLES.ADMIN]}>
                    <MyRequests />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
              <Route path="/register" element={<Register />} />
              <Route path="/contact" element={<Contact />} />

              {/* Bombay Blood Group Protected Access Gateway */}
              <Route path="/bombay-access" element={<BombaySecureAccess />} />

              {/* Hospital Authorization Gateway */}
              <Route path="/hospital-portal" element={<HospitalPortal />} />

              {/* Role Protected Routes */}
              <Route
                path="/donor-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.USER, USER_ROLES.ADMIN]}>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/hospital-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.AUTHORIZED_HOSPITAL, USER_ROLES.ADMIN]}>
                    <HospitalDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Development & Diagnostics: Transactional Email Test */}
              <Route path="/dev/email-test" element={<DevEmailTest />} />

              {/* Fallback route to Home */}
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
