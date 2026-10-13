import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  Heart,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building,
  Clock,
  MapPin,
  Send,
  ToggleRight,
  UserCheck,
  Phone,
  Mail,
  User,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitDonorResponse } from '../services/hospitalRequirementService';
import { showToast } from './Toast';
import { bloodGroups } from '../data/mockData';
import { TAMIL_NADU_DISTRICTS } from '../data/locationData';

export default function DonateResponseModal({ isOpen, requirement, onClose, onSuccess }) {
  const navigate = useNavigate();
  const { user, profile, donorRecord, updateDonorAvailability } = useAuth();

  const [donorMessage, setDonorMessage] = useState('');
  const [hasConsented, setHasConsented] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [enablingAvail, setEnablingAvail] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Guest / Quick Voluntary Donor Form State (for unregistered users)
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestDistrict, setGuestDistrict] = useState(requirement?.district || 'Karur');
  const [guestAuthTab, setGuestAuthTab] = useState('quick'); // 'quick' | 'login'

  // Blood group override / confirmation for registered donors
  const [overrideBloodGroup, setOverrideBloodGroup] = useState(false);
  // Missing profile details form state
  const [manualBloodGroup, setManualBloodGroup] = useState(requirement?.blood_group || 'O+');
  const [manualDistrict, setManualDistrict] = useState(requirement?.district || 'Karur');

  if (!isOpen || !requirement) return null;

  // 1. Auth Check
  const isLoggedIn = Boolean(user);

  // 2. Profile Details
  const donorBloodGroup = manualBloodGroup || profile?.blood_group || donorRecord?.blood_group || null;
  const donorDistrict = manualDistrict || profile?.district || donorRecord?.district || null;
  const donorCity = profile?.city || donorRecord?.city || donorDistrict || '';
  const donorName = profile?.full_name || donorRecord?.full_name || user?.email?.split('@')[0] || 'Voluntary Donor';
  const donorPhone = profile?.phone || donorRecord?.phone || '';
  const donorEmail = user?.email || profile?.email || donorRecord?.email || '';

  const isProfileIncomplete = isLoggedIn && (!donorBloodGroup || !donorDistrict);

  // 3. Blood Group Match Check
  const isBloodGroupMatched = Boolean(
    overrideBloodGroup ||
    (donorBloodGroup && requirement.blood_group &&
     donorBloodGroup.trim().toUpperCase() === requirement.blood_group.trim().toUpperCase())
  );

  // 4. Availability Check
  const isAvailable = Boolean(
    profile?.is_available_for_donation !== false &&
    (donorRecord?.available !== false)
  );

  // Quick enable availability
  const handleEnableAvailability = async () => {
    setEnablingAvail(true);
    setSubmitError('');
    try {
      if (updateDonorAvailability) {
        await updateDonorAvailability(true);
      }
      showToast('Donor availability turned ON.', 'success');
    } catch (err) {
      console.warn('Could not enable availability:', err);
    } finally {
      setEnablingAvail(false);
    }
  };

  // Submit response
  const handleConfirmResponse = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitError('');

    if (!hasConsented) {
      showToast('Please confirm voluntary consent to proceed.', 'error');
      setSubmitError('Please check the voluntary consent box to proceed.');
      return;
    }

    // Mandatory name & email validation for Quick Voluntary Donor
    if (!isLoggedIn) {
      if (!guestName.trim()) {
        showToast('Please enter your full name.', 'error');
        setSubmitError('Please enter your full name.');
        return;
      }
      const cleanEmail = guestEmail.trim();
      if (!cleanEmail) {
        showToast('Email address is mandatory for donation confirmations.', 'error');
        setSubmitError('Email address is mandatory. Please enter a valid email to proceed.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        showToast('Please enter a valid email address (e.g. name@gmail.com).', 'error');
        setSubmitError('Please enter a valid email address (e.g. name@gmail.com).');
        return;
      }
    }

    const effectiveName = isLoggedIn ? donorName : (guestName.trim() || 'Voluntary Donor');
    const effectivePhone = donorPhone || '';
    const effectiveEmail = isLoggedIn ? donorEmail : guestEmail.trim();

    if (!effectiveEmail) {
      showToast('Email address is mandatory.', 'error');
      setSubmitError('A valid email address is required to receive hospital donation confirmations.');
      return;
    }

    const effectiveDistrict = (isLoggedIn ? donorDistrict : guestDistrict) || requirement.district || 'Karur';
    const effectiveCity = (isLoggedIn ? donorCity : guestDistrict) || requirement.city || effectiveDistrict;
    const effectiveBloodGroup = (isLoggedIn ? (overrideBloodGroup ? requirement.blood_group : donorBloodGroup) : requirement.blood_group) || requirement.blood_group;

    setIsSubmitting(true);
    try {
      // Safely resolve donor ID across Supabase / Firebase / Guest
      const donorId = user?.id || user?.uid || profile?.id || donorRecord?.id || (effectiveEmail ? `donor-${effectiveEmail.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15)}` : `anon-${Date.now()}`);

      const response = await submitDonorResponse({
        requirementId: requirement.id,
        donorId,
        donorName: effectiveName,
        donorBloodGroup: effectiveBloodGroup,
        donorDistrict: effectiveDistrict,
        donorCity: effectiveCity,
        donorPhone: effectivePhone,
        donorEmail: effectiveEmail,
        donorMessage: donorMessage.trim(),
        isAvailable: true,
      });

      setSubmittedResponse(response);
      showToast('Donation response submitted successfully. BloodBridge support will coordinate with the hospital.', 'success');
      if (onSuccess) onSuccess(response);
    } catch (err) {
      const msg = err.message || 'Could not submit donation response.';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDuplicateError = (submitError || '').toLowerCase().includes('already submitted');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-[rgba(18,18,24,0.95)] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white z-10 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Top edge reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {submittedResponse ? 'Response Submitted' : 'Confirm Donation Response'}
              </h3>
              <p className="text-xs text-zinc-400">
                {requirement.requirement_code} • {requirement.hospital_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            STATE 1: SUCCESS CONFIRMATION
           ========================================================================= */}
        {submittedResponse ? (
          <div className="text-center py-6 space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-xl font-black text-white">
                Thank You for Stepping Forward! ❤️
              </h4>
              <p className="text-xs text-zinc-300 max-w-md mx-auto mt-2 leading-relaxed">
                Your voluntary donation response has been successfully submitted. BloodBridge support will coordinate with <strong className="text-white">{requirement.hospital_name}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Response ID:</span>
                <span className="font-mono font-bold text-white">{submittedResponse.response_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Hospital:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{requirement.hospital_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Blood Group:</span>
                <span className="font-bold text-[#FF2B2B]">{requirement.blood_group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Initial Status:</span>
                <span className="font-semibold text-amber-400 font-mono">PENDING HOSPITAL RESPONSE</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
              You will receive an in-app notification and email confirmation once the hospital reviews and accepts your donation offer.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/donor-dashboard?tab=responses"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
              >
                View in My Responses
              </Link>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              STATE 2: ELIGIBILITY CHECKS & FORM
             ========================================================================= */
          <div className="space-y-5">
            {/* Requirement Summary Card */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Responding To:</span>
                <span className="font-bold text-white text-sm truncate max-w-[240px]">
                  {requirement.hospital_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Requirement:</span>
                <span className="font-bold text-[#FF2B2B] text-sm">
                  {requirement.blood_group} • {requirement.units_required} Units Needed ({requirement.urgency})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Required Date:</span>
                <span className="font-mono text-zinc-200">
                  {requirement.required_date} {requirement.required_time ? `at ${requirement.required_time}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Location:</span>
                <span className="text-zinc-200">{requirement.city}, {requirement.district}</span>
              </div>
            </div>

            {/* ERROR BANNER IF SUBMISSION FAILED */}
            {submitError && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                isDuplicateError
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                  : 'bg-red-500/15 border-red-500/30 text-red-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  {isDuplicateError ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <AlertCircle className="w-4 h-4 text-[#FF2B2B]" />}
                  <span>{isDuplicateError ? 'Active Response Already Exists' : 'Submission Note'}</span>
                </div>
                <p className="leading-relaxed">
                  {isDuplicateError
                    ? 'You have already submitted an active donation response for this requirement. BloodBridge support is coordinating with the hospital.'
                    : submitError}
                </p>
                {isDuplicateError && (
                  <div className="pt-1 flex items-center gap-3">
                    <Link
                      to="/donor-dashboard?tab=responses"
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all"
                    >
                      View in My Responses
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                CASE A: NOT LOGGED IN -> PROVIDE QUICK DONOR FORM OR LOGIN TAB
               ===================================================================== */}
            {!isLoggedIn && (
              <div className="space-y-4">
                <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setGuestAuthTab('quick')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                      guestAuthTab === 'quick'
                        ? 'bg-[#E50914] text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Quick Voluntary Response
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestAuthTab('login')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center ${
                      guestAuthTab === 'login'
                        ? 'bg-[#E50914] text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Sign In with Account
                  </button>
                </div>

                {guestAuthTab === 'login' ? (
                  <div className="p-5 rounded-2xl bg-[#1e0a0d] border border-[#E50914]/40 text-center space-y-3 animate-fadeIn">
                    <AlertCircle className="w-8 h-8 text-[#FF2B2B] mx-auto" />
                    <h4 className="text-sm font-bold text-white">
                      Sign In to Your Account
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                      Log in to submit this response directly under your verified BloodBridge donor profile and track it in your dashboard.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Link
                        to="/login"
                        className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all"
                      >
                        Log In
                      </Link>
                      <Link
                        to="/register"
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-white transition-all"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Quick Voluntary Form for Guests */
                  <form onSubmit={handleConfirmResponse} className="space-y-4 animate-fadeIn">
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Responding with compatible <strong>{requirement.blood_group}</strong> blood</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-300">
                        Voluntary
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. S. Ramanathan"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full bg-white/[0.04] border border-white/10 focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          District (Tamil Nadu)
                        </label>
                        <select
                          value={guestDistrict}
                          onChange={(e) => setGuestDistrict(e.target.value)}
                          className="w-full bg-[#141418] border border-white/10 focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                        >
                          {TAMIL_NADU_DISTRICTS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                          Email Address <span className="text-[#FF2B2B]">*</span>
                        </label>
                        <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-wide bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
                          Mandatory
                        </span>
                      </div>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. your.email@example.com"
                          value={guestEmail}
                          onChange={(e) => {
                            setGuestEmail(e.target.value);
                            if (submitError) setSubmitError('');
                          }}
                          className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-colors ${
                            submitError && (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))
                              ? 'border-red-500 focus:border-red-400 bg-red-500/5'
                              : 'border-white/10 focus:border-[#E50914]'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        Mandatory: Hospital response and coordination details will be sent to this email.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        Optional Message to Hospital
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. I am available today afternoon. Ready to donate."
                        value={donorMessage}
                        onChange={(e) => setDonorMessage(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-[#E50914] rounded-2xl p-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                      />
                    </div>

                    {/* Voluntary Consent Checkbox */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={hasConsented}
                          onChange={(e) => setHasConsented(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-zinc-600 text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                        />
                        <span className="leading-relaxed">
                          I voluntarily offer to donate blood for this specific requirement and agree to hospital verification.
                        </span>
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting || !hasConsented}
                        className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-white font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Response...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Confirm Donation Request</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* =====================================================================
                CASE B: LOGGED IN BUT INCOMPLETE PROFILE
               ===================================================================== */}
            {isLoggedIn && isProfileIncomplete && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-amber-300 text-sm font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <span>Confirm Profile Details to Proceed</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Please confirm your blood group and district to match this hospital requirement:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Blood Group
                    </label>
                    <select
                      value={manualBloodGroup}
                      onChange={(e) => setManualBloodGroup(e.target.value)}
                      className="w-full bg-[#141418] border border-white/15 focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none font-bold"
                    >
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      District
                    </label>
                    <select
                      value={manualDistrict}
                      onChange={(e) => setManualDistrict(e.target.value)}
                      className="w-full bg-[#141418] border border-white/15 focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {TAMIL_NADU_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                CASE C: BLOOD GROUP MISMATCH
               ===================================================================== */}
            {isLoggedIn && !isProfileIncomplete && !isBloodGroupMatched && (
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <h5 className="font-bold text-white text-sm">Blood Group Incompatible</h5>
                    <p className="leading-relaxed">
                      This requirement specifically needs <strong className="text-[#FF2B2B]">{requirement.blood_group}</strong> blood.
                      Your registered blood group is <strong className="text-white">{donorBloodGroup}</strong>.
                    </p>
                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-300">
                        <input
                          type="checkbox"
                          checked={overrideBloodGroup}
                          onChange={(e) => setOverrideBloodGroup(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 text-[#E50914] focus:ring-[#E50914] bg-[#161616]"
                        />
                        <span>
                          I confirm I am eligible to donate <strong>{requirement.blood_group}</strong> blood for this requirement.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                CASE D: AVAILABILITY IS OFF
               ===================================================================== */}
            {isLoggedIn && !isProfileIncomplete && isBloodGroupMatched && !isAvailable && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3 text-amber-300">
                  <ToggleRight className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1 text-xs">
                    <h5 className="font-bold text-white text-sm">Donor Availability Turned Off</h5>
                    <p className="leading-relaxed">
                      Your donor availability status is currently turned off. Please enable availability before responding to this hospital requirement.
                    </p>
                    <button
                      type="button"
                      onClick={handleEnableAvailability}
                      disabled={enablingAvail}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-200 transition-all disabled:opacity-50"
                    >
                      {enablingAvail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ToggleRight className="w-3.5 h-3.5" />}
                      <span>Enable Availability & Continue</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                CASE E: ELIGIBLE LOGGED-IN DONOR CONFIRMATION FORM
               ===================================================================== */}
            {isLoggedIn && isBloodGroupMatched && isAvailable && (
              <form onSubmit={handleConfirmResponse} className="space-y-4">
                {/* Donor preview badge with contact details */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-semibold text-white">{donorName}</span>
                        <span className="text-zinc-400"> ({overrideBloodGroup ? requirement.blood_group : donorBloodGroup} • {donorDistrict})</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      Eligible Donor
                    </span>
                  </div>

                  {/* Donor Contact Details */}
                  {(donorPhone || donorEmail) && (
                    <div className="pt-2 border-t border-emerald-500/15 flex flex-wrap items-center gap-3 text-[11px] text-zinc-300">
                      {donorPhone && (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{donorPhone}</span>
                        </span>
                      )}
                      {donorEmail && (
                        <span className="flex items-center gap-1.5 break-all">
                          <Mail className="w-3 h-3 text-emerald-400" />
                          <span>{donorEmail}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* If logged-in user does not have an email saved, require it here */}
                {!donorEmail && (
                  <div className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                        Email Address <span className="text-[#FF2B2B]">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-wide bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
                        Mandatory
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. your.email@example.com"
                        value={guestEmail}
                        onChange={(e) => {
                          setGuestEmail(e.target.value);
                          if (submitError) setSubmitError('');
                        }}
                        className={`w-full bg-white/[0.04] border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-colors ${
                          submitError && (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim()))
                            ? 'border-red-500 focus:border-red-400 bg-red-500/5'
                            : 'border-white/10 focus:border-[#E50914]'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Mandatory: Hospital response and coordination details will be sent to this email.
                    </span>
                  </div>
                )}

                {/* Optional Message */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Optional Message to Hospital
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. I am available to visit this afternoon. I have donated before."
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-[#E50914] rounded-2xl p-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                  />
                </div>

                {/* Voluntary Consent Checkbox */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={hasConsented}
                      onChange={(e) => setHasConsented(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-zinc-600 text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                    />
                    <span className="leading-relaxed">
                      I voluntarily offer to donate blood for this specific requirement and agree to hospital verification.
                    </span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !hasConsented}
                    className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-white font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Response...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm Donation Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Close button fallback */}
            {isLoggedIn && !isBloodGroupMatched && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
