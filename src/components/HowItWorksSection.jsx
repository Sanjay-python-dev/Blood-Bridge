import React from 'react';
import { UserPlus, Search, Droplet, Heart, ArrowRight } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      badge: 'STEP 1',
      title: 'Register',
      icon: UserPlus,
      description: 'Create your account as a donor or requester in under two minutes.',
    },
    {
      step: '02',
      badge: 'STEP 2',
      title: 'Search',
      icon: Search,
      description: 'Find available donors by blood group and city or submit a blood request.',
    },
    {
      step: '03',
      badge: 'STEP 3',
      title: 'Connect',
      icon: Droplet,
      description: 'Securely connect with verified donors and coordinate immediate dispatch.',
    },
    {
      step: '04',
      badge: 'STEP 4',
      title: 'Save Lives',
      icon: Heart,
      description: 'Your timely help gives someone another fighting chance at life.',
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-[#050505]">
      {/* Background Subtle Red Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#E50914]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Simple Steps.{' '}
            <span className="text-[#E50914] drop-shadow-[0_0_20px_rgba(229,9,20,0.6)]">
              Big Impact.
            </span>
          </h2>
          <p className="mt-4 text-base text-[#B0B0B0]">
            Our streamlined process bridges donors and patients swiftly during the moments when every second counts.
          </p>
        </div>

        {/* 4 Steps Grid with connecting line */}
        <div className="relative">
          
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-[12%] right-[12%] h-[2px] -translate-y-12 bg-gradient-to-r from-[#222] via-[#E50914]/40 to-[#222] z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="group relative glass-card hover:border-[#E50914] rounded-2xl p-6 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
                >
                  {/* Top edge glass reflection highlight */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  {/* Step Badge */}
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#B0B0B0] group-hover:text-[#FF2B2B] bg-[#1a1a1a] border border-white/5 px-2.5 py-0.5 rounded-full mb-6 transition-colors">
                    {item.badge}
                  </span>

                  {/* Circular Icon with Red Outline */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-[#180d0f] border-2 border-[#E50914] flex items-center justify-center text-[#FF2B2B] group-hover:bg-[#E50914] group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(229,9,20,0.35)] group-hover:shadow-[0_0_30px_rgba(229,9,20,0.7)]">
                      <Icon className="w-8 h-8" />
                    </div>
                    {/* Tiny Step Index */}
                    <span className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-[#050505] border border-[#E50914] text-[11px] font-bold text-white flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-xl font-bold text-white group-hover:text-[#FF2B2B] transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#B0B0B0] leading-relaxed">
                    {item.description}
                  </p>

                  {/* Subtle hover arrow */}
                  <div className="mt-4 pt-3 w-full border-t border-white/5 flex items-center justify-center text-xs font-semibold text-[#737373] group-hover:text-white transition-colors">
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform text-[#E50914]" />
                  </div>

                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
