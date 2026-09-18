import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Flame, ShieldAlert, PhoneCall, CheckCircle2, Clock, MapPin, Building, ArrowRight, Loader2 } from 'lucide-react';
import { bloodGroups } from '../data/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getStates, getDistricts, defaultCountry, defaultState } from '../services/locationService';
import { createEmergencyRequest } from '../services/requestService';
import { showToast } from '../components/Toast';

export default function RequestBlood() {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [ticketId, setTicketId] = useState('REQ-2026-9812');

  const [selectedState, setSelectedState] = useState(defaultState);
  const availableDistricts = getDistricts(defaultCountry, selectedState);

  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    bloodGroup: '',
    units: 2,
    requiredDate: 'Today',
    emergencyLevel: 'Critical',
    hospitalName: '',
    hospitalAddress: '',
    country: defaultCountry,
    state: defaultState,
    city: availableDistricts[0] || 'Karur',
    contactPerson: '',
    contactPhone: '',
    additionalMessage: '',
  });

  // Prefill contact if user is logged in
  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        contactPerson: prev.contactPerson || profile?.full_name || '',
        contactPhone: prev.contactPhone || profile?.phone || '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!formData.bloodGroup) {
      setServerError('Please select the required blood group.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Service repository dispatch (handles Supabase insert & notification)
      const createdReq = await createEmergencyRequest(
        {
          ...formData,
          state: selectedState,
        },
        user?.id
      );

      setTicketId(createdReq.id ? String(createdReq.id).toUpperCase() : 'REQ-LIVE');
      setSubmitted(true);
      showToast('Emergency request broadcast to active regional donors.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err.message || 'Failed to submit blood request. Please check details and try again.');
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
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-3">
                EMERGENCY BLOOD DESK
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Request <span className="text-[#E50914]">Blood</span>
              </h1>
              <p className="mt-3 text-base text-[#B0B0B0]">
                Submit an urgent or scheduled blood request to notify nearby active donors in real-time.
              </p>
            </div>

            {/* Emergency Alert Box */}
            <div className="bg-gradient-to-r from-[rgba(42,4,7,0.75)] via-[rgba(26,5,7,0.7)] to-[rgba(18,0,2,0.75)] backdrop-blur-2xl border border-white/20 rounded-2xl p-5 mb-10 shadow-[0_16px_40px_rgba(229,9,20,0.25)] flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-[#FF2B2B] flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Important Medical Alert
                </h4>
                <p className="text-xs sm:text-sm text-[#B0B0B0] mt-1 leading-relaxed">
                  "If this is a medical emergency, contact your nearest hospital immediately." Blood Bridge serves as an auxiliary volunteer notification system. In life-threatening emergencies, dial <strong className="text-white">108</strong> or hospital trauma directly.
                </p>
              </div>
            </div>

            {/* Request Form */}
            <form onSubmit={handleSubmit} className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-10 relative overflow-hidden">
              {/* Top edge glass reflection highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
              
              {serverError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed">{serverError}</span>
                </div>
              )}

              {/* SECTION 1: PATIENT INFORMATION */}
              <div>
                <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-white/10 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">1</span>
                  PATIENT INFORMATION
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kannan"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Patient Age *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      placeholder="e.g. 42"
                      value={formData.patientAge}
                      onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Blood Group Required *
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-black outline-none cursor-pointer"
                    >
                      <option value="" disabled>Select Blood Group</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: REQUEST DETAILS */}
              <div>
                <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-white/10 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">2</span>
                  REQUEST DETAILS
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Units Required *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      value={formData.units}
                      onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Required By *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Immediately (Today)"
                      value={formData.requiredDate}
                      onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Emergency Level *
                    </label>
                    <select
                      value={formData.emergencyLevel}
                      onChange={(e) => setFormData({ ...formData, emergencyLevel: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-bold outline-none cursor-pointer"
                    >
                      <option value="Critical">🔴 Critical (Immediate)</option>
                      <option value="Urgent">🟠 Urgent (Within 24 Hrs)</option>
                      <option value="Normal">🟢 Normal (Scheduled)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: HOSPITAL & DYNAMIC LOCATION DETAILS */}
              <div>
                <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-white/10 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">3</span>
                  HOSPITAL & LOCATION DETAILS
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Hospital Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Speciality Hospitals / Govt Medical College Hospital"
                      value={formData.hospitalName}
                      onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Hospital Address / Ward *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Trichy Main Road, ICU Ward 3"
                      value={formData.hospitalAddress}
                      onChange={(e) => setFormData({ ...formData, hospitalAddress: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                    />
                  </div>

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

                  {/* District Selection (Dynamic update and reset on state change) */}
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
                </div>
              </div>

              {/* SECTION 4: CONTACT DETAILS */}
              <div>
                <h3 className="text-lg font-bold text-white mb-5 pb-2 border-b border-white/10 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">4</span>
                  CONTACT DETAILS
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Contact Person Name & Relation *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Gomathi (Wife) / Sundar (Brother)"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                      Contact Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: ADDITIONAL MESSAGE */}
              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                  Additional Medical Message / Diagnosis
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide any specific medical notes, surgery timings, or cross-match instructions..."
                  value={formData.additionalMessage}
                  onChange={(e) => setFormData({ ...formData, additionalMessage: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl p-4 text-sm text-white placeholder-[#555] outline-none resize-none"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-base font-black text-white shadow-[0_0_35px_rgba(229,9,20,0.7)] hover:shadow-[0_0_50px_rgba(229,9,20,1)] transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>DISPATCHING REQUEST...</span>
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
          /* Success Screen */
          <div className="text-center py-16 bg-[#111111] border border-[#222222] rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(229,9,20,0.3)] animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
              Emergency Request Dispatched! 🚨
            </h2>

            <p className="text-base text-[#B0B0B0] max-w-lg mx-auto mb-8 leading-relaxed">
              Blood request for <strong className="text-white">{formData.units} Unit(s) of {formData.bloodGroup}</strong> at <strong className="text-white">{formData.hospitalName} ({formData.city})</strong> has been placed into our priority dispatch queue.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-10 text-left">
              <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                <span className="text-[11px] text-[#737373] block">Request Ticket ID</span>
                <span className="text-sm font-bold text-white font-mono">{ticketId}</span>
              </div>
              <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                <span className="text-[11px] text-[#737373] block">Emergency Level</span>
                <span className="text-sm font-bold text-[#FF2B2B]">{formData.emergencyLevel}</span>
              </div>
              <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                <span className="text-[11px] text-[#737373] block">Broadcast Radius</span>
                <span className="text-sm font-bold text-emerald-400">All Donors in {formData.city}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/find-blood"
                className="px-8 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white font-bold text-sm shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
              >
                Browse Matching Donors Directly
              </Link>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/20 text-white font-semibold text-sm transition-all"
              >
                Submit Another Request
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
