import React from 'react';
import { Target, Eye, Droplet, Globe, CheckCircle2 } from 'lucide-react';

export default function MissionVision() {
  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SECTION 5 — MISSION CARD */}
        <div className="group relative p-8 sm:p-10 rounded-3xl bg-[#0d0d12] border border-white/10 hover:border-[#ff1e2d]/60 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden">
          {/* Subtle top edge glass reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff1e2d]/40 to-transparent pointer-events-none" />

          {/* Animated pulsing blood-drop visual backdrop */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-[#ff1e2d]/10 blur-3xl group-hover:bg-[#ff1e2d]/20 transition-all pointer-events-none" />

          <div>
            {/* Icon + Animated Blood Drop */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1c080b] border border-[#ff1e2d]/40 text-[#ff1e2d] flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,30,45,0.25)]">
                <Target className="w-7 h-7" />
              </div>

              {/* Animated subtle pulsing blood-drop icon */}
              <div className="relative flex items-center justify-center w-10 h-10">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-[#ff1e2d]/40 opacity-75" />
                <Droplet className="w-6 h-6 text-[#ff1e2d] relative drop-shadow-[0_0_10px_rgba(255,30,45,0.7)] animate-bounce" />
              </div>
            </div>

            <span className="text-xs font-mono font-bold tracking-widest text-[#ff424f] uppercase block mb-1">
              PURPOSE DRIVEN
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">
              Our Mission
            </h2>

            <p className="text-base text-[#a0a0a0] leading-relaxed">
              "To make blood donation more accessible by connecting verified donors, hospitals and people in need through a transparent and location-aware digital platform."
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-[#a0a0a0]">
            <CheckCircle2 className="w-4 h-4 text-[#ff1e2d]" />
            <span>Verified Donor Registry • 100% Non-Profit Healthcare Initiative</span>
          </div>
        </div>

        {/* SECTION 6 — VISION CARD */}
        <div className="group relative p-8 sm:p-10 rounded-3xl bg-[#0d0d12] border border-white/10 hover:border-[#ff1e2d]/60 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden">
          {/* Subtle top edge glass reflection */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff1e2d]/40 to-transparent pointer-events-none" />

          {/* Subtle Map/Grid background pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(255, 30, 45, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 30, 45, 0.4) 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10">
            {/* Icon + Globe/Map backdrop */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1c080b] border border-[#ff1e2d]/40 text-[#ff1e2d] flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,30,45,0.25)]">
                <Eye className="w-7 h-7" />
              </div>

              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#ff424f]">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            <span className="text-xs font-mono font-bold tracking-widest text-[#ff424f] uppercase block mb-1">
              THE FUTURE
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">
              Our Vision
            </h2>

            <p className="text-base text-[#a0a0a0] leading-relaxed">
              "To build a connected blood donation network across Tamil Nadu where finding the right donor becomes faster, simpler and more reliable."
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-[#a0a0a0] relative z-10">
            <CheckCircle2 className="w-4 h-4 text-[#ff1e2d]" />
            <span>Statewide Response Grid • Real-time District Linkage</span>
          </div>
        </div>

      </div>
    </section>
  );
}
