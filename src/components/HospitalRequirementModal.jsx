import React from 'react';
import { X, Building, ShieldCheck, MapPin, Calendar, Clock, Droplet, Phone, Mail, AlertCircle, Sparkles, Heart } from 'lucide-react';

export default function HospitalRequirementModal({ isOpen, requirement, onClose, onDonateClick }) {
  if (!isOpen || !requirement) return null;

  const isEmergency = requirement.urgency === 'Emergency';
  const unitsRemaining = Math.max(0, (requirement.units_required || 1) - (requirement.units_confirmed || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[rgba(18,18,24,0.92)] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-white z-10 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Top edge reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg flex-shrink-0 ${
              isEmergency
                ? 'bg-gradient-to-br from-[#FF2B2B] to-[#990000] text-white shadow-[0_0_20px_rgba(229,9,20,0.6)]'
                : 'bg-white/10 text-white border border-white/15'
            }`}>
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Hospital
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {requirement.requirement_code}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {requirement.hospital_name}
              </h2>
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

        {/* Urgency and Key Details Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Blood Group</span>
            <span className="text-xl font-black text-[#FF2B2B]">{requirement.blood_group}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Units Needed</span>
            <span className="text-xl font-black text-white">
              {unitsRemaining} <span className="text-xs font-normal text-zinc-400">/ {requirement.units_required}</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Urgency</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
              isEmergency
                ? 'bg-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.6)]'
                : requirement.urgency === 'Urgent'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
            }`}>
              {isEmergency ? '🚨 Emergency' : requirement.urgency}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Status</span>
            <span className="text-xs font-bold text-emerald-400">
              {requirement.status === 'PARTIALLY_FULFILLED' ? 'Partially Fulfilled' : 'Active'}
            </span>
          </div>
        </div>

        {/* Location & Time Grid */}
        <div className="space-y-3 bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 text-sm">
          <div className="flex items-start gap-3 text-zinc-300">
            <MapPin className="w-4 h-4 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Hospital Location: </span>
              {requirement.hospital_location || requirement.city}, {requirement.district}, {requirement.state || 'Tamil Nadu'}
            </div>
          </div>

          <div className="flex items-start gap-3 text-zinc-300">
            <Calendar className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Required Date & Time: </span>
              <span className="text-white font-mono">{requirement.required_date}</span>
              {requirement.required_time && (
                <span className="text-zinc-400 font-mono"> at {requirement.required_time}</span>
              )}
            </div>
          </div>

          {requirement.doctor_contact && (
            <div className="flex items-start gap-3 text-zinc-300">
              <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Blood Bank / Clinical Desk: </span>
                <a href={`tel:${requirement.doctor_contact.replace(/\s+/g, '')}`} className="text-white hover:text-emerald-400 font-mono transition-colors">
                  {requirement.doctor_contact}
                </a>
              </div>
            </div>
          )}

          {(requirement.hospital_email || requirement.email) && (
            <div className="flex items-start gap-3 text-zinc-300">
              <Mail className="w-4 h-4 text-[#E50914] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Hospital Desk Email: </span>
                <a href={`mailto:${requirement.hospital_email || requirement.email}`} className="text-zinc-300 hover:text-white transition-colors break-all">
                  {requirement.hospital_email || requirement.email}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Clinical Reason */}
        <div>
          <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
            Clinical Requirement Reason
          </h4>
          <p className="text-sm text-zinc-200 bg-white/[0.03] border border-white/5 rounded-xl p-3.5 leading-relaxed">
            {requirement.reason || 'Surgical blood bank reserve and patient crossmatch requirement.'}
          </p>
        </div>

        {/* Additional Instructions if any */}
        {requirement.additional_instructions && (
          <div>
            <h4 className="text-xs uppercase font-bold text-zinc-400 tracking-wider mb-2">
              Donor Instructions
            </h4>
            <p className="text-xs text-zinc-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 leading-relaxed">
              {requirement.additional_instructions}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 hover:text-white border border-white/10 transition-colors"
          >
            Close Details
          </button>

          <button
            onClick={() => onDonateClick(requirement)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-white font-bold text-sm shadow-[0_0_25px_rgba(229,9,20,0.6)] hover:shadow-[0_0_35px_rgba(229,9,20,0.9)] transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
          >
            <Heart className="w-4 h-4 fill-white" />
            <span>I Want to Donate</span>
          </button>
        </div>

      </div>
    </div>
  );
}
