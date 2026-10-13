import React, { useState, useEffect, useRef, Component } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  Flame,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  ArrowRight,
  Loader2,
  Upload,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  Search,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { bloodGroups, BOMBAY_BLOOD_GROUP } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { getStates, getDistricts, defaultCountry, defaultState } from '../services/locationService';
import { createBloodRequest } from '../services/requestService';
import { showToast } from '../components/Toast';
import BombayRequestModal from '../components/BombayRequestModal';
import RequestDetailsModal from '../components/RequestDetailsModal';

class RequestBloodErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RequestBlood runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center py-20 px-4">
          <div className="max-w-md w-full text-center bg-[#101015] border border-white/15 rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Unable to load the blood request page.
            </h2>
            <p className="text-sm text-[#8E8E93] mb-6 leading-relaxed">
              Please try again.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white text-sm font-bold shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequestBlood() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // URL query pre-fills
  const initialUrgency = searchParams.get('urgency') === 'Emergency' ? 'Emergency' : 'Urgent';
  const initialGroup = searchParams.get('group') || '';

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Bombay Blood Group Intercept Modal State
  const [showBombayModal, setShowBombayModal] = useState(false);

  // Success Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Location Hierarchy State
  const [selectedState, setSelectedState] = useState(defaultState || 'Tamil Nadu');
  const availableDistricts = getDistricts(defaultCountry, selectedState) || [];
  const defaultDistrict = availableDistricts[0] || 'Karur';

  // Hospital autocomplete state
  const [hospitalSuggestions, setHospitalSuggestions] = useState([]);
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false);
  const hospitalRef = useRef(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    // Requester Information
    requesterName: '',
    requesterPhone: '',
    requesterEmail: '',
    // Patient Information
    patientName: '',
    patientAge: '',
    // Blood Requirement
    bloodGroup: initialGroup,
    unitsRequired: 2,
    urgency: initialUrgency,
    requiredDate: todayStr,
    // Hospital & Location
    hospitalName: '',
    hospitalLocation: '',
    district: defaultDistrict,
    city: defaultDistrict,
    hospitalContact: '',
    // Medical Requirement / Reason
    reason: '',
    // Optional Document
    documentName: '',
  });

  // Reset submitted state when user re-navigates to /request-blood or location key changes
  useEffect(() => {
    setSubmitted(false);
  }, [location.pathname, location.key]);

  // Update urgency/bloodGroup if searchParams change
  useEffect(() => {
    if (searchParams.get('urgency') === 'Emergency') {
      setFormData((prev) => ({ ...prev, urgency: 'Emergency' }));
    }
    if (searchParams.get('group')) {
      setFormData((prev) => ({ ...prev, bloodGroup: searchParams.get('group') }));
    }
  }, [searchParams]);

  // Prefill contact & requester info from authenticated account
  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        requesterName: prev.requesterName || profile?.full_name || profile?.name || user?.user_metadata?.full_name || '',
        requesterPhone: prev.requesterPhone || profile?.phone || '',
        requesterEmail: user?.email || profile?.email || '',
        district: prev.district || profile?.district || defaultDistrict,
        city: prev.city || profile?.city || profile?.district || defaultDistrict,
      }));
    }
  }, [profile, user, defaultDistrict]);

  // Sync state & district change
  const handleStateChange = (newState) => {
    setSelectedState(newState);
    const districts = getDistricts(defaultCountry, newState);
    setFormData((prev) => ({
      ...prev,
      district: districts[0] || '',
      city: districts[0] || '',
    }));
  };

  // Hospital Autocomplete Search
  const handleHospitalNameChange = async (val) => {
    setFormData((prev) => ({ ...prev, hospitalName: val }));
    if (formErrors.hospitalName) {
      setFormErrors((prev) => ({ ...prev, hospitalName: '' }));
    }

    if (val.trim().length >= 2) {
      try {
        const res = await fetch(`/api/hospitals/search?query=${encodeURIComponent(val.trim())}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          if (data.hospitals) {
            setHospitalSuggestions(data.hospitals);
            setShowHospitalDropdown(data.hospitals.length > 0);
          }
        }
      } catch (e) {
        // Fallback
      }
    } else {
      setShowHospitalDropdown(false);
    }
  };

  const handleSelectHospital = (hosp) => {
    setFormData((prev) => ({
      ...prev,
      hospitalName: hosp.hospital_name || hosp.name,
      hospitalLocation: hosp.location || prev.hospitalLocation,
      district: hosp.district || prev.district,
      city: hosp.district || prev.city,
    }));
    setShowHospitalDropdown(false);
  };

  // Close hospital dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hospitalRef.current && !hospitalRef.current.contains(e.target)) {
        setShowHospitalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Intercept Bombay Blood Group selection
  const handleBloodGroupChange = (bg) => {
    if (
      bg === BOMBAY_BLOOD_GROUP ||
      bg === 'Bombay Blood Group (Oh)' ||
      bg === 'Oh' ||
      bg.toLowerCase().includes('bombay')
    ) {
      // Intercept normal submission and launch protected Bombay protocol
      setShowBombayModal(true);
      showToast('Bombay Blood Group (Oh) is protected under clinical verification rules.', 'info');
      return;
    }

    setFormData((prev) => ({ ...prev, bloodGroup: bg }));
    if (formErrors.bloodGroup) {
      setFormErrors((prev) => ({ ...prev, bloodGroup: '' }));
    }
  };

  // Validate form before submit
  const validateForm = () => {
    const errors = {};

    // 1. Requester Name
    if (!formData.requesterName.trim()) {
      errors.requesterName = 'Please enter requester full name.';
    }

    // 2. Mobile Phone (Indian format validation)
    const rawDigits = formData.requesterPhone.replace(/\D/g, '');
    if (!rawDigits || (rawDigits.length !== 10 && !(rawDigits.length === 12 && rawDigits.startsWith('91')))) {
      errors.requesterPhone = 'Please enter a valid 10-digit Indian mobile number (e.g. 98421 87654).';
    }

    // 2b. Requester Email / Gmail validation
    const emailVal = (formData.requesterEmail || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      errors.requesterEmail = 'Please enter a valid contact email/Gmail address.';
    } else if (!emailRegex.test(emailVal)) {
      errors.requesterEmail = 'Please enter a valid email address (e.g. name@gmail.com).';
    }

    // 3. Patient Name
    if (!formData.patientName.trim()) {
      errors.patientName = 'Please enter the patient name.';
    }

    // 4. Blood Group
    if (!formData.bloodGroup) {
      errors.bloodGroup = 'Please select the required blood group.';
    }

    // 5. Units
    const units = parseInt(formData.unitsRequired, 10);
    if (!units || units < 1 || units > 20) {
      errors.unitsRequired = 'Units required must be between 1 and 20.';
    }

    // 6. Required Date
    if (!formData.requiredDate) {
      errors.requiredDate = 'Please select the required date.';
    } else if (formData.requiredDate < todayStr) {
      errors.requiredDate = 'Required date cannot be in the past.';
    }

    // 7. Hospital Information
    if (!formData.hospitalName.trim()) {
      errors.hospitalName = 'Please enter the hospital name.';
    }
    if (!formData.hospitalLocation.trim()) {
      errors.hospitalLocation = 'Please enter hospital location / address.';
    }
    if (!formData.district.trim()) {
      errors.district = 'Please select the district.';
    }
    if (!formData.hospitalContact.trim()) {
      errors.hospitalContact = 'Please enter doctor or hospital contact phone.';
    }

    // 8. Clinical Reason
    if (!formData.reason.trim()) {
      errors.reason = 'Please provide a short description or clinical reason for the transfusion.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      showToast('Please correct the highlighted errors in the form.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await createBloodRequest(
        {
          ...formData,
          state: selectedState,
          units: parseInt(formData.unitsRequired, 10),
        },
        user?.id
      );

      setCreatedRequest(created);
      setSubmitted(true);
      showToast('Blood request submitted! Regional donors are being matched.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error submitting blood request:', err);
      setServerError(err.message || 'Something went wrong while submitting your blood request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center py-24 px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#E50914]" />
          <p className="text-sm font-semibold tracking-wider text-[#8E8E93] uppercase">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  const isEmergencyUrgency = formData.urgency === 'Emergency';

  return (
    <div className="min-h-screen bg-[#050505] text-white py-14">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {!submitted ? (
          <div>
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] font-extrabold px-3.5 py-1 rounded-full mb-3 ${
                isEmergencyUrgency
                  ? 'bg-red-950/80 text-[#FF2B2B] border border-red-500/50 shadow-[0_0_15px_rgba(229,9,20,0.5)] animate-pulse'
                  : 'text-[#E50914] bg-[#1a080a] border border-[#E50914]/30'
              }`}>
                <Flame className="w-3.5 h-3.5 text-[#FF2B2B]" />
                <span>{isEmergencyUrgency ? 'EMERGENCY BLOOD DISPATCH' : 'BLOOD REQUEST DESK'}</span>
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Request <span className="text-[#E50914]">Blood</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#8E8E93]">
                Submit your clinical blood requirement to notify verified, voluntary donors across your district in real-time.
              </p>
            </div>

            {/* Emergency Medical Alert Box */}
            <div className="bg-gradient-to-r from-[rgba(42,4,7,0.8)] via-[rgba(26,5,7,0.75)] to-[rgba(18,0,2,0.8)] backdrop-blur-2xl border border-red-500/30 rounded-3xl p-5 mb-8 shadow-[0_16px_40px_rgba(229,9,20,0.25)] flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-[#FF2B2B] flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Important Clinical Notice
                </h4>
                <p className="text-xs text-[#B0B0B0] mt-1 leading-relaxed">
                  "If this is an immediate medical emergency, contact your hospital trauma desk or dial <strong className="text-white">108</strong> directly." BloodBridge coordinates voluntary community donors. All donor matches respect donor availability and clinical eligibility.
                </p>
              </div>
            </div>

            {/* Request Form */}
            <form onSubmit={handleSubmit} className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] space-y-10 relative overflow-hidden">
              {/* Top edge reflection highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

              {serverError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed">{serverError}</span>
                </div>
              )}

              {/* SECTION 1: REQUESTER INFORMATION */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-5 pb-3 border-b border-white/10 flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">1</span>
                    <span>REQUESTER INFORMATION</span>
                  </span>
                  {user && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Authenticated Account</span>
                    </span>
                  )}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kannan"
                      value={formData.requesterName}
                      onChange={(e) => {
                        setFormData({ ...formData, requesterName: e.target.value });
                        if (formErrors.requesterName) setFormErrors({ ...formErrors, requesterName: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.requesterName ? 'border-red-500 focus:border-red-400' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.requesterName && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.requesterName}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Mobile Number (Indian format) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={formData.requesterPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, requesterPhone: e.target.value });
                        if (formErrors.requesterPhone) setFormErrors({ ...formErrors, requesterPhone: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.requesterPhone ? 'border-red-500 focus:border-red-400' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.requesterPhone && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.requesterPhone}</span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
                        Email / Gmail Address <span className="text-[#FF2B2B]">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-wide bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
                        Mandatory
                      </span>
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="e.g. requester@gmail.com"
                      value={formData.requesterEmail}
                      onChange={(e) => {
                        setFormData({ ...formData, requesterEmail: e.target.value });
                        if (formErrors.requesterEmail) setFormErrors({ ...formErrors, requesterEmail: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.requesterEmail ? 'border-red-500 focus:border-red-400 bg-red-500/5' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.requesterEmail ? (
                      <span className="text-[11px] text-red-400 mt-1 block font-medium">{formErrors.requesterEmail}</span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        Mandatory: Verification receipts, hospital confirmations, and donor responses are dispatched to this email.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: PATIENT & BLOOD REQUIREMENT */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-5 pb-3 border-b border-white/10 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>BLOOD REQUIREMENT & PATIENT</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Meenakshi S"
                      value={formData.patientName}
                      onChange={(e) => {
                        setFormData({ ...formData, patientName: e.target.value });
                        if (formErrors.patientName) setFormErrors({ ...formErrors, patientName: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.patientName ? 'border-red-500 focus:border-red-400' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.patientName && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.patientName}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Patient Age
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      placeholder="e.g. 34"
                      value={formData.patientAge}
                      onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                      className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Units Required *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="20"
                      value={formData.unitsRequired}
                      onChange={(e) => {
                        setFormData({ ...formData, unitsRequired: e.target.value });
                        if (formErrors.unitsRequired) setFormErrors({ ...formErrors, unitsRequired: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors ${
                        formErrors.unitsRequired ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.unitsRequired && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.unitsRequired}</span>
                    )}
                  </div>

                  {/* Blood Group Select */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Blood Group Required *
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => handleBloodGroupChange(e.target.value)}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white font-black outline-none cursor-pointer ${
                        formErrors.bloodGroup ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    >
                      <option value="" disabled>Select Blood Group</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                      <option value={BOMBAY_BLOOD_GROUP} className="text-amber-400 font-bold">
                        ★ Bombay Blood Group (Oh) — Protected Protocol
                      </option>
                    </select>
                    {formErrors.bloodGroup && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.bloodGroup}</span>
                    )}
                  </div>

                  {/* Urgency Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Urgency Level *
                    </label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer transition-colors ${
                        formData.urgency === 'Emergency'
                          ? 'text-[#FF2B2B] border-red-500/60 bg-red-950/30'
                          : formData.urgency === 'Urgent'
                          ? 'text-amber-400 border-amber-500/40'
                          : 'text-emerald-400 border-[#2e2e38]'
                      }`}
                    >
                      <option value="Emergency">🚨 Emergency (Immediate)</option>
                      <option value="Urgent">🟠 Urgent (Within 24h)</option>
                      <option value="Planned">🟢 Planned (Scheduled)</option>
                    </select>
                  </div>

                  {/* Required Date */}
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Required By Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={formData.requiredDate}
                      onChange={(e) => {
                        setFormData({ ...formData, requiredDate: e.target.value });
                        if (formErrors.requiredDate) setFormErrors({ ...formErrors, requiredDate: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors ${
                        formErrors.requiredDate ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.requiredDate && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.requiredDate}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: HOSPITAL & LOCATION */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-5 pb-3 border-b border-white/10 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">3</span>
                  <span>HOSPITAL & REGIONAL LOCATION</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Hospital Name with Live Autocomplete */}
                  <div className="sm:col-span-2 relative" ref={hospitalRef}>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Hospital Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Speciality Hospitals / Govt Medical College Hospital"
                      value={formData.hospitalName}
                      onChange={(e) => handleHospitalNameChange(e.target.value)}
                      onFocus={() => {
                        if (hospitalSuggestions.length > 0) setShowHospitalDropdown(true);
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.hospitalName ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.hospitalName && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.hospitalName}</span>
                    )}

                    {/* Autocomplete Dropdown */}
                    {showHospitalDropdown && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#1a1a24] border border-white/15 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/5 animate-fadeIn">
                        {hospitalSuggestions.map((hosp) => (
                          <button
                            key={hosp.id}
                            type="button"
                            onClick={() => handleSelectHospital(hosp)}
                            className="w-full px-4 py-3 text-left hover:bg-white/10 flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <strong className="text-white block text-sm">{hosp.hospital_name || hosp.name}</strong>
                              <span className="text-[#8E8E93]">{hosp.location} • {hosp.district}</span>
                            </div>
                            <span className="text-[10px] text-sky-400 font-mono">Select</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hospital Location / Ward */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Hospital Location / Ward / ICU Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Trichy Main Road, 2nd Floor ICU, Bed 14"
                      value={formData.hospitalLocation}
                      onChange={(e) => {
                        setFormData({ ...formData, hospitalLocation: e.target.value });
                        if (formErrors.hospitalLocation) setFormErrors({ ...formErrors, hospitalLocation: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.hospitalLocation ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.hospitalLocation && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.hospitalLocation}</span>
                    )}
                  </div>

                  {/* State Select */}
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      State / UT *
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      {getStates().map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District / City Select */}
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      District / City *
                    </label>
                    <select
                      value={formData.district}
                      onChange={(e) => {
                        setFormData({ ...formData, district: e.target.value, city: e.target.value });
                        if (formErrors.district) setFormErrors({ ...formErrors, district: '' });
                      }}
                      className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer font-medium"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor / Hospital Contact */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Doctor / Hospital Blood Bank Contact Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 04324 240000 / +91 98421 22334"
                      value={formData.hospitalContact}
                      onChange={(e) => {
                        setFormData({ ...formData, hospitalContact: e.target.value });
                        if (formErrors.hospitalContact) setFormErrors({ ...formErrors, hospitalContact: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors ${
                        formErrors.hospitalContact ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.hospitalContact && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.hospitalContact}</span>
                    )}
                  </div>

                </div>
              </div>

              {/* SECTION 4: CLINICAL REASON & OPTIONAL ATTACHMENT */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-5 pb-3 border-b border-white/10 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">4</span>
                  <span>CLINICAL PURPOSE & ATTACHMENT</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Transfusion Requirement / Clinical Reason *
                    </label>
                    <textarea
                      rows="3"
                      required
                      placeholder="e.g. Patient scheduled for emergency cardiac bypass surgery. 2 units of whole blood needed immediately."
                      value={formData.reason}
                      onChange={(e) => {
                        setFormData({ ...formData, reason: e.target.value });
                        if (formErrors.reason) setFormErrors({ ...formErrors, reason: '' });
                      }}
                      className={`w-full bg-[#14141a] border rounded-xl p-4 text-sm text-white placeholder-[#555] outline-none resize-none transition-colors ${
                        formErrors.reason ? 'border-red-500' : 'border-[#2e2e38] focus:border-[#E50914]'
                      }`}
                    />
                    {formErrors.reason && (
                      <span className="text-[11px] text-red-400 mt-1 block">{formErrors.reason}</span>
                    )}
                  </div>

                  {/* Optional Document Upload Simulation */}
                  <div>
                    <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                      Hospital Requisition / Blood Slip (Optional)
                    </label>
                    <div className="border border-dashed border-white/20 rounded-2xl p-4 text-center bg-[#101014] hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <Upload className="w-6 h-6 text-[#8E8E93] mx-auto mb-1.5" />
                      <span className="text-xs text-[#B0B0B0] block">
                        {formData.documentName ? (
                          <strong className="text-emerald-400">{formData.documentName}</strong>
                        ) : (
                          'Attach hospital slip or blood requirement document (PDF, JPG, PNG)'
                        )}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        id="hospital-doc"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData((prev) => ({ ...prev, documentName: file.name }));
                            showToast(`Attached: ${file.name}`, 'info');
                          }
                        }}
                      />
                      <label
                        htmlFor="hospital-doc"
                        className="inline-block mt-2 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white cursor-pointer"
                      >
                        Choose File
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-base font-black text-white shadow-[0_0_35px_rgba(229,9,20,0.7)] hover:shadow-[0_0_50px_rgba(229,9,20,1)] transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>DISPATCHING BLOOD REQUEST...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5" />
                    <span>SUBMIT BLOOD REQUEST</span>
                  </>
                )}
              </button>

            </form>
          </div>
        ) : (
          /* SUCCESS CONFIRMATION SCREEN */
          <div className="text-center py-16 bg-[#101015] border border-white/15 rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(229,9,20,0.3)] animate-fadeIn relative overflow-hidden">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
              Blood Request Submitted Successfully! 🎉
            </h2>

            <p className="text-sm sm:text-base text-[#8E8E93] max-w-lg mx-auto mb-8 leading-relaxed">
              Your request for <strong className="text-white">{createdRequest?.unitsRequired || createdRequest?.units || formData?.unitsRequired || 1} Unit(s) of {createdRequest?.bloodGroup || formData?.bloodGroup || 'Blood'}</strong> at <strong className="text-white">{createdRequest?.hospitalName || (typeof createdRequest?.hospital === 'string' ? createdRequest?.hospital : createdRequest?.hospital?.name) || formData?.hospitalName || 'Hospital'} ({formData?.district || 'Karur'})</strong> has been dispatched to regional voluntary donors.
            </p>

            {/* Ticket Information Glass Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-10 text-left">
              <div className="bg-[#161620] p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] text-[#737373] block uppercase font-bold">Request ID</span>
                <span className="text-sm font-black text-white font-mono">{createdRequest?.requestCode || createdRequest?.code || createdRequest?.id || 'SUBMITTED'}</span>
              </div>
              <div className="bg-[#161620] p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] text-[#737373] block uppercase font-bold">Blood Group</span>
                <span className="text-sm font-black text-[#FF2B2B]">{createdRequest?.bloodGroup || formData?.bloodGroup || '—'}</span>
              </div>
              <div className="bg-[#161620] p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] text-[#737373] block uppercase font-bold">Urgency</span>
                <span className="text-sm font-bold text-amber-400">{createdRequest?.urgency || formData?.urgency || 'Urgent'}</span>
              </div>
              <div className="bg-[#161620] p-4 rounded-2xl border border-white/5">
                <span className="text-[10px] text-[#737373] block uppercase font-bold">Status</span>
                <span className="text-sm font-bold text-emerald-400">{createdRequest?.status || 'MATCHING'}</span>
              </div>
            </div>

            {/* Requester Contact Summary */}
            <div className="max-w-2xl mx-auto mb-10 p-4 rounded-2xl bg-[#14141a]/80 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] text-[#8E8E93] block uppercase font-bold tracking-wider mb-0.5">Requester Contact</span>
                <span className="text-sm font-bold text-white">{createdRequest?.requesterName || formData.requesterName}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {(createdRequest?.requesterPhone || formData.requesterPhone) && (
                  <a
                    href={`tel:${createdRequest?.requesterPhone || formData.requesterPhone}`}
                    className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>{createdRequest?.requesterPhone || formData.requesterPhone}</span>
                  </a>
                )}
                {(createdRequest?.requesterEmail || createdRequest?.email || formData.requesterEmail) && (
                  <a
                    href={`mailto:${createdRequest?.requesterEmail || createdRequest?.email || formData.requesterEmail}`}
                    className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-xl bg-white/5 border border-white/10 break-all"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>{createdRequest?.requesterEmail || createdRequest?.email || formData.requesterEmail}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setShowDetailsModal(true)}
                className="px-8 py-3.5 rounded-2xl bg-[#E50914] hover:bg-[#FF2B2B] text-white font-bold text-sm shadow-[0_0_25px_rgba(229,9,20,0.6)] transition-all flex items-center gap-2"
              >
                <span>Track This Request</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setCreatedRequest(null);
                  setServerError('');
                  setFormErrors({});
                  setFormData((prev) => ({
                    ...prev,
                    patientName: '',
                    patientAge: '',
                    reason: '',
                    documentName: '',
                    requiredDate: todayStr,
                  }));
                }}
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Submit Another Request</span>
              </button>

              <Link
                to="/my-requests"
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all"
              >
                View All My Requests
              </Link>

              <Link
                to="/find-blood"
                className="px-6 py-3.5 rounded-2xl bg-[#1a1a20] hover:bg-[#25252e] border border-white/10 text-white font-semibold text-sm transition-all"
              >
                Browse Matching Donors
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Protected Bombay Blood Group Modal */}
      {showBombayModal && (
        <BombayRequestModal
          isOpen={showBombayModal}
          onClose={() => setShowBombayModal(false)}
          initialDistrict={formData.district}
        />
      )}

      {/* Request Details / Timeline Modal */}
      {showDetailsModal && createdRequest && (
        <RequestDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          requestCode={createdRequest.requestCode || createdRequest.code || createdRequest.id}
        />
      )}
    </div>
  );
}

export default function RequestBloodPage(props) {
  return (
    <RequestBloodErrorBoundary>
      <RequestBlood {...props} />
    </RequestBloodErrorBoundary>
  );
}
