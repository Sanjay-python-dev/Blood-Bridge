import React from 'react';
import { Heart, Activity, Sparkles } from 'lucide-react';
import LivingBloodDrop from './LivingBloodDrop';

export default function HeroVisual() {
  return (
    <div className="relative w-full max-w-[540px] aspect-square flex items-center justify-center select-none">
      
      {/* Background Red Ambient Glow Spheres */}
      <div className="absolute w-72 h-72 rounded-full bg-[#E50914]/20 blur-[90px] -top-8 -left-8 animate-pulse pointer-events-none" />
      <div className="absolute w-64 h-64 rounded-full bg-[#FF2B2B]/15 blur-[80px] -bottom-6 -right-6 animate-pulse pointer-events-none" />

      {/* Floating Red Particle Dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-12 w-2 h-2 rounded-full bg-[#FF2B2B] shadow-[0_0_10px_#FF2B2B] animate-ping opacity-75" />
        <div className="absolute bottom-16 left-16 w-2.5 h-2.5 rounded-full bg-[#E50914] shadow-[0_0_12px_#E50914] animate-pulse" />
        <div className="absolute top-20 right-14 w-2 h-2 rounded-full bg-[#FF2B2B] shadow-[0_0_8px_#FF2B2B] animate-bounce" />
        <div className="absolute bottom-24 right-20 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff] opacity-80" />
      </div>

      {/* Behind the Drop: Glowing ECG Heartbeat Line SVG */}
      <div className="absolute inset-x-0 h-32 flex items-center justify-center pointer-events-none z-0 opacity-85">
        <svg viewBox="0 0 700 150" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E50914" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#E50914" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FF2B2B" stopOpacity="1" />
              <stop offset="70%" stopColor="#E50914" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E50914" stopOpacity="0.1" />
            </linearGradient>
            <filter id="ecgGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ECG Wave Path */}
          <path
            d="M 10 75 L 180 75 L 205 75 L 218 55 L 232 95 L 246 30 L 260 120 L 275 75 L 295 75 L 308 65 L 322 75 L 390 75 L 415 75 L 428 55 L 442 95 L 456 25 L 470 125 L 485 75 L 505 75 L 520 65 L 535 75 L 690 75"
            fill="none"
            stroke="url(#ecgGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ecgGlow)"
            className="animate-ecg"
          />
        </svg>
      </div>

      {/* Left and Right Glowing Floating Hearts */}
      <div className="absolute -left-2 sm:left-2 top-1/2 -translate-y-12 z-20 flex flex-col items-center gap-1.5 animate-float-slow">
        <div className="p-3.5 rounded-2xl bg-white/[0.08] border border-white/20 backdrop-blur-xl shadow-[0_8px_25px_rgba(229,9,20,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]">
          <Heart className="w-6 h-6 text-[#FF2B2B] fill-[#FF2B2B] animate-pulse" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#B0B0B8] bg-white/[0.06] backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
          Life Saved
        </span>
      </div>

      <div className="absolute -right-2 sm:right-2 top-1/2 translate-y-6 z-20 flex flex-col items-center gap-1.5 animate-float-slow" style={{ animationDelay: '1.8s' }}>
        <div className="p-3.5 rounded-2xl bg-white/[0.08] border border-white/20 backdrop-blur-xl shadow-[0_8px_25px_rgba(229,9,20,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]">
          <Activity className="w-6 h-6 text-[#FF2B2B] animate-pulse" />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-[#B0B0B8] bg-white/[0.06] backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
          24/7 Match
        </span>
      </div>

      {/* Centerpiece: Living Animated Blood Drop */}
      <div className="relative z-10 w-72 sm:w-84 md:w-96 aspect-square flex items-center justify-center">
        <LivingBloodDrop />
      </div>

      {/* Floating Badge near Illustration: "One Donation • Many Lives" */}
      <div className="absolute -bottom-4 z-20 px-5 py-2.5 rounded-full bg-[#111111]/90 border border-[#E50914]/60 backdrop-blur-xl shadow-[0_0_25px_rgba(229,9,20,0.5)] flex items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-[#FF2B2B] animate-spin" style={{ animationDuration: '4s' }} />
        <div className="text-left">
          <p className="text-xs font-bold tracking-wider text-white uppercase">One Donation</p>
          <p className="text-[11px] font-semibold text-[#FF2B2B]">Many Lives Saved</p>
        </div>
      </div>

    </div>
  );
}
