import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Heart, ShieldAlert, User, LogIn, UserPlus, LogOut, Building, Bell } from 'lucide-react';
import Logo from './Logo';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import NotificationModal from './NotificationModal';
import { getUnreadNotificationCount } from '../services/notificationService';

export default function Navbar() {
  const { user, role, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync notification badge
  useEffect(() => {
    setUnreadCount(getUnreadNotificationCount(role || 'USER'));
    const handleNotifUpdate = () => {
      setUnreadCount(getUnreadNotificationCount(role || 'USER'));
    };
    window.addEventListener('bloodbridge_notifications_updated', handleNotifUpdate);
    return () => window.removeEventListener('bloodbridge_notifications_updated', handleNotifUpdate);
  }, [role]);

  // Close mobile menu upon navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Find Blood', path: '/find-blood' },
    { name: 'Donate Blood', path: '/donate-blood' },
    { name: 'Request Blood', path: '/request-blood' },
    { name: 'Contact', path: '/contact' },
  ];

  // User target dashboard URL based on active role
  const getDashboardUrl = () => {
    if (role === USER_ROLES.AUTHORIZED_HOSPITAL) return '/hospital-dashboard';
    if (role === USER_ROLES.ADMIN) return '/admin-dashboard';
    return '/donor-dashboard';
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(12,12,16,0.78)] backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-[rgba(12,12,16,0.65)] backdrop-blur-xl border-b border-white/[0.05]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Logo />
            </div>

            {/* Center: Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                      isActive
                        ? 'text-white font-semibold bg-white/10 shadow-[0_0_20px_rgba(229,9,20,0.25)] border border-white/20 backdrop-blur-md'
                        : 'text-[#B0B0B8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </nav>

            {/* Right: Auth & Dashboard Actions */}
            <div className="hidden lg:flex items-center gap-2.5">
              
              {/* Notification Bell */}
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 rounded-xl text-[#B0B0B8] hover:text-white hover:bg-white/10 border border-white/10 backdrop-blur-md transition-colors"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E50914] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Quick dashboard shortcuts */}
              <Link
                to="/donor-dashboard"
                title="Donor Portal"
                className="text-xs text-[#B0B0B8] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-[#E50914]/50 transition-all bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.08]"
              >
                <Heart className="w-3.5 h-3.5 text-[#E50914]" />
                <span>Portal</span>
              </Link>

              <Link
                to="/hospital-portal"
                title="Hospital Portal"
                className="text-xs text-[#B0B0B8] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-sky-400/50 transition-all bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.08]"
              >
                <Building className="w-3.5 h-3.5 text-sky-400" />
                <span>Hospital</span>
              </Link>

              <Link
                to="/admin-dashboard"
                title="Admin Panel"
                className="text-xs text-[#B0B0B8] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-[#FF2B2B]/50 transition-all bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.08]"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF2B2B]" />
                <span>Admin</span>
              </Link>

              {/* Auth Buttons / User State */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={getDashboardUrl()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 hover:border-[#E50914]/60 text-xs font-semibold text-white transition-all shadow-[0_0_15px_rgba(229,9,20,0.2)] backdrop-blur-md"
                    title="Active Dashboard"
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF2B2B] to-[#990000] text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                      {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                    </div>
                    <span className="max-w-[100px] truncate">{profile?.full_name || profile?.name || user.email?.split('@')[0]}</span>
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#B0B0B8] hover:text-white bg-white/[0.06] border border-white/15 hover:border-[#E50914] backdrop-blur-md transition-all"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#FF2B2B]" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-white/[0.06] border border-white/15 hover:border-white/30 hover:bg-white/[0.1] backdrop-blur-md shadow-sm transition-all duration-200"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </Link>

                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white btn-red-gradient transition-all duration-200"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="p-1.5 rounded text-white relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#E50914]" />
                )}
              </button>
              <Link
                to="/request-blood"
                className="px-2.5 py-1 rounded bg-[#E50914] text-white text-xs font-bold flex items-center gap-1"
              >
                Emergency
              </Link>
              <button
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                className="p-2 rounded-lg text-[#B0B0B0] hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#E50914]"
                aria-label="Toggle Navigation Menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Drawer */}
        {isOpen && (
          <div className="lg:hidden bg-[rgba(14,14,20,0.92)] backdrop-blur-3xl border-b border-white/10 px-4 pt-2 pb-6 space-y-3 animate-fadeIn shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `block px-3.5 py-2.5 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? 'text-white bg-white/10 border-l-4 border-[#E50914] backdrop-blur-md'
                        : 'text-[#B0B0B8] hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              <div className="grid grid-cols-3 gap-2 mb-1">
                <Link
                  to="/donor-dashboard"
                  className="flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-lg bg-[#161616] text-[#B0B0B0] border border-[#333]"
                >
                  <Heart className="w-3 h-3 text-[#E50914]" />
                  Donor
                </Link>
                <Link
                  to="/hospital-portal"
                  className="flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-lg bg-[#161616] text-[#B0B0B0] border border-[#333]"
                >
                  <Building className="w-3 h-3 text-sky-400" />
                  Hospital
                </Link>
                <Link
                  to="/admin-dashboard"
                  className="flex items-center justify-center gap-1 py-2 text-[11px] font-medium rounded-lg bg-[#161616] text-[#B0B0B0] border border-[#333]"
                >
                  <ShieldAlert className="w-3 h-3 text-[#FF2B2B]" />
                  Admin
                </Link>
              </div>

              {user ? (
                <div className="space-y-2">
                  <Link
                    to={getDashboardUrl()}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#161616] border border-[#E50914]/40 text-xs font-semibold text-white"
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#FF2B2B]" />
                      <span>{profile?.full_name || profile?.name || user.email}</span>
                    </span>
                    <span className="text-[10px] text-[#E50914] font-mono uppercase font-bold">Dashboard</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[#B0B0B0] hover:text-white bg-[#111111] border border-white/10 hover:border-[#E50914]"
                  >
                    <LogOut className="w-4 h-4 text-[#FF2B2B]" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#111111] border border-white/30 hover:border-white"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </Link>

                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#E50914] hover:bg-[#FF2B2B] shadow-[0_0_20px_rgba(229,9,20,0.5)]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Notification Center Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
}
