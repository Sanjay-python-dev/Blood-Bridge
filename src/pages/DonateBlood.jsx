import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, UserPlus, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { bloodGroups } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getStates, getDistricts, defaultCountry, defaultState } from '../services/locationService';
import { registerNewDonor } from '../services/donorService';
import { MEDICAL_ELIGIBILITY_DISCLAIMER } from '../services/eligibilityService';
import { showToast } from '../components/Toast';

export default function DonateBlood() {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdDonorId, setCreatedDonorId] = useState('BB-TN-8924');

  const [selectedState, setSelectedState] = useState(defaultState);
  const availableDistricts = getDistricts(defaultCountry, selectedState);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    bloodGroup: '',
    country: defaultCountry,
    state: defaultState,
    city: availableDistricts[0] || 'Karur',
    area: '',
    lastDonationDate: '',
    isAvailable: true,
    medicalEligibility: false,
  });

  // Prefill user details if logged in
  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || profile?.full_name || '',
        email: prev.email || profile?.email || user?.email || '',
        phone: prev.phone || profile?.phone || '',
      }));
    }
  }, [profile, user]);

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    const districts = getDistricts(defaultCountry, newState);
    setFormData((prev) => ({
      ...prev,
      state: newState,
      city: districts[0] || '',
    }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid email is required';
    if (!formData.phone.trim() || formData.phone.length < 10) errs.phone = '10-digit mobile number required';
    if (!formData.dob) {
      errs.dob = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dob);
      const ageDifMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDifMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (calculatedAge < 18 || calculatedAge > 65) {
        errs.dob = 'Donors must be between 18 and 65 years of age';
      }
    }
    if (!formData.bloodGroup) errs.bloodGroup = 'Please select your blood group';
    if (!formData.area.trim()) errs.area = 'Area/Locality is required';
    if (!formData.medicalEligibility) errs.medicalEligibility = 'You must confirm medical eligibility';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let calculatedAge = 25;
      if (formData.dob) {
        const birthDate = new Date(formData.dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      // Register via service
      const newDonor = await registerNewDonor({
        ...formData,
        age: calculatedAge,
        state: selectedState,
        district: formData.city,
      }, user?.id);

      if (refreshProfile) {
        await refreshProfile();
      }

      setCreatedDonorId(`BB-TN-${newDonor.id ? String(newDonor.id).slice(-4).toUpperCase() : '8924'}`);
      setSubmitted(true);
      showToast('Thank you! Your voluntary donor profile is active.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err.message || 'Failed to register as donor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {!submitted ? (
          <div>
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-3">
                DONOR REGISTRATION
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Become a <span className="text-[#E50914]">Life Saver</span>
              </h1>
              <p className="mt-3 text-base text-[#B0B0B0]">
                Register as a blood donor and help save lives across Tamil Nadu. Your single donation can save up to three lives.
              </p>
            </div>

            {/* Eligibility Quick Info Banner */}
            <div className="glass-lvl2 border border-white/15 rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-[#B0B0B8] shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#1d0b0e] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white">General Eligibility Criteria</p>
                <p>
                  Age 18–65, weight &gt; 45kg, minimum 3 months since your last donation, and feeling healthy with no active infection.
                </p>
              </div>
            </div>

            {/* Registration Form Card */}
            <form onSubmit={handleSubmit} className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-8 relative overflow-hidden">
              {/* Top edge glass reflection highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
              
              {serverError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed">{serverError}</span>
                </div>
              )}

              {/* Personal Details */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">1</span>
                  Personal Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sanjay Raj"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`w-full bg-[#161616] border ${
                        errors.fullName ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                    />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. sanjay@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full bg-[#161616] border ${
                        errors.email ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                    />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98421 87654"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full bg-[#161616] border ${
                        errors.phone ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                    />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className={`w-full bg-[#161616] border ${
                        errors.dob ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors`}
                    />
                    {errors.dob && <p className="text-xs text-red-500 mt-1">{errors.dob}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Blood Group *
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className={`w-full bg-[#161616] border ${
                        errors.bloodGroup ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-bold outline-none cursor-pointer`}
                    >
                      <option value="" disabled>Select Blood Group</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                    {errors.bloodGroup && <p className="text-xs text-red-500 mt-1">{errors.bloodGroup}</p>}
                  </div>
                </div>
              </div>

              {/* Location & Availability */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">2</span>
                  Location & Availability
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* State Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      State / Union Territory *
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      {getStates().map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      District / City *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Area / Locality *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Gandhi Gramam, Thanthonimalai"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      className={`w-full bg-[#161616] border ${
                        errors.area ? 'border-red-500' : 'border-[#2d2d2d]'
                      } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                    />
                    {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
                  </div>

                  {/* Last Blood Donation Date */}
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Last Blood Donation Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.lastDonationDate}
                      onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                    />
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex flex-col justify-center sm:col-span-2 pt-2">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                        className="w-5 h-5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-white">
                        Are you currently available to donate?
                      </span>
                    </label>
                    <span className="text-xs text-[#737373] ml-8 mt-1">
                      You can toggle your availability anytime from your donor dashboard.
                    </span>
                  </div>
                </div>
              </div>

              {/* Medical Eligibility Confirmation */}
              <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.medicalEligibility}
                    onChange={(e) => setFormData({ ...formData, medicalEligibility: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer flex-shrink-0"
                  />
                  <div className="text-xs text-[#B0B0B0] leading-relaxed">
                    <strong className="text-white">Medical Eligibility Confirmation: </strong>
                    I confirm that I am in good general health, weigh over 45 kg, have had no major surgeries in the last 6 months, and agree to voluntary donation without compensation.
                  </div>
                </label>
                {errors.medicalEligibility && (
                  <p className="text-xs text-red-500 pl-8">{errors.medicalEligibility}</p>
                )}
                <p className="text-[11px] text-[#737373] italic pl-8">
                  * {MEDICAL_ELIGIBILITY_DISCLAIMER}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-base font-black text-white shadow-[0_0_30px_rgba(229,9,20,0.6)] hover:shadow-[0_0_45px_rgba(229,9,20,0.9)] transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>REGISTERING DONOR...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>REGISTER AS DONOR</span>
                  </>
                )}
              </button>

            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="text-center py-16 bg-[#111111] border border-[#222222] rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(229,9,20,0.3)] animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-[#1e0a0d] border-2 border-[#E50914] text-[#FF2B2B] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(229,9,20,0.6)] animate-bounce">
              <Heart className="w-10 h-10 fill-[#FF2B2B]" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
              Thank You for Becoming a Blood Bridge Donor ❤️
            </h2>

            <p className="text-base text-[#B0B0B0] max-w-lg mx-auto mb-8 leading-relaxed">
              Your profile for <strong className="text-white">{formData.fullName}</strong> ({formData.bloodGroup}) in <strong className="text-white">{formData.city}</strong> has been successfully registered. You are now part of our live-saving emergency network!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-10 text-left">
              <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                <span className="text-[11px] text-[#737373] block">Assigned Donor ID</span>
                <span className="text-sm font-bold text-white font-mono">{createdDonorId}</span>
              </div>
              <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                <span className="text-[11px] text-[#737373] block">Blood Group</span>
                <span className="text-sm font-bold text-[#FF2B2B]">{formData.bloodGroup}</span>
              </div>
              <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                <span className="text-[11px] text-[#737373] block">Status</span>
                <span className="text-sm font-bold text-emerald-400">Active & Ready</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/donor-dashboard"
                className="px-8 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white font-bold text-sm shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
              >
                Go to Donor Dashboard
              </Link>
              <Link
                to="/find-blood"
                className="px-6 py-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/20 text-white font-semibold text-sm transition-all"
              >
                Browse Donor Directory
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
