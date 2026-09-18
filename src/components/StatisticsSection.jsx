import React from 'react';
import { Droplet, Users, HeartHandshake, MapPin } from 'lucide-react';

export default function StatisticsSection() {
  const stats = [
    {
      icon: Droplet,
      value: '1000+',
      label: 'Registered Donors',
      subtext: 'Ready to respond across TN',
    },
    {
      icon: Users,
      value: '500+',
      label: 'Lives Helped',
      subtext: 'Through timely donations',
    },
    {
      icon: HeartHandshake,
      value: '50+',
      label: 'Blood Requests Fulfilled',
      subtext: 'Critical & urgent hospital cases',
    },
    {
      icon: MapPin,
      value: 'Multiple Cities',
      label: 'Across Tamil Nadu',
      subtext: 'Karur, Chennai, Coimbatore & more',
    },
  ];

  return (
    <section className="relative z-10 -mt-10 sm:-mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Large iOS Glass Statistics Card */}
      <div className="glass-lvl2 border border-white/15 hover:border-white/25 rounded-3xl p-6 sm:p-10 shadow-[0_16px_45px_-8px_rgba(0,0,0,0.6)] transition-all duration-300 relative overflow-hidden">
        {/* Top edge glass reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`group flex items-start gap-4 transition-all duration-300 transform hover:-translate-y-1 ${
                  idx !== 0 ? 'pt-6 sm:pt-0 sm:pl-8' : ''
                }`}
              >
                {/* Red Icon in subtle dark glow badge */}
                <div className="w-14 h-14 rounded-2xl bg-[#1c0c0e] border border-[#E50914]/30 flex items-center justify-center text-[#E50914] group-hover:text-[#FF2B2B] group-hover:bg-[#E50914]/20 group-hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all duration-300 flex-shrink-0">
                  <Icon className="w-7 h-7" />
                </div>

                {/* Stat Content */}
                <div className="flex flex-col">
                  <span className="text-3xl lg:text-4xl font-black text-white group-hover:text-[#FF2B2B] transition-colors tracking-tight">
                    {item.value}
                  </span>
                  <span className="text-base font-bold text-white mt-1">
                    {item.label}
                  </span>
                  <span className="text-xs text-[#B0B0B0] mt-0.5">
                    {item.subtext}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
