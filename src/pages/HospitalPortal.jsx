import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building, Key, Mail, Lock, Phone, MapPin, ShieldCheck, AlertCircle, CheckCircle2, Loader2, FileText, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import { registerHospitalAccount } from '../services/hospitalService';
import { getStates, getDistricts, defaultCountry, defaultState } from '../services/locationService';
import { showToast } from '../components/Toast';

export default function HospitalPortal() {
  const navigate = useNavigate();
  const { loginHospital } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    userKey: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Location selector state for registration
  const [regState, setRegState] = useState(defaultState);
  const availableDistricts = getDistricts(defaultCountry, regState);

  // Registration form state
  const [regData, setRegData] = useState({
    name: '',
    licenseNumber: '',
    country: defaultCountry,
    state: defaultState,
    district: availableDistricts[0] || 'Karur',
    address: '',
    nodalOfficer: '',
    contactPhone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const cleanKey = String(loginData.userKey || '').trim().replace(/[\u2010-\u2015]/g, '-').toUpperCase();
    const cleanPassword = String(loginData.password || '').trim();

    try {
      await loginHospital({
        userKey: cleanKey,
        password: cleanPassword,
      });
      showToast('Hospital Authenticated Successfully. Welcome to Hospital Dashboard.', 'success');
      navigate('/hospital-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid hospital credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!regData.licenseNumber.trim()) {
      setError('Hospital clinical license number is required for verification.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await registerHospitalAccount({
        name: regData.name,
        licenseNumber: regData.licenseNumber,
        country: regData.country,
        state: regData.state,
        district: regData.district,
        address: regData.address,
        nodalOfficer: regData.nodalOfficer,
        contactPhone: regData.contactPhone,
        email: regData.email,
      });

      setSuccess(
        `Hospital application submitted successfully for ${created.name}. Assigned Ticket: ${created.hospitalId}. The administrative committee will review clinical accreditation and dispatch your Hospital Access Key.`
      );
      showToast('Hospital registration submitted for authorization review.', 'info');
      setActiveTab('login');
      setLoginData((prev) => ({ ...prev, identifier: regData.email }));
    } catch (err) {
      setError(err.message || 'Failed to submit hospital registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#050505] relative overflow-hidden">
      {/* Ambient Red Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#E50914]/12 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        {/* Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="large" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#180a0c] border border-[#E50914]/40 text-xs font-bold text-[#FF2B2B] mt-4 mb-2">
            <Building className="w-3.5 h-3.5" />
            <span>CLINICAL & INSTITUTIONAL GATEWAY</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Authorized Hospital Portal
          </h2>
          <p className="text-sm text-[#B0B0B0] mt-1 max-w-md">
            Secure blood bank dispatch, emergency donor matching, and patient transfusion coordination.
          </p>
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="flex rounded-2xl bg-white/[0.05] backdrop-blur-xl p-1.5 border border-white/10 mb-6 shadow-sm">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.4)]'
                : 'text-[#B0B0B8] hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>HOSPITAL LOGIN</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.4)]'
                : 'text-[#B0B0B8] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>REQUEST HOSPITAL AUTHORIZATION</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="glass-lvl2 border border-white/15 hover:border-white/25 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all relative overflow-hidden">
          {/* Top edge glass reflection highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-400 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {/* ====================================================
              TAB 1: HOSPITAL LOGIN
              ==================================================== */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {/* Hospital User Key */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                  Hospital User Key *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="e.g. TN11-KARUR-001 or BB-T-01-4E5A"
                    value={loginData.userKey}
                    onChange={(e) => setLoginData({ ...loginData, userKey: e.target.value.toUpperCase() })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-11 pr-4 py-3 text-sm text-white font-mono placeholder-[#555] outline-none transition-colors uppercase"
                  />
                  <Key className="w-4 h-4 text-[#FF2B2B] absolute left-4 top-3.5" />
                </div>
                <p className="text-[11px] text-[#737373] mt-1.5 leading-relaxed">
                  Enter your unique institutional credential key from the official dataset.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                  Hospital Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter hospital password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors font-mono"
                  />
                  <Lock className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[#737373] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_35px_rgba(229,9,20,0.8)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING HOSPITAL CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>LOGIN TO HOSPITAL DASHBOARD</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-[#B0B0B0]">
                Are you a voluntary blood donor?{' '}
                <Link to="/login" className="text-[#FF2B2B] hover:underline font-bold">
                  User / Donor Login
                </Link>
              </div>
            </form>
          )}

          {/* ====================================================
              TAB 2: HOSPITAL REGISTRATION
              ==================================================== */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#170a0c] border border-[#E50914]/30 text-xs text-[#B0B0B0] leading-relaxed mb-4">
                <strong className="text-white">Institutional Notice:</strong> Hospital accounts undergo strict clinical verification. Personal user registrations must use the voluntary donor portal.
              </div>

              {/* Hospital Legal Name */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Hospital / Medical Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Speciality Hospitals"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                />
              </div>

              {/* License Number & Official Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Clinical License / Reg No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN-MED-4491-KAR"
                    value={regData.licenseNumber}
                    onChange={(e) => setRegData({ ...regData, licenseNumber: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Official Hospital Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="blooddesk@hospital.org"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>
              </div>

              {/* State & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    State *
                  </label>
                  <select
                    value={regState}
                    onChange={(e) => {
                      const nextState = e.target.value;
                      setRegState(nextState);
                      const districts = getDistricts(defaultCountry, nextState);
                      setRegData({ ...regData, state: nextState, district: districts[0] || '' });
                    }}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
                  >
                    {getStates().map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    District *
                  </label>
                  <select
                    value={regData.district}
                    onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
                  >
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Complete Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trichy Main Road, Karur, Tamil Nadu 639005"
                  value={regData.address}
                  onChange={(e) => setRegData({ ...regData, address: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                />
              </div>

              {/* Nodal Officer & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Nodal Transfusion Officer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. R. Vignesh (Chief In-Charge)"
                    value={regData.nodalOfficer}
                    onChange={(e) => setRegData({ ...regData, nodalOfficer: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Emergency Desk Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 4324 245000"
                    value={regData.contactPhone}
                    onChange={(e) => setRegData({ ...regData, contactPhone: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>
              </div>

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regData.confirmPassword}
                    onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SUBMITTING INSTITUTIONAL CREDENTIALS...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>SUBMIT APPLICATION FOR AUTHORIZATION</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
