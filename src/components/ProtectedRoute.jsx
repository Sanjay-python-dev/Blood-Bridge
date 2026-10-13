import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import { ShieldAlert, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import BloodLoadingDrop from './animations/BloodLoadingDrop';

export default function ProtectedRoute({ children, allowedRoles = [USER_ROLES.USER] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-[#050505] text-white">
        <BloodLoadingDrop />
        <p className="text-sm text-[#B0B0B0] font-medium tracking-wide">
          Verifying security authorization credentials...
        </p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (allowedRoles.includes(USER_ROLES.AUTHORIZED_HOSPITAL)) {
      return <Navigate to="/login?type=hospital" replace />;
    }
    if (allowedRoles.includes(USER_ROLES.ADMIN)) {
      return <Navigate to="/login?type=admin" replace />;
    }
    return <Navigate to="/login?type=portal" replace />;
  }

  // Check if role is authorized (donor and seeker are standard USER clearances)
  const isAuthorized = allowedRoles.length === 0 ||
    allowedRoles.includes(role) ||
    (allowedRoles.includes(USER_ROLES.USER) && (role === 'donor' || role === 'seeker' || role === 'USER'));

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#050505] text-white">
        <div className="max-w-md w-full bg-[#111111] border border-[#222222] hover:border-[#E50914]/50 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] mx-auto mb-5 shadow-[0_0_20px_rgba(229,9,20,0.4)]">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-block text-[10px] uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3 py-1 rounded-full mb-3">
            ACCESS RESTRICTED
          </span>

          <h2 className="text-2xl font-black text-white mb-2">
            Authorization Required
          </h2>

          <p className="text-sm text-[#B0B0B0] leading-relaxed mb-6">
            This module is reserved for users with <strong className="text-white">{allowedRoles.join(', ')}</strong> clearance. Your current active session is signed in as <span className="text-[#FF2B2B] font-mono font-bold">{role || 'GUEST'}</span>.
          </p>

          <div className="space-y-3">
            {allowedRoles.includes(USER_ROLES.AUTHORIZED_HOSPITAL) && (
              <Link
                to="/login?type=hospital"
                className="block w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(2,132,199,0.5)] transition-all"
              >
                Sign In to Hospital Portal
              </Link>
            )}

            {allowedRoles.includes(USER_ROLES.ADMIN) && (
              <Link
                to="/login?type=admin"
                className="block w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(217,119,6,0.5)] transition-all"
              >
                Admin Authentication Desk
              </Link>
            )}

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/10 text-white text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to BloodBridge Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
