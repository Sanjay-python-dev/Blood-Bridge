import React from 'react';
import { MapPin, Users, Activity, ShieldCheck, HeartPulse } from 'lucide-react';

export default function AboutHero({ summary, loading }) {
  const isLive = summary?.isLiveBackend;
  const registeredDonors = summary?.registeredDonors;
  const activeRequests = summary?.activeRequests;

  return (
    <section className="relative pt-12 pb-16 lg:pt-16 lg:pb-20 overflow-hidden border-b border-white/[0.08]">
      {/* Background ambient red glow orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(255,30,45,0.18)_0%,transparent_70%)] blur-[100px] pointer-events-none" />
      <div className="absolute -top-20 right-10 w-80 h-80 bg-[#b00010]/15 rounded-full blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Small Red Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c080b] border border-[#ff1e2d]/40 shadow-[0_0_20px_rgba(255,30,45,0.25)] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#ff1e2d] animate-ping" />
          <span className="text-xs uppercase tracking-[0.22em] font-extrabold text-[#ff424f]">
            ABOUT BLOOD BRIDGE
          </span>
        </div>

        {/* Large Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto">
          <span className="text-white block">Connecting Tamil Nadu</span>
          <span className="text-[#ff1e2d] drop-shadow-[0_0_35px_rgba(255,30,45,0.65)] block mt-1">
            One Donor at a Time
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-[#a0a0a0] max-w-3xl mx-auto leading-relaxed font-normal">
          Blood Bridge helps connect blood donors, hospitals and people in need through a faster, transparent and location-aware blood donation network.
        </p>

        {/* 3 Small Statistics Cards */}
        <div className="mt-10 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: 38 Districts */}
          <div className="bg-[#0d0d12]/90 backdrop-blur-xl border border-white/10 hover:border-[#ff1e2d]/40 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,30,45,0.15)] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff1e2d]/5 rounded-full blur-2xl group-hover:bg-[#ff1e2d]/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#a0a0a0]">
                Coverage
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#1a0c0e] border border-[#ff1e2d]/30 flex items-center justify-center text-[#ff1e2d] group-hover:scale-110 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              38 Districts
            </div>
            <p className="text-xs text-[#a0a0a0] mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              100% Tamil Nadu Coverage
            </p>
          </div>

          {/* Card 2: Active Donors */}
          <div className="bg-[#0d0d12]/90 backdrop-blur-xl border border-white/10 hover:border-[#ff1e2d]/40 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,30,45,0.15)] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff1e2d]/5 rounded-full blur-2xl group-hover:bg-[#ff1e2d]/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#a0a0a0]">
                {isLive ? 'Active Donors' : 'Live Donor Network'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#1a0c0e] border border-[#ff1e2d]/30 flex items-center justify-center text-[#ff1e2d] group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? (
                <span className="inline-block w-16 h-7 bg-white/10 animate-pulse rounded" />
              ) : (
                registeredDonors ? `${registeredDonors.toLocaleString()}+` : 'Active Donors'
              )}
            </div>
            <p className="text-xs text-[#a0a0a0] mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff1e2d] inline-block" />
              Verified blood donors
            </p>
          </div>

          {/* Card 3: Blood Requests */}
          <div className="bg-[#0d0d12]/90 backdrop-blur-xl border border-white/10 hover:border-[#ff1e2d]/40 rounded-2xl p-5 text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgba(255,30,45,0.15)] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff1e2d]/5 rounded-full blur-2xl group-hover:bg-[#ff1e2d]/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-[#a0a0a0]">
                {isLive ? 'Blood Requests' : 'Real-Time Requests'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#1a0c0e] border border-[#ff1e2d]/30 flex items-center justify-center text-[#ff1e2d] group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? (
                <span className="inline-block w-12 h-7 bg-white/10 animate-pulse rounded" />
              ) : (
                activeRequests !== undefined ? `${activeRequests} Active` : 'Real-Time Requests'
              )}
            </div>
            <p className="text-xs text-[#a0a0a0] mt-1 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-[#ff424f]" />
              Hospital emergencies linked
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
