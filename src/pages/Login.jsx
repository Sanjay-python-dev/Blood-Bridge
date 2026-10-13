import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Heart,
  KeyRound,
  Loader2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import BloodAtmosphere from '../components/animations/BloodAtmosphere';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role, signIn, loginHospital, loginAdmin } = useAuth();

  // Active Login Mode: 'portal' (Donor / Seeker), 'hospital' (Hospital Gateway), 'admin' (Admin Console)
  const initialType = searchParams.get('type') || searchParams.get('portal') || 'portal';
  const [activeTab, setActiveTab] = useState(
    ['portal', 'hospital', 'admin'].includes(initialType) ? initialType : 'portal'
  );

  // Common Form States
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Portal State (User / Donor / Seeker)
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [portalRemember, setPortalRemember] = useState(true);

  // 2. Hospital State
  const [hospitalKey, setHospitalKey] = useState('');
  const [hospitalPassword, setHospitalPassword] = useState('');

  // 3. Admin State
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Keep search param synced when tab switches
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setError('');
    setShowPassword(false);
    setSearchParams({ type: tabKey }, { replace: true });
  };

  // If already authenticated, redirect to the matching dashboard
  useEffect(() => {
    if (user) {
      if (role === USER_ROLES.AUTHORIZED_HOSPITAL) {
        navigate('/hospital-dashboard');
      } else if (role === USER_ROLES.ADMIN) {
        navigate('/admin-dashboard');
      } else {
        navigate('/donor-dashboard');
      }
    }
  }, [user, role, navigate]);

  // --------------------------------------------------------------------------
  // Form Submission Handlers
  // --------------------------------------------------------------------------

  // 1. PORTAL LOGIN SUBMISSION (Donor / Seeker)
  const handlePortalSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = portalEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!portalPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email: cleanEmail, password: portalPassword });
      showToast('Welcome back! Signed into BloodBridge Portal.', 'success');
      navigate('/donor-dashboard');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_grant')) {
        setError('Invalid email or password. Please verify your credentials and try again.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Your email has not been verified yet. Please check your inbox for confirmation.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. HOSPITAL LOGIN SUBMISSION
  const handleHospitalSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanKey = hospitalKey.trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
    const cleanPassword = hospitalPassword.trim();

    if (!cleanKey) {
      setError('Please enter your Hospital Access Key or registered email.');
      return;
    }
    if (!cleanPassword) {
      setError('Please enter your hospital clinical password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginHospital({ userKey: cleanKey, password: cleanPassword });
      showToast('Hospital Authenticated. Welcome to Hospital Dashboard.', 'success');
      navigate('/hospital-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid hospital credentials. Please verify your Hospital Key and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. ADMIN LOGIN SUBMISSION
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = adminIdentifier.trim();
    if (!cleanIdentifier) {
      setError('Please enter administrator username or email.');
      return;
    }
    if (!adminPassword) {
      setError('Please enter administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAdmin({ identifier: cleanIdentifier, password: adminPassword });
      const adminName = res?.user?.name || res?.profile?.full_name || 'Administrator';
      showToast(`Welcome, ${adminName}! Session authorized.`, 'success');
      navigate('/admin-dashboard');
    } catch (err) {
      setError(err.message || 'Administrative authorization failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Quick Fill Helpers (Portal Demo Only)
  // --------------------------------------------------------------------------
  const fillPortalDemo = (demoType) => {
    setError('');
    if (demoType === 'donor') {
      setPortalEmail('sanjay@example.com');
      setPortalPassword('password123');
      showToast('Filled Demo Voluntary Donor credentials', 'info');
    } else {
      setPortalEmail('kavitha.kavin@gmail.com');
      setPortalPassword('password123');
      showToast('Filled Demo Blood Seeker credentials', 'info');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#050508] relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <BloodAtmosphere intensity={0.12} dropCount={0} particleCount={4} />

      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none transition-all duration-700 ${
          activeTab === 'portal'
            ? 'bg-[#E50914]/15'
            : activeTab === 'hospital'
            ? 'bg-sky-500/15'
            : 'bg-amber-500/15'
        }`}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Top Brand Logo */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Logo size="large" />
          <h1 className="text-3xl font-black text-white mt-5 tracking-tight">
            Universal Authentication
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A8] mt-1.5 max-w-sm">
            Select your role to access voluntary donor desks, verified hospital units, or administrative controls.
          </p>
        </div>

        {/* ===================================================================
            3-WAY PORTAL SWITCHER TABS
           =================================================================== */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[#101015]/90 border border-white/10 rounded-2xl mb-5 backdrop-blur-xl shadow-lg">
          {/* TAB 1: PORTAL (Donor & Seeker) */}
          <button
            type="button"
            onClick={() => handleTabChange('portal')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'portal'
                ? 'bg-gradient-to-r from-[#FF2B2B] to-[#B30000] text-white shadow-[0_0_20px_rgba(229,9,20,0.4)] border border-[#FF4A4A]/50'
                : 'text-[#9E9EA8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === 'portal' ? 'text-white fill-white' : 'text-[#FF4A4A]'}`} />
            <span>Portal</span>
          </button>

          {/* TAB 2: HOSPITAL */}
          <button
            type="button"
            onClick={() => handleTabChange('hospital')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'hospital'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-[0_0_20px_rgba(2,132,199,0.45)] border border-sky-400/50'
                : 'text-[#9E9EA8] hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className={`w-3.5 h-3.5 ${activeTab === 'hospital' ? 'text-white' : 'text-sky-400'}`} />
            <span>Hospital</span>
          </button>

          {/* TAB 3: ADMIN */}
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-amber-600 to-red-700 text-white shadow-[0_0_20px_rgba(217,119,6,0.45)] border border-amber-400/50'
                : 'text-[#9E9EA8] hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${activeTab === 'admin' ? 'text-white' : 'text-amber-400'}`} />
            <span>Admin</span>
          </button>
        </div>

        {/* ===================================================================
            LOGIN CARD CONTAINER
           =================================================================== */}
        <div className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative overflow-hidden backdrop-blur-2xl transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Subheader Banner based on active mode */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {activeTab === 'portal' && 'Donor & Seeker Portal'}
                  {activeTab === 'hospital' && 'Hospital Clinical Gateway'}
                  {activeTab === 'admin' && 'Super Administrator Console'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    activeTab === 'portal'
                      ? 'bg-[#E50914]/20 text-[#FF4D4D] border border-[#E50914]/30'
                      : activeTab === 'hospital'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {activeTab === 'portal' && 'Public Portal'}
                  {activeTab === 'hospital' && 'Accredited'}
                  {activeTab === 'admin' && 'Restricted'}
                </span>
              </div>
              <p className="text-[11px] text-[#A0A0A8] mt-1">
                {activeTab === 'portal' && 'Sign in to respond to blood needs or track your requests.'}
                {activeTab === 'hospital' && 'Authenticate with your official State Healthcare License ID.'}
                {activeTab === 'admin' && 'Master control desk for auditing, verifications, and compliance.'}
              </p>
            </div>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-3 text-xs text-red-200 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* =================================================================
              MODE 1: PORTAL LOGIN (DONOR / SEEKER)
             ================================================================= */}
          {activeTab === 'portal' && (
            <form onSubmit={handlePortalSubmit} className="space-y-4 animate-fadeIn">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    disabled={isSubmitting}
                    placeholder="e.g. your.email@example.com"
                    value={portalEmail}
                    onChange={(e) => setPortalEmail(e.target.value)}
                    className="w-full bg-[#141419] border border-white/10 focus:border-[#E50914] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#B0B0B8] uppercase tracking-wider">
                    Password *
                  </label>
                  <Link
                    to="/contact"
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter your account password"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    className="w-full bg-[#141419] border border-white/10 focus:border-[#E50914] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition-colors p-0.5"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={portalRemember}
                    onChange={(e) => setPortalRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 text-[#E50914] focus:ring-[#E50914] bg-[#161616]"
                  />
                  <span>Keep me signed in</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-white font-bold text-sm shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in to Portal...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Portal</span>
                  </>
                )}
              </button>

              {/* Quick Fill Demo Badges */}
              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                  <span className="flex items-center gap-1 font-semibold text-zinc-300">
                    <Sparkles className="w-3 h-3 text-[#FF2B2B]" /> Quick Demo Accounts:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillPortalDemo('donor')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span>Voluntary Donor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillPortalDemo('seeker')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white transition-all flex items-center gap-1"
                  >
                    <span>Blood Seeker</span>
                  </button>
                </div>
              </div>

              {/* Register Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-400">
                  New to BloodBridge?{' '}
                  <Link to="/register" className="text-[#FF2B2B] font-bold hover:underline">
                    Register as Donor or Seeker
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* =================================================================
              MODE 2: HOSPITAL LOGIN
             ================================================================= */}
          {activeTab === 'hospital' && (
            <form onSubmit={handleHospitalSubmit} className="space-y-4 animate-fadeIn">
              {/* Hospital Key / Email */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                  Hospital Access Key or Email *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-sky-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="e.g. TN11-KARUR-001 or hospital@gmail.com"
                    value={hospitalKey}
                    onChange={(e) => setHospitalKey(e.target.value.toUpperCase())}
                    className="w-full bg-[#141419] border border-white/10 focus:border-sky-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none font-mono transition-colors"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Official User Key assigned by Tamil Nadu Health Dept & BloodBridge committee.
                </span>
              </div>

              {/* Hospital Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#B0B0B8] uppercase tracking-wider">
                    Clinical Password *
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-sky-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter hospital access password"
                    value={hospitalPassword}
                    onChange={(e) => setHospitalPassword(e.target.value)}
                    className="w-full bg-[#141419] border border-white/10 focus:border-sky-500 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition-colors p-0.5"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Hospital Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-sky-800 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(2,132,199,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Clinical Access...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>Authorize Hospital Access</span>
                  </>
                )}
              </button>

              {/* Hospital Registration Link */}
              <div className="text-center pt-2">
                <p className="text-xs text-zinc-400">
                  Hospital not registered yet?{' '}
                  <Link to="/hospital-portal" className="text-sky-400 font-bold hover:underline">
                    Apply for Accreditation Key
                  </Link>
                </p>
              </div>
            </form>
          )}

          {/* =================================================================
              MODE 3: ADMIN LOGIN
             ================================================================= */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4 animate-fadeIn">
              {/* Security Banner */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">Authorized Personnel Only</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Access is strictly limited to the 10 authorized administrator accounts specified in the project roster.
                  </div>
                </div>
              </div>

              {/* Admin Username or Email */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                  Administrator Username or Email *
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="e.g. sanjayraj_admin or manick_admin"
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    className="w-full bg-[#141419] border border-white/10 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#B0B0B8] uppercase tracking-wider">
                    Administrator Password *
                  </label>
                  <span className="text-[10px] text-zinc-400">
                    Format: First 3 letters + # + 4-digit no.
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-amber-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter admin password (e.g. San#1002)"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-[#141419] border border-white/10 focus:border-amber-500 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition-colors p-0.5"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Admin Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-red-600 to-amber-800 hover:from-amber-500 hover:to-red-600 text-white font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.45)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Admin Authorization...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize Admin Session</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-zinc-500">
                  Strictly authenticated against official project admin roster.
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Global Security Disclaimer Footer */}
        <div className="mt-6 text-center text-[11px] text-zinc-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>BloodBridge Secure Healthcare Network • Encrypted Gateway</span>
        </div>
      </div>
    </div>
  );
}
