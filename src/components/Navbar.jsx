import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, Heart, ShieldAlert, User, LogIn, UserPlus, LogOut, Building, Bell, FileText } from 'lucide-react';
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

  const isHospitalPage = location.pathname.startsWith('/hospital') || role === USER_ROLES.AUTHORIZED_HOSPITAL;
  const isAdminPage = location.pathname.startsWith('/admin') || role === USER_ROLES.ADMIN;
  const isInstitutionalOrAdmin = isHospitalPage || isAdminPage;

  // Regular public nav links
  const publicNavLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Find Blood', path: '/find-blood' },
    { name: 'Donate Blood', path: '/donate-blood' },
    { name: 'Request Blood', path: '/request-blood' },
    { name: 'Contact', path: '/contact' },
  ];

  // Completely remove Home, About, Find Blood, Donate Blood, Request Blood on hospital & admin pages
  const navLinks = isInstitutionalOrAdmin ? [] : publicNavLinks;

  // User target dashboard URL based on active role
  const getDashboardUrl = () => {
    if (role === USER_ROLES.AUTHORIZED_HOSPITAL) return '/hospital-dashboard';
    if (role === USER_ROLES.ADMIN) return '/admin-dashboard';
    return '/donor-dashboard';
  };

  const getLogoLink = () => {
    if (isHospitalPage) return '/hospital-dashboard';
    if (isAdminPage) return '/admin-dashboard';
    return '/';
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
              <Logo linkTo={getLogoLink()} />
            </div>

            {/* Center: Desktop Nav Links or Institutional Console Badges */}
            {isInstitutionalOrAdmin ? (
              <div className="hidden lg:flex items-center gap-3">
                {isHospitalPage ? (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-xs font-semibold text-sky-300 shadow-sm backdrop-blur-md">
                    <Building className="w-4 h-4 text-sky-400" />
                    <span>Hospital Clinical Operations Portal</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-300 shadow-sm backdrop-blur-md">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Central Administration & Governance Console</span>
                  </div>
                )}
              </div>
            ) : (
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
            )}

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

              {/* My Requests (Only for voluntary public users/donors/seekers) */}
              {user && !isInstitutionalOrAdmin && (
                <Link
                  to="/my-requests"
                  title="My Blood Requests"
                  className="text-xs text-[#B0B0B8] hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-[#E50914]/50 transition-all bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.08]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#FF2B2B]" />
                  <span>My Requests</span>
                </Link>
              )}

              {/* Auth Buttons / User State */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={getDashboardUrl()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/15 hover:border-[#E50914]/60 text-xs font-semibold text-white transition-all shadow-[0_0_15px_rgba(229,9,20,0.2)] backdrop-blur-md"
                    title="Active Dashboard"
                  >
                    <div
                      className={`w-6 h-6 rounded-lg text-white flex items-center justify-center text-[11px] font-bold shadow-sm ${
                        isHospitalPage
                          ? 'bg-gradient-to-br from-sky-500 to-blue-700'
                          : isAdminPage
                          ? 'bg-gradient-to-br from-amber-500 to-red-600'
                          : 'bg-gradient-to-br from-[#FF2B2B] to-[#990000]'
                      }`}
                    >
                      {isHospitalPage ? (
                        <Building className="w-3.5 h-3.5 text-white" />
                      ) : isAdminPage ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-white" />
                      ) : profile?.full_name ? (
                        profile.full_name.charAt(0).toUpperCase()
                      ) : user.email ? (
                        user.email.charAt(0).toUpperCase()
                      ) : (
                        'U'
                      )}
                    </div>
                    <span className="max-w-[130px] truncate">
                      {profile?.hospital_name || profile?.full_name || profile?.name || user.name || user.email?.split('@')[0]}
                    </span>
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
              {!isInstitutionalOrAdmin && (
                <Link
                  to="/request-blood"
                  className="px-2.5 py-1 rounded bg-[#E50914] text-white text-xs font-bold flex items-center gap-1"
                >
                  Emergency
                </Link>
              )}
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
            {isInstitutionalOrAdmin ? (
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-zinc-300 flex items-center gap-2.5">
                {isHospitalPage ? (
                  <>
                    <Building className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span>Hospital Clinical Operations Portal</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Central Administration Console</span>
                  </>
                )}
              </div>
            ) : (
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
            )}

            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              {user ? (
                <div className="space-y-2">
                  {!isInstitutionalOrAdmin && (
                    <Link
                      to="/my-requests"
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#161616] border border-white/10 text-xs font-semibold text-white"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FF2B2B]" />
                        <span>My Blood Requests</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono uppercase font-bold">Track</span>
                    </Link>
                  )}
                  <Link
                    to={getDashboardUrl()}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#161616] border border-[#E50914]/40 text-xs font-semibold text-white"
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#FF2B2B]" />
                      <span>{profile?.hospital_name || profile?.full_name || profile?.name || user.email}</span>
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
