import React, { useState, useMemo } from 'react';
import { Search, MapPin, Users, Droplet, Activity, ChevronRight } from 'lucide-react';
import { HEATMAP_TIERS } from '../../services/tamilNaduNetworkService';

export default function DistrictGrid({
  districtsList = [],
  selectedDistrict,
  onSelectDistrict,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');

  // Filtered districts
  const filteredDistricts = useMemo(() => {
    return districtsList.filter((d) => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = tierFilter === 'ALL' || d.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [districtsList, searchTerm, tierFilter]);

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#ff1e2d] bg-[#1a080a] border border-[#ff1e2d]/30 px-3 py-1 rounded-full mb-3">
            STATEWIDE DIRECTORY
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Explore Tamil Nadu's Blood Network
          </h2>
          <p className="text-sm text-[#a0a0a0] mt-2 max-w-xl">
            Live availability metrics across all 38 districts. Select any district to view its full donor roster and hospital connections.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#737380] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search district..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d0d12] border border-white/10 text-xs text-white placeholder-[#737380] focus:border-[#ff1e2d] focus:outline-none transition-colors"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-[#0d0d12] border border-white/10 text-xs text-[#a0a0a0] focus:border-[#ff1e2d] focus:outline-none transition-colors cursor-pointer"
          >
            <option value="ALL">All Availability Tiers</option>
            <option value="very_high">Very High</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

        </div>
      </div>

      {/* Grid of District Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {filteredDistricts.map((district) => {
          const tierMeta = HEATMAP_TIERS[district.tier] || HEATMAP_TIERS.medium;
          const isSelected = selectedDistrict?.name === district.name;

          return (
            <div
              key={district.name}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDistrict(district)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDistrict(district);
                }
              }}
              className={`group p-5 rounded-2xl bg-[#0d0d12] border transition-all duration-300 text-left flex flex-col justify-between cursor-pointer relative overflow-hidden transform hover:-translate-y-1.5 ${
                isSelected
                  ? 'border-[#ff1e2d] shadow-[0_0_30px_rgba(255,30,45,0.35)] ring-1 ring-[#ff1e2d]'
                  : 'border-white/10 hover:border-[#ff1e2d]/60 hover:shadow-[0_10px_30px_rgba(255,30,45,0.15)]'
              }`}
            >
              {/* Subtle hover background glow */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#ff1e2d]/5 rounded-full blur-2xl group-hover:bg-[#ff1e2d]/10 transition-colors pointer-events-none" />

              <div>
                {/* Top Row: District Name & Heatmap Tier Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#ff424f] transition-colors flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#ff1e2d] flex-shrink-0" />
                      <span>{district.name}</span>
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#737380] block mt-0.5">
                      Tamil Nadu
                    </span>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border flex-shrink-0"
                    style={{
                      backgroundColor: tierMeta.badgeBg,
                      borderColor: tierMeta.stroke,
                      color: tierMeta.badgeText,
                    }}
                  >
                    {tierMeta.label}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div className="p-2 rounded-lg bg-black/30">
                    <span className="text-[10px] text-[#a0a0a0] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#ff1e2d]" />
                      Total Donors
                    </span>
                    <span className="text-sm font-black text-white font-mono block mt-0.5">
                      {district.totalDonors}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-black/30">
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Droplet className="w-3 h-3" />
                      Available
                    </span>
                    <span className="text-sm font-black text-emerald-400 font-mono block mt-0.5">
                      {district.availableDonors}
                    </span>
                  </div>
                </div>

                {/* Bottom Row: Top Blood Group & Active Requests */}
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <span className="text-[11px] text-[#a0a0a0]">
                    Lead Group: <strong className="text-white font-mono">{district.topBloodGroup}</strong>
                  </span>
                  <span className="text-[11px] text-[#ff424f] font-mono flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {district.activeRequests} {district.activeRequests === 1 ? 'Req' : 'Reqs'}
                  </span>
                </div>
              </div>

              {/* Focus on map prompt */}
              <div className="mt-3 pt-2 text-[10px] text-[#737380] group-hover:text-[#ff424f] flex items-center justify-end gap-0.5 transition-colors font-semibold">
                <span>View on Map</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {filteredDistricts.length === 0 && (
        <div className="py-12 text-center bg-[#0d0d12] rounded-2xl border border-white/10 mt-6">
          <p className="text-sm text-[#a0a0a0]">
            No districts found matching "<span className="text-white">{searchTerm}</span>".
          </p>
        </div>
      )}

    </section>
  );
}
