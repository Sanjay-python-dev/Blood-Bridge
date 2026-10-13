import React from 'react';
import { UserPlus, GitFork, HeartHandshake, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      role: 'DONOR',
      title: 'Register & Geotarget',
      description: 'Register and share your blood group and location.',
      icon: UserPlus,
    },
    {
      number: '02',
      role: 'BLOOD BRIDGE',
      title: 'Intelligent Matching',
      description: 'Connects matching donors, hospitals and blood requests.',
      icon: GitFork,
    },
    {
      number: '03',
      role: 'PATIENT',
      title: 'Rapid Transfusion',
      description: 'Helps people find suitable blood donors faster.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section className="py-20 bg-transparent border-y border-white/[0.08] relative overflow-hidden">
      
      {/* Subtle background ambient line glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-24 bg-[#ff1e2d]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#ff1e2d] bg-[#1a080a] border border-[#ff1e2d]/30 px-3.5 py-1 rounded-full mb-3">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            How Blood Bridge Connects People
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#a0a0a0]">
            A location-aware matching pipeline built to eliminate critical delays between willing donors and patients in emergency need.
          </p>
        </div>

        {/* 3-Step Horizontal Process with Red Connecting Lines */}
        <div className="relative">
          
          {/* Desktop/Tablet Horizontal Connector Line */}
          <div className="hidden md:block absolute top-1/2 left-[18%] right-[18%] -translate-y-6 h-[2px] bg-gradient-to-r from-[#ff1e2d]/20 via-[#ff1e2d] to-[#ff1e2d]/20 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff4d5a] to-transparent animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={idx}
                  className="group relative p-8 rounded-3xl bg-[#0d0d12] border border-white/10 hover:border-[#ff1e2d]/60 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center shadow-[0_15px_40px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_50px_rgba(255,30,45,0.2)]"
                >
                  {/* Step Number Badge */}
                  <span className="text-xs font-mono font-black tracking-widest text-[#ff424f] uppercase px-3 py-1 rounded-full bg-[#1c080b] border border-[#ff1e2d]/30 mb-5 shadow-[0_0_10px_rgba(255,30,45,0.25)]">
                    {step.number} • {step.role}
                  </span>

                  {/* Icon with glow badge */}
                  <div className="w-16 h-16 rounded-2xl bg-[#1a080b] border border-[#ff1e2d]/40 flex items-center justify-center text-[#ff1e2d] group-hover:bg-[#ff1e2d] group-hover:text-white group-hover:shadow-[0_0_25px_rgba(255,30,45,0.6)] transition-all duration-300 mb-5">
                    <Icon className="w-7 h-7 transition-transform group-hover:scale-110" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-white group-hover:text-[#ff424f] transition-colors mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#a0a0a0] leading-relaxed max-w-xs">
                    "{step.description}"
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
