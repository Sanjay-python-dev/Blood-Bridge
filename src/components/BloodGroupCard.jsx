import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, ArrowUpRight } from 'lucide-react';
import { bloodGroupDetails } from '../data/mockData';

export default function BloodGroupCard({ bloodGroup }) {
  const navigate = useNavigate();
  const details = bloodGroupDetails[bloodGroup] || {};

  const handleClick = () => {
    navigate(`/find-blood?group=${encodeURIComponent(bloodGroup)}`);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="group relative glass-card-elevated hover:border-[#E50914]/60 p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      {/* Top glass reflection highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
      
      {/* Background Red Accent Sheen */}
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-[#E50914]/0 group-hover:bg-[#E50914]/20 blur-2xl transition-all duration-500 pointer-events-none" />

      {/* Top row: Drop icon and quick action arrow */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#1d1012] border border-[#E50914]/30 flex items-center justify-center text-[#FF2B2B] group-hover:bg-[#E50914] group-hover:text-white transition-all duration-300 shadow-[0_0_10px_rgba(229,9,20,0.2)]">
          <Droplet className="w-5 h-5 fill-current" />
        </div>
        <span className="text-xs text-[#737373] group-hover:text-[#FF2B2B] flex items-center gap-0.5 transition-colors font-mono">
          Find <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </span>
      </div>

      {/* Center: Blood Group in Large bold text */}
      <div className="my-2">
        <h3 className="text-4xl font-extrabold text-white group-hover:text-[#FF2B2B] transition-colors tracking-tight">
          {bloodGroup}
        </h3>
        <p className="text-xs text-[#B0B0B0] mt-1 font-medium">
          {bloodGroup === 'O-' ? 'Universal Donor' : bloodGroup === 'AB+' ? 'Universal Recipient' : `Prevalence: ${details.prevalence || 'Common'}`}
        </p>
      </div>

      {/* Bottom info: Compatibility tag */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#737373]">
        <span className="truncate">
          Gives to: <span className="text-[#B0B0B0] font-mono">{Array.isArray(details.canDonateTo) ? details.canDonateTo.slice(0, 2).join(', ') : 'All'}</span>
        </span>
      </div>
    </div>
  );
}
