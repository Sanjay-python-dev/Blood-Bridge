import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Mail,
  Lock,
  Phone,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Droplet,
  MapPin,
  Calendar,
  Heart,
  ArrowRight,
  ArrowLeft,
  Edit3,
  ShieldCheck,
  Check,
  Building,
  Info
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { TAMIL_NADU_DISTRICTS, locationData } from '../data/locationData';
import { showToast } from '../components/Toast';
import BloodAtmosphere from '../components/animations/BloodAtmosphere';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DONATION_COUNT_OPTIONS = ['1', '2–5', '6–10', '11–20', 'More than 20'];

export default function Register() {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/donor-dashboard');
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});

  // Maximum selectable donation date is today (YYYY-MM-DD)
  const todayDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    // Step 1: Account Information
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'donor', // 'donor' | 'requester'

    // Step 2: Blood Information - STRICTLY EMPTY / NULL INITIAL VALUE
    bloodGroup: '',

    // Step 3: Location Information - STRICTLY EMPTY DISTRICT
    state: 'Tamil Nadu',
    district: '',
    city: '',

    // Step 4: Donation History & Availability & Consent
    hasDonatedBefore: null, // null, true, false
    lastDonationDate: '',
    donationCount: '',
    isAvailableForDonation: null, // null, true, false
    accurateInfoConsent: false,
    privacyConsent: false,
  });

  // Calculate districts for selected state
  const currentCountry = locationData.find((c) => c.country === 'India');
  const availableStates = currentCountry ? currentCountry.states.map((s) => s.name) : ['Tamil Nadu'];
  const currentStateObj = currentCountry?.states.find(
    (s) => s.name.toLowerCase() === formData.state.toLowerCase()
  );
  const availableDistricts = currentStateObj
    ? currentStateObj.districts
    : TAMIL_NADU_DISTRICTS;

  // Real-time field updater
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setServerError('');
  };

  // -------------------------------------------------------------
  // Step-by-Step Validation Logic
  // -------------------------------------------------------------
  const validateStep = (step) => {
    const errs = {};

    if (step === 1) {
      // Full Name: Required, min 2 chars
      if (!formData.fullName.trim()) {
        errs.fullName = 'Full Name is required.';
      } else if (formData.fullName.trim().length < 2) {
        errs.fullName = 'Full Name must be at least 2 characters.';
      }

      // Email Address: Required, valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        errs.email = 'Email Address is required.';
      } else if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }

      // Mobile Number: Required, Indian mobile validation
      const cleanDigits = formData.phone.replace(/\D/g, '');
      const validTenDigits = cleanDigits.length === 10
        ? cleanDigits
        : (cleanDigits.length === 12 && cleanDigits.startsWith('91'))
          ? cleanDigits.slice(2)
          : '';

      if (!formData.phone.trim()) {
        errs.phone = 'Mobile Number is required.';
      } else if (!validTenDigits || !/^[6-9]\d{9}$/.test(validTenDigits)) {
        errs.phone = 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).';
      }

      // Password: Required, min 8 characters
      if (!formData.password) {
        errs.password = 'Password is required.';
      } else if (formData.password.length < 8) {
        errs.password = 'Password must be at least 8 characters.';
      }

      // Confirm Password: Required, must match
      if (!formData.confirmPassword) {
        errs.confirmPassword = 'Confirm Password is required.';
      } else if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }

    if (step === 2) {
      // Blood Group: Required, NO DEFAULT!
      if (!formData.bloodGroup) {
        errs.bloodGroup = 'Please select your blood group.';
      }
    }

    if (step === 3) {
      // District: Required, NO DEFAULT!
      if (!formData.district) {
        errs.district = 'Please select your district.';
      }
    }

    if (step === 4) {
      // Has donated before: Required
      if (formData.hasDonatedBefore === null) {
        errs.hasDonatedBefore = 'Please select whether you have donated blood before.';
      } else if (formData.hasDonatedBefore === true) {
        // Last donation date is required
        if (!formData.lastDonationDate) {
          errs.lastDonationDate = 'Please enter your last blood donation date.';
        } else if (formData.lastDonationDate > todayDate) {
          errs.lastDonationDate = 'Last donation date cannot be in the future.';
        }
      }

      // Willing to donate: Required
      if (formData.isAvailableForDonation === null) {
        errs.isAvailableForDonation = 'Please select your current donation availability.';
      }

      // Accuracy confirmation: Required
      if (!formData.accurateInfoConsent) {
        errs.accurateInfoConsent = 'Please confirm that the information provided is accurate.';
      }

      // Privacy Consent: Required
      if (!formData.privacyConsent) {
        errs.privacyConsent = 'Please accept the privacy consent to continue.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Move to Next Step
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Move to Previous Step
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Jump to specific step for editing
  const handleEditStep = (stepNumber) => {
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format phone preview
  const getFormattedPhonePreview = () => {
    const digits = formData.phone.replace(/\D/g, '');
    const tenDigits = digits.length > 10 ? digits.slice(-10) : digits;
    if (tenDigits.length === 10) {
      return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
    }
    return `+91 ${formData.phone}`;
  };

  // Final Registration Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    // Re-verify all steps
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const cleanDigits = formData.phone.replace(/\D/g, '');
      const tenDigits = cleanDigits.length > 10 ? cleanDigits.slice(-10) : cleanDigits;
      const formattedWithCountryCode = `+91 ${tenDigits}`;

      const data = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone: formattedWithCountryCode,
        userType: formData.userType,
        bloodGroup: formData.bloodGroup,
        state: formData.state,
        district: formData.district,
        city: formData.city?.trim() || formData.district,
        hasDonatedBefore: formData.hasDonatedBefore,
        lastDonationDate: formData.hasDonatedBefore ? formData.lastDonationDate : null,
        donationCount: formData.hasDonatedBefore ? formData.donationCount : null,
        isAvailableForDonation: formData.isAvailableForDonation,
      });

      showToast('Account created successfully!', 'success');
      setSuccessMessage('Account created successfully! Redirecting to BloodBridge Dashboard...');

      setTimeout(() => {
        navigate('/donor-dashboard');
      }, 1000);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setServerError('An account with this email already exists. Please log in or use another email.');
      } else if (msg.toLowerCase().includes('weak_password') || msg.toLowerCase().includes('password')) {
        setServerError('Password does not meet security requirements. Please choose a stronger password.');
      } else {
        setServerError('Unable to create your account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { id: 1, label: 'Account Information', short: 'Account' },
    { id: 2, label: 'Blood Information', short: 'Blood Group' },
    { id: 3, label: 'Location', short: 'Location' },
    { id: 4, label: 'Donation History', short: 'Donation' },
    { id: 5, label: 'Review & Create', short: 'Review' },
  ];

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#050505] relative overflow-hidden">
      
      {/* Background Red Ambient Glow */}
      <BloodAtmosphere intensity={0.1} dropCount={0} particleCount={4} />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#E50914]/12 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        
        {/* Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="large" />
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-6 tracking-tight">
            Join Blood Bridge
          </h2>
          <p className="text-sm text-[#B0B0B0] mt-1 font-medium">
            Step {currentStep} of 5 — {stepsList[currentStep - 1].label}
          </p>
        </div>

        {/* Progress Indicator 1 -> 2 -> 3 -> 4 -> 5 */}
        <div className="mb-8 px-2 sm:px-4">
          <div className="flex items-center justify-between relative">
            {/* Background Line */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-[#222222] -z-0" />
            {/* Active Filled Line */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-[#FF2B2B] to-[#E50914] transition-all duration-500 -z-0"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />

            {stepsList.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <button
                  type="button"
                  key={step.id}
                  id={`progress-step-${step.id}`}
                  onClick={() => {
                    // Allow navigating back to completed steps
                    if (step.id < currentStep) {
                      setCurrentStep(step.id);
                    }
                  }}
                  disabled={step.id > currentStep}
                  className={`relative z-10 flex flex-col items-center group transition-transform ${
                    step.id < currentStep ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm border-2 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-[#E50914] border-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.6)]'
                        : isCurrent
                          ? 'bg-[#18080a] border-[#FF2B2B] text-white shadow-[0_0_20px_rgba(229,9,20,0.8)] scale-110'
                          : 'bg-[#121212] border-[#2e2e2e] text-[#737373]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 text-white stroke-[3]" /> : step.id}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-semibold mt-2 hidden sm:block tracking-tight transition-colors ${
                      isCurrent ? 'text-white font-bold' : isCompleted ? 'text-[#B0B0B0]' : 'text-[#555555]'
                    }`}
                  >
                    {step.short}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-lvl2 border border-white/15 hover:border-white/25 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all relative overflow-hidden">
          {/* Top edge glass reflection highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          
          {/* Server Error Alert */}
          {serverError && (
            <div
              id="registration-server-error"
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed font-medium">{serverError}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMessage && (
            <div
              id="registration-success-message"
              className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-400 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed font-semibold">{successMessage}</span>
            </div>
          )}

          {/* ========================================================
              STEP 1: BASIC ACCOUNT INFORMATION
              ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/5 pb-4">
                <h3 className="text-xl font-black text-white">Step 1: Basic Account Information</h3>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  Enter your credentials to create your secure BloodBridge portal account.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="reg-full-name"
                    placeholder="e.g. Sanjay Raj"
                    value={formData.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className={`w-full bg-[#161616] border ${
                      errors.fullName ? 'border-red-500' : 'border-[#2d2d2d]'
                    } focus:border-[#E50914] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                  />
                  <User className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
                </div>
                {errors.fullName && <p className="text-xs text-red-500 mt-1 font-medium">{errors.fullName}</p>}
              </div>

              {/* Email / Gmail Address */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Email / Gmail Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="reg-email"
                    placeholder="e.g. sanjay@gmail.com"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={`w-full bg-[#161616] border ${
                      errors.email ? 'border-red-500' : 'border-[#2d2d2d]'
                    } focus:border-[#E50914] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                  />
                  <Mail className="w-4 h-4 text-[#737373] absolute left-4 top-3.5" />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
                <span className="text-[11px] text-[#737373] mt-1 block">
                  This email will be used for authentication and emergency communication.
                </span>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center gap-1.5 text-xs font-bold text-[#B0B0B0] border-r border-[#333] pr-2 pointer-events-none">
                    <span className="text-sm">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    id="reg-phone"
                    placeholder="98421 87654"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={`w-full bg-[#161616] border ${
                      errors.phone ? 'border-red-500' : 'border-[#2d2d2d]'
                    } focus:border-[#E50914] rounded-xl pl-20 pr-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                  />
                  <Phone className="w-4 h-4 text-[#737373] absolute right-4 top-3.5" />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone}</p>}
                <span className="text-[11px] text-[#737373] mt-1 block">
                  Stored with country code +91 for instant donor/requester connectivity.
                </span>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="reg-password"
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className={`w-full bg-[#161616] border ${
                        errors.password ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl pl-10 pr-10 py-3 text-sm text-white outline-none transition-colors`}
                    />
                    <Lock className="w-4 h-4 text-[#737373] absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      id="toggle-password-visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-[#737373] hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="reg-confirm-password"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      className={`w-full bg-[#161616] border ${
                        errors.confirmPassword ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl pl-10 pr-10 py-3 text-sm text-white outline-none transition-colors`}
                    />
                    <Lock className="w-4 h-4 text-[#737373] absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      id="toggle-confirm-password-visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-[#737373] hover:text-white"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: BLOOD INFORMATION (DEDICATED SECTION)
              IMPORTANT: Blood group must NEVER be automatically set to O+!
              Initial value is NULL / empty.
              ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/5 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c080a] border border-[#E50914]/40 text-xs font-bold text-[#FF2B2B] mb-2">
                  <Droplet className="w-3.5 h-3.5 fill-current" />
                  <span>Clinical Blood Profile</span>
                </div>
                <h3 className="text-xl font-black text-white">Step 2: Blood Information</h3>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  Please select your exact blood group. BloodBridge matches lives based on strict immunological compatibility.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-3">
                  Blood Group *
                </label>

                {/* Visually clear selection cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {BLOOD_GROUPS.map((group) => {
                    const isSelected = formData.bloodGroup === group;
                    return (
                      <button
                        type="button"
                        key={group}
                        id={`blood-group-card-${group.replace('+', 'pos').replace('-', 'neg')}`}
                        onClick={() => updateField('bloodGroup', group)}
                        className={`p-4 rounded-2xl border text-center transition-all duration-200 transform hover:-translate-y-0.5 flex flex-col items-center justify-center relative ${
                          isSelected
                            ? 'bg-[#1e0a0d] border-[#E50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] ring-2 ring-[#E50914]/50'
                            : 'bg-[#151515] border-[#2a2a2a] text-[#B0B0B0] hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#E50914] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </span>
                        )}
                        <Droplet className={`w-5 h-5 mb-1 ${isSelected ? 'text-[#FF2B2B] fill-[#FF2B2B]' : 'text-[#737373]'}`} />
                        <span className="text-xl font-black tracking-tight">{group}</span>
                        <span className="text-[10px] text-[#737373] mt-0.5 uppercase tracking-wider font-mono">
                          {group.includes('+') ? 'Rh Positive' : 'Rh Negative'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {errors.bloodGroup && (
                  <div id="blood-group-error" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 mt-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errors.bloodGroup}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex items-start gap-3 text-xs text-[#8e8e8e]">
                <Info className="w-4 h-4 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
                <span>
                  Notice: BloodBridge never automatically defaults or preselects any blood type. Your explicit selection guarantees clinical accuracy during emergency alerts.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: LOCATION INFORMATION
              State default: Tamil Nadu
              District dropdown: All 36 TN districts, no default selection
              City / Taluk: Optional
              ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/5 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c080a] border border-[#E50914]/40 text-xs font-bold text-[#FF2B2B] mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Geographic Reach</span>
                </div>
                <h3 className="text-xl font-black text-white">Step 3: Location</h3>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  Specify your region so BloodBridge can connect you with hyper-local patients and emergency blood banks.
                </p>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  State / Territory *
                </label>
                <div className="relative">
                  <select
                    id="reg-state-select"
                    value={formData.state}
                    onChange={(e) => {
                      updateField('state', e.target.value);
                      updateField('district', ''); // Reset district when state changes
                    }}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer"
                  >
                    {availableStates.map((s) => (
                      <option key={s} value={s} className="bg-[#111] text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                  <Building className="w-4 h-4 text-[#737373] absolute right-4 top-3.5 pointer-events-none" />
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">
                  Defaults to Tamil Nadu. You may select another state for nationwide coverage.
                </span>
              </div>

              {/* District */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  District *
                </label>
                <div className="relative">
                  <select
                    id="reg-district-select"
                    value={formData.district}
                    onChange={(e) => updateField('district', e.target.value)}
                    className={`w-full bg-[#161616] border ${
                      errors.district ? 'border-red-500' : 'border-[#2d2d2d]'
                    } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer`}
                  >
                    <option value="" disabled className="text-[#666]">
                      Select your district
                    </option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d} className="bg-[#111] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                  <MapPin className="w-4 h-4 text-[#737373] absolute right-4 top-3.5 pointer-events-none" />
                </div>
                {errors.district && <p id="district-error" className="text-xs text-red-500 mt-1 font-medium">{errors.district}</p>}
                <span className="text-[11px] text-[#737373] mt-1 block">
                  Please explicitly select the administrative district you reside in.
                </span>
              </div>

              {/* City / Taluk (Optional) */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  City / Taluk (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="reg-city-input"
                    placeholder="e.g. Kulithalai, Aravakurichi, Gandhigram"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">
                  Allows more precise donor discovery and faster emergency matching.
                </span>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: BLOOD DONATION HISTORY & AVAILABILITY
              ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/5 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c080a] border border-[#E50914]/40 text-xs font-bold text-[#FF2B2B] mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Donation History & Availability</span>
                </div>
                <h3 className="text-xl font-black text-white">Step 4: Blood Donation History</h3>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  Provide your past donation track record and confirm your willingness to donate.
                </p>
              </div>

              {/* Have you donated blood before? */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2.5">
                  Have you donated blood before? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="donated-before-yes"
                    onClick={() => updateField('hasDonatedBefore', true)}
                    className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formData.hasDonatedBefore === true
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0] hover:border-white/20'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      formData.hasDonatedBefore === true ? 'border-[#E50914]' : 'border-[#555]'
                    }`}>
                      {formData.hasDonatedBefore === true && <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />}
                    </span>
                    <span>Yes</span>
                  </button>

                  <button
                    type="button"
                    id="donated-before-no"
                    onClick={() => {
                      updateField('hasDonatedBefore', false);
                      updateField('lastDonationDate', '');
                      updateField('donationCount', '');
                    }}
                    className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formData.hasDonatedBefore === false
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0] hover:border-white/20'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      formData.hasDonatedBefore === false ? 'border-[#E50914]' : 'border-[#555]'
                    }`}>
                      {formData.hasDonatedBefore === false && <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />}
                    </span>
                    <span>No</span>
                  </button>
                </div>
                {errors.hasDonatedBefore && (
                  <p id="has-donated-error" className="text-xs text-red-500 mt-1 font-medium">{errors.hasDonatedBefore}</p>
                )}
              </div>

              {/* Sub-fields if Yes */}
              {formData.hasDonatedBefore === true && (
                <div className="p-5 rounded-2xl bg-[#141414] border border-[#2d2d2d] space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                      Last Blood Donation Date *
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="reg-last-donation-date"
                        max={todayDate}
                        value={formData.lastDonationDate}
                        onChange={(e) => updateField('lastDonationDate', e.target.value)}
                        className={`w-full bg-[#1a1a1a] border ${
                          errors.lastDonationDate ? 'border-red-500' : 'border-[#333]'
                        } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none`}
                      />
                    </div>
                    {errors.lastDonationDate && (
                      <p id="last-donation-date-error" className="text-xs text-red-500 mt-1 font-medium">{errors.lastDonationDate}</p>
                    )}
                    <span className="text-[11px] text-[#737373] mt-1 block">
                      Maximum selectable date is today. Future dates are disallowed.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                      How many times have you donated blood? (Optional)
                    </label>
                    <select
                      id="reg-donation-count-select"
                      value={formData.donationCount}
                      onChange={(e) => updateField('donationCount', e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-[#333] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="">Select donation count</option>
                      {DONATION_COUNT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#111]">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 5. Donor Availability */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2.5">
                  Are you currently willing to donate blood? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="willing-to-donate-yes"
                    onClick={() => updateField('isAvailableForDonation', true)}
                    className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formData.isAvailableForDonation === true
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0] hover:border-white/20'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      formData.isAvailableForDonation === true ? 'border-[#E50914]' : 'border-[#555]'
                    }`}>
                      {formData.isAvailableForDonation === true && <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />}
                    </span>
                    <span>Yes, I am willing to donate</span>
                  </button>

                  <button
                    type="button"
                    id="willing-to-donate-no"
                    onClick={() => updateField('isAvailableForDonation', false)}
                    className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      formData.isAvailableForDonation === false
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0] hover:border-white/20'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      formData.isAvailableForDonation === false ? 'border-[#E50914]' : 'border-[#555]'
                    }`}>
                      {formData.isAvailableForDonation === false && <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />}
                    </span>
                    <span>No, not currently</span>
                  </button>
                </div>
                {errors.isAvailableForDonation && (
                  <p id="availability-error" className="text-xs text-red-500 mt-1 font-medium">{errors.isAvailableForDonation}</p>
                )}
              </div>

              {/* 6. Important Eligibility Notice */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-[#B0B0B0] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
                  <span>
                    Blood donation eligibility may depend on age, health, medications, recent illnesses, and other factors. BloodBridge does not determine medical eligibility. Final eligibility should be confirmed by an authorized blood bank or healthcare professional.
                  </span>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none pt-2 border-t border-white/5">
                  <input
                    type="checkbox"
                    id="reg-accurate-info-checkbox"
                    checked={formData.accurateInfoConsent}
                    onChange={(e) => updateField('accurateInfoConsent', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs text-white font-medium">
                    I understand that the information I provide should be accurate. *
                  </span>
                </label>
                {errors.accurateInfoConsent && (
                  <p id="accuracy-consent-error" className="text-xs text-red-500 pl-7 font-medium">{errors.accurateInfoConsent}</p>
                )}
              </div>

              {/* 7. Privacy Consent */}
              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="reg-privacy-consent-checkbox"
                    checked={formData.privacyConsent}
                    onChange={(e) => updateField('privacyConsent', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-xs text-[#B0B0B0] leading-relaxed">
                    I agree to BloodBridge storing my profile information to provide blood donation and blood request services. *
                  </span>
                </label>
                {errors.privacyConsent && (
                  <p id="privacy-consent-error" className="text-xs text-red-500 pl-7 font-medium">{errors.privacyConsent}</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 5: REVIEW & CREATE ACCOUNT
              Complete summary before registration with inline Edit links
              ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-white/5 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1c080a] border border-[#E50914]/40 text-xs font-bold text-[#FF2B2B] mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Final Verification</span>
                </div>
                <h3 className="text-xl font-black text-white">Step 5: Review & Create Account</h3>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  Please verify your details before creating your account. You can click Edit on any section to make changes.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                
                {/* Section 1: Account Information */}
                <div className="p-4 rounded-2xl bg-[#151515] border border-[#262626]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-[#B0B0B0] uppercase tracking-wider flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#FF2B2B]" />
                      Account Details
                    </span>
                    <button
                      type="button"
                      id="edit-step-1"
                      onClick={() => handleEditStep(1)}
                      className="text-xs font-bold text-[#FF2B2B] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-[#737373] block">Full Name:</span>
                      <span className="text-white font-bold">{formData.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[#737373] block">Email Address:</span>
                      <span className="text-white font-medium">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-[#737373] block">Mobile:</span>
                      <span className="text-white font-medium">{getFormattedPhonePreview()}</span>
                    </div>
                    <div>
                      <span className="text-[#737373] block">Account Status:</span>
                      <span className="text-emerald-400 font-bold uppercase">Active Member</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Blood Information */}
                <div className="p-4 rounded-2xl bg-[#151515] border border-[#262626]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-[#B0B0B0] uppercase tracking-wider flex items-center gap-2">
                      <Droplet className="w-3.5 h-3.5 text-[#FF2B2B]" />
                      Blood Profile
                    </span>
                    <button
                      type="button"
                      id="edit-step-2"
                      onClick={() => handleEditStep(2)}
                      className="text-xs font-bold text-[#FF2B2B] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs">
                    <div className="w-12 h-12 rounded-xl bg-[#1f0a0d] border border-[#E50914] flex items-center justify-center text-xl font-black text-[#FF2B2B]">
                      {formData.bloodGroup || 'None'}
                    </div>
                    <div>
                      <span className="text-sm font-black text-white">{formData.bloodGroup} Blood Group</span>
                      <span className="text-[#737373] block text-[11px]">Explicitly confirmed by user</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Location */}
                <div className="p-4 rounded-2xl bg-[#151515] border border-[#262626]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-[#B0B0B0] uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#FF2B2B]" />
                      Location
                    </span>
                    <button
                      type="button"
                      id="edit-step-3"
                      onClick={() => handleEditStep(3)}
                      className="text-xs font-bold text-[#FF2B2B] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-[#737373] block">District:</span>
                      <span className="text-white font-bold">{formData.district}</span>
                    </div>
                    <div>
                      <span className="text-[#737373] block">State:</span>
                      <span className="text-white font-medium">{formData.state}</span>
                    </div>
                    {formData.city && (
                      <div>
                        <span className="text-[#737373] block">City / Taluk:</span>
                        <span className="text-white font-medium">{formData.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Donation History & Availability */}
                <div className="p-4 rounded-2xl bg-[#151515] border border-[#262626]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-[#B0B0B0] uppercase tracking-wider flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-[#FF2B2B]" />
                      Donation & Availability
                    </span>
                    <button
                      type="button"
                      id="edit-step-4"
                      onClick={() => handleEditStep(4)}
                      className="text-xs font-bold text-[#FF2B2B] hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-[#737373] block">Previously Donated:</span>
                      <span className="text-white font-bold">{formData.hasDonatedBefore ? 'Yes' : 'No'}</span>
                    </div>
                    {formData.hasDonatedBefore && (
                      <div>
                        <span className="text-[#737373] block">Last Donation Date:</span>
                        <span className="text-white font-bold">{formData.lastDonationDate}</span>
                      </div>
                    )}
                    {formData.hasDonatedBefore && formData.donationCount && (
                      <div>
                        <span className="text-[#737373] block">Times Donated:</span>
                        <span className="text-white font-medium">{formData.donationCount}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#737373] block">Available to Donate:</span>
                      <span className={`font-bold ${formData.isAvailableForDonation ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {formData.isAvailableForDonation ? 'Yes (Active Donor)' : 'No (Not Currently Available)'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Form Action Controls (Back / Continue / Create Account) */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between gap-4">
            {currentStep > 1 ? (
              <button
                type="button"
                id="reg-back-button"
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl bg-[#181818] hover:bg-[#222222] text-xs font-bold text-white border border-[#333] transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>BACK</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                id="reg-continue-button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2 ml-auto"
              >
                <span>CONTINUE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="reg-submit-button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-xs font-black text-white shadow-[0_0_30px_rgba(229,9,20,0.7)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>CREATING ACCOUNT...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>CREATE ACCOUNT</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Already have an account */}
          <div className="mt-8 text-center text-xs text-[#B0B0B0] border-t border-white/5 pt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF2B2B] hover:underline font-bold">
              LOGIN
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
