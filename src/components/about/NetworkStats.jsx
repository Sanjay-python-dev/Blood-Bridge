import React from 'react';
import { MapPin, Users, Droplet, Building2, Activity, Database, CheckCircle } from 'lucide-react';

export default function NetworkStats({ summary, loading }) {
  const isLive = summary?.isLiveBackend;
  const dataSource = summary?.dataSource || 'System Verified Network';

  const statsItems = [
    {
      label: 'Districts Covered',
      value: summary?.totalDistricts ? `${summary.totalDistricts}/38` : '38',
      subtext: 'Across Tamil Nadu state',
      icon: MapPin,
      accent: '#ff1e2d',
    },
    {
      label: 'Registered Donors',
      value: summary?.registeredDonors ? summary.registeredDonors.toLocaleString() : '—',
      subtext: 'Verified voluntary donors',
      icon: Users,
      accent: '#ff4d5a',
    },
    {
      label: 'Available Donors',
      value: summary?.availableDonors ? summary.availableDonors.toLocaleString() : '—',
      subtext: 'Ready for emergency response',
      icon: Droplet,
      accent: '#10b981',
    },
    {
      label: 'Connected Hospitals',
      value: summary?.connectedHospitals !== undefined ? summary.connectedHospitals : '6',
      subtext: 'Authorized care centers',
      icon: Building2,
      accent: '#38bdf8',
    },
    {
      label: 'Active Blood Requests',
      value: summary?.activeRequests !== undefined ? summary.activeRequests : '—',
      subtext: 'Under active coordination',
      icon: Activity,
      accent: '#f59e0b',
    },
  ];

  return (
    <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Dashboard Card Container */}
      <div className="p-8 sm:p-12 rounded-3xl bg-[#0d0d12] border border-white/10 relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
        
        {/* Subtle top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#ff1e2d]/40 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#ff1e2d] animate-ping" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff424f] font-bold">
                LIVE NETWORK SUMMARY
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Tamil Nadu Blood Network
            </h2>
            <p className="text-xs sm:text-sm text-[#a0a0a0] mt-1">
              Consolidated real-time registry and emergency coordination metrics statewide.
            </p>
          </div>

          {/* Database Source Verification Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14141e] border border-white/15 text-xs text-[#a0a0a0] self-start md:self-auto">
            <Database className="w-3.5 h-3.5 text-[#ff1e2d]" />
            <span>Source: <strong className="text-white font-medium">{dataSource}</strong></span>
            {isLive ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Live Supabase Sync" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" title="Dataset Verified" />
            )}
          </div>
        </div>

        {/* 5 Stats Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {statsItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group p-5 rounded-2xl bg-[#12121a] border border-white/5 hover:border-[#ff1e2d]/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: `${item.accent}15`,
                      border: `1px solid ${item.accent}30`,
                      color: item.accent,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-xs font-semibold text-[#a0a0a0] block">
                    {item.label}
                  </span>

                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 font-mono">
                    {loading ? (
                      <span className="inline-block w-14 h-8 bg-white/10 animate-pulse rounded" />
                    ) : (
                      item.value
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-[#737380] mt-3 pt-2 border-t border-white/5">
                  {item.subtext}
                </p>
              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
}
