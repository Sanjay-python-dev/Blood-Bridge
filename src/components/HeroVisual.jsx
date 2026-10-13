import React from 'react';
import { Heart, Activity, Sparkles } from 'lucide-react';

export default function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
      {/* Outer Glow Ring 1 */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#E50914]/20 via-[#FF2B2B]/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />

      {/* Decorative Rotating Ring */}
      <div className="absolute inset-4 rounded-full border border-dashed border-[#E50914]/25 animate-spin" style={{ animationDuration: '35s' }} />

      {/* Outer Pulse Rings */}
      <div className="absolute w-80 h-80 rounded-full border border-[#E50914]/30 animate-ping opacity-25" style={{ animationDuration: '3s' }} />

      {/* Centerpiece: Large Glowing Blood Drop */}
      <div className="relative z-10 w-72 sm:w-84 md:w-96 aspect-square flex items-center justify-center animate-float-slow" style={{ animationDuration: '5s' }}>
        <svg viewBox="0 0 200 220" className="w-full h-full drop-shadow-[0_0_40px_rgba(229,9,20,0.7)]">
          <defs>
            {/* Blood Drop Radial Gradient */}
            <radialGradient id="heroDropGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FF4A4A" />
              <stop offset="45%" stopColor="#E50914" />
              <stop offset="85%" stopColor="#7A0006" />
              <stop offset="100%" stopColor="#380002" />
            </radialGradient>

            {/* Inner Sheen Glow */}
            <linearGradient id="dropSheen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>

            {/* Outer Drop Glow Filter */}
            <filter id="heroDropGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Blood Drop Main Body */}
          <path
            d="M 100 15 
               C 100 15, 30 95, 30 142 
               C 30 182, 61 205, 100 205 
               C 139 205, 170 182, 170 142 
               C 170 95, 100 15, 100 15 Z"
            fill="url(#heroDropGrad)"
            filter="url(#heroDropGlow)"
          />

          {/* Glossy Reflection Highlight curve */}
          <path
            d="M 98 32 C 98 32, 48 98, 46 138 C 45 155, 49 168, 52 170 C 49 160, 48 145, 52 132 C 58 102, 92 48, 98 32 Z"
            fill="url(#dropSheen)"
          />
        </svg>
      </div>

      {/* Floating Badge 1: Life Saved (Left) */}
      <div className="absolute -left-4 sm:left-0 top-1/3 z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#111111]/80 border border-white/20 backdrop-blur-xl shadow-[0_0_20px_rgba(229,9,20,0.3)] animate-float-slow">
        <div className="w-8 h-8 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center">
          <Heart className="w-4 h-4 text-[#FF2B2B]" />
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">1000+</p>
          <p className="text-[10px] text-[#B0B0B0]">Lives Saved</p>
        </div>
      </div>

      {/* Floating Badge 2: 24/7 Match (Right) */}
      <div className="absolute -right-4 sm:right-0 bottom-1/3 z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#111111]/80 border border-white/20 backdrop-blur-xl shadow-[0_0_20px_rgba(229,9,20,0.3)] animate-float-slow" style={{ animationDelay: '2s' }}>
        <div className="w-8 h-8 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center">
          <Activity className="w-4 h-4 text-[#FF2B2B]" />
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">24/7</p>
          <p className="text-[10px] text-[#B0B0B0]">Smart Match</p>
        </div>
      </div>

      {/* Floating Badge 3: One Donation (Bottom) */}
      <div className="absolute -bottom-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-[#111111]/90 border border-[#E50914]/50 backdrop-blur-xl shadow-[0_0_25px_rgba(229,9,20,0.4)]">
        <Sparkles className="w-3.5 h-3.5 text-[#FF2B2B]" />
        <span className="text-xs font-semibold text-white tracking-wide">
          One Donation <span className="text-[#E50914]">•</span> Many Lives
        </span>
      </div>
    </div>
  );
}
