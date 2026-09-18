import React, { useState } from 'react';
import { MapPin, Calendar, Clock, ShieldCheck, Eye, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import DonorDetailsModal from './DonorDetailsModal';
import ContactDonorModal from './ContactDonorModal';
import { getDonorEligibility, MEDICAL_ELIGIBILITY_DISCLAIMER } from '../services/eligibilityService';

export default function DonorCard({ donor, onContactClick }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const eligibility = donor.eligibility || getDonorEligibility(donor);
  const isAvailable = donor.availability === 'Available Now';
  const isEligibleNow = eligibility.isEligible;

  return (
    <>
      <div className="group relative glass-card hover:border-[#E50914]/70 rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden">
        {/* Top edge glass reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        
        {/* Top bar: Blood Badge & Status Pills */}
        <div className="flex items-start justify-between gap-3 mb-5">
          {/* Blood Group Large Badge */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF2B2B] via-[#E50914] to-[#8a0006] flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.45)] group-hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all">
              <span className="text-2xl font-black text-white tracking-wider">
                {donor.bloodGroup}
              </span>
            </div>
          </div>

          {/* Availability & Eligibility Badges */}
          <div className="text-right space-y-1.5">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isAvailable
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {donor.availability}
              </span>
            </div>

            {/* Donation Eligibility Status */}
            <div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isEligibleNow
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-amber-300 border border-amber-500/30'
                }`}
                title={MEDICAL_ELIGIBILITY_DISCLAIMER}
              >
                {eligibility.statusText}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Donor Name, Location, Last Donation */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white group-hover:text-[#FF2B2B] transition-colors">
              {donor.name}
            </h3>
            {donor.verified && (
              <ShieldCheck className="w-4 h-4 text-[#FF2B2B]" title="Verified Donor" />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-[#B0B0B0]">
            <MapPin className="w-4 h-4 text-[#E50914] flex-shrink-0" />
            <span>{donor.district || donor.city}</span>
            {donor.area && <span className="text-[#737373]">({donor.area})</span>}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#B0B0B0] pt-1">
            <Calendar className="w-3.5 h-3.5 text-[#737373]" />
            <span>Last Donation:</span>
            <span className="text-white font-medium">
              {donor.lastDonationDate
                ? new Date(donor.lastDonationDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'No prior record'}
            </span>
          </div>

          {/* Privacy-Safe Contact Preview (Masked for privacy compliance) */}
          <div className="text-[11px] text-[#737373] font-mono">
            Contact: <span className="text-[#B0B0B0]">{donor.displayPhone || donor.phone}</span> (Consent Protected)
          </div>

          {donor.isRareBloodProtected && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300">
              {donor.rareNotice}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-white/5">
          <button
            onClick={() => setShowDetails(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-[#1a1a1a] hover:bg-[#222222] border border-white/10 hover:border-white/30 transition-all duration-200"
          >
            <Eye className="w-3.5 h-3.5 text-[#B0B0B0]" />
            <span>VIEW DETAILS</span>
          </button>

          <button
            onClick={() => {
              if (onContactClick) {
                onContactClick(donor);
              } else {
                setShowContact(true);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>CONNECT</span>
          </button>
        </div>

      </div>

      {/* View Details Modal */}
      {showDetails && (
        <DonorDetailsModal
          donor={donor}
          onClose={() => setShowDetails(false)}
          onContact={() => setShowContact(true)}
        />
      )}

      {/* Secure Donation Request Modal */}
      {showContact && (
        <ContactDonorModal
          donor={donor}
          onClose={() => setShowContact(false)}
        />
      )}
    </>
  );
}
