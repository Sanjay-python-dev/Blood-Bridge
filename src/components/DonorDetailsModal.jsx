import React from 'react';
import { X, MapPin, Calendar, CheckCircle2, ShieldCheck, Heart, Award, ShieldAlert, AlertCircle, Phone, Mail } from 'lucide-react';
import { getDonorEligibility, MEDICAL_ELIGIBILITY_DISCLAIMER } from '../services/eligibilityService';

export default function DonorDetailsModal({ donor, onClose, onContact }) {
  if (!donor) return null;

  const eligibility = donor.eligibility || getDonorEligibility(donor);
  const isAvailable = donor.availability === 'Available Now';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
        {/* Top edge glass reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6">
          {/* Blood badge */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.5)] flex-shrink-0">
            <span className="text-2xl font-black text-white">{donor.blood_group || donor.bloodGroup}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-white">{donor.name}</h3>
              {donor.verified && (
                <ShieldCheck className="w-5 h-5 text-[#FF2B2B]" title="Verified Donor" />
              )}
            </div>
            <div className="flex items-start gap-1.5 text-sm text-[#B0B0B0] mt-0.5">
              <MapPin className="w-4 h-4 text-[#E50914] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">{donor.district || donor.city}</span>
                {donor.address && (
                  <p className="text-xs text-[#8E8E93] mt-0.5">{donor.address}</p>
                )}
                {donor.area && !donor.address && (
                  <span className="text-[#737373]"> ({donor.area})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#161616] p-3.5 rounded-xl border border-white/5">
            <span className="text-xs text-[#737373] block">Availability Status</span>
            <span className={`text-sm font-semibold mt-1 inline-flex items-center gap-1.5 ${
              isAvailable ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              {donor.status || donor.availability}
            </span>
          </div>

          <div className="bg-[#161616] p-3.5 rounded-xl border border-white/5">
            <span className="text-xs text-[#737373] block">Donation Eligibility</span>
            <span className={`text-sm font-semibold mt-1 block ${
              eligibility.isEligible ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {eligibility.statusText}
            </span>
          </div>

          {/* Contact Information (Phone and Email) */}
          <div className="col-span-2 bg-[#161616] p-3.5 rounded-xl border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#737373] block">Contact Phone</span>
                <span className="text-sm font-mono font-semibold text-white mt-0.5 block">
                  {donor.displayPhone || donor.phone || 'Available upon request'}
                </span>
              </div>
              {donor.phone && (
                <a
                  href={`tel:${String(donor.phone).replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E50914]/20 hover:bg-[#E50914]/30 text-[#FF2B2B] hover:text-white border border-[#E50914]/30 text-xs font-bold transition-colors"
                  title={`Call ${donor.name}`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Donor</span>
                </a>
              )}
            </div>

            {(donor.displayEmail || donor.email) && (
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between min-w-0">
                <div className="min-w-0 pr-3 overflow-hidden">
                  <span className="text-xs text-[#737373] block">Email / Gmail</span>
                  <span
                    className="text-sm font-medium text-white mt-0.5 block truncate break-all"
                    title={donor.displayEmail || donor.email}
                  >
                    {donor.displayEmail || donor.email}
                  </span>
                </div>
                {donor.email && !donor.isRareBloodProtected && (
                  <a
                    href={`mailto:${donor.email}`}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#B0B0B0] hover:text-white border border-white/10 text-xs font-medium transition-colors"
                    title={`Email ${donor.name}`}
                  >
                    <Mail className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>Send Email</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Privacy Note */}
        <div className="bg-[#1a080a] border border-[#E50914]/30 rounded-xl p-3.5 mb-4 text-xs text-[#B0B0B0] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Privacy Safe Profile:</strong> Personal phone numbers and private health records are held under consent-based encryption. Sending an urgent request initiates an alert notification to the donor.
          </p>
        </div>

        {/* Informational Medical Disclaimer */}
        <p className="text-[10px] text-[#737373] italic mb-6 leading-relaxed">
          * {MEDICAL_ELIGIBILITY_DISCLAIMER}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/20 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onContact(donor);
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-sm font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:shadow-[0_0_30px_rgba(229,9,20,0.8)] transition-all"
          >
            Connect with Donor
          </button>
        </div>

      </div>
    </div>
  );
}
