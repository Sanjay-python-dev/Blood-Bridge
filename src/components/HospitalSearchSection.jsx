import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Building,
  MapPin,
  Compass,
  Droplet,
  Users,
  Navigation,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { searchHospitals, getPublicNearbyDonors } from '../services/hospitalService';
import { bloodGroups } from '../data/mockData';

export default function HospitalSearchSection() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [selectedRadius, setSelectedRadius] = useState(25);

  const [nearbyDonors, setNearbyDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [donorError, setDonorError] = useState('');

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete search across all 550 hospitals
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchHospitals(query.trim(), 12);
        if (!isCancelled) {
          setSuggestions(results);
          setShowDropdown(true);
        }
      } catch (err) {
        console.warn('Error fetching hospital suggestions:', err);
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Load nearby donors when hospital, blood group, or radius changes
  useEffect(() => {
    if (!selectedHospital) return;

    let isMounted = true;
    const loadDonors = async () => {
      setLoadingDonors(true);
      setDonorError('');
      try {
        const res = await getPublicNearbyDonors({
          hospitalId: selectedHospital.id,
          bloodGroup: selectedGroup,
          radius: selectedRadius
        });
        if (isMounted) {
          setNearbyDonors(res.donors || []);
        }
      } catch (err) {
        if (isMounted) {
          setDonorError(err.message || 'Could not load nearby donors.');
        }
      } finally {
        if (isMounted) setLoadingDonors(false);
      }
    };

    loadDonors();
    return () => { isMounted = false; };
  }, [selectedHospital, selectedGroup, selectedRadius]);

  const handleSelectHospital = (hosp) => {
    setSelectedHospital(hosp);
    setQuery(hosp.hospital_name || hosp.name);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedHospital(null);
    setQuery('');
    setNearbyDonors([]);
    setSuggestions([]);
  };

  return (
    <section className="py-20 bg-[#080808] border-b border-[#181818] relative overflow-hidden" id="hospital-search-section">
      {/* Ambient Red Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E50914]/8 rounded-full blur-[170px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#18080a] border border-[#E50914]/40 text-[#FF2B2B] text-xs font-bold uppercase tracking-widest mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>GEO-LOCATED DONOR DISCOVERY</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Hospital Search & <span className="text-[#E50914]">Nearby Donors</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#B0B0B0] leading-relaxed">
            Search across 550 authorized hospitals in all 38 Tamil Nadu districts. Select your hospital to calculate true geographic distance to ready blood donors.
          </p>

          {/* Quick preset suggestions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[#737373]">
            <span>Try searching:</span>
            <button
              onClick={() => { setQuery('Government Medical College Hospital, Karur'); }}
              className="text-[#FF2B2B] hover:underline bg-[#141414] px-2.5 py-1 rounded-lg border border-white/5"
            >
              GMCH Karur
            </button>
            <button
              onClick={() => { setQuery('Government Medical College Hospital, Tiruppur'); }}
              className="text-[#FF2B2B] hover:underline bg-[#141414] px-2.5 py-1 rounded-lg border border-white/5"
            >
              GMCH Tiruppur
            </button>
            <button
              onClick={() => { setQuery('Kulithalai'); }}
              className="text-[#FF2B2B] hover:underline bg-[#141414] px-2.5 py-1 rounded-lg border border-white/5"
            >
              Kulithalai
            </button>
            <button
              onClick={() => { setQuery('Aravakurichi'); }}
              className="text-[#FF2B2B] hover:underline bg-[#141414] px-2.5 py-1 rounded-lg border border-white/5"
            >
              Aravakurichi
            </button>
          </div>
        </div>

        {/* Autocomplete Search Bar Container */}
        <div className="max-w-3xl mx-auto mb-10 relative" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
              placeholder="Search by Hospital Name, District, or Location (e.g. Karur, Tiruppur, Apollo)..."
              className="w-full bg-white/[0.06] border border-white/15 focus:border-[#E50914]/80 rounded-2xl pl-12 pr-12 py-4 text-sm sm:text-base text-white placeholder-[#80808a] outline-none shadow-[0_12px_35px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-xl transition-all"
            />
            <Search className="w-5 h-5 text-[#737373] absolute left-4 top-4 sm:top-4.5" />
            
            {query && (
              <button
                onClick={handleClearSelection}
                className="absolute right-4 top-4 text-[#737373] hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[rgba(18,18,24,0.92)] backdrop-blur-3xl border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-h-80 overflow-y-auto z-50 divide-y divide-white/5">
              {suggestions.map((hosp) => (
                <button
                  key={hosp.id}
                  onClick={() => handleSelectHospital(hosp)}
                  className="w-full text-left p-4 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1f0d0f] border border-[#E50914]/30 flex items-center justify-center text-[#FF2B2B] flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-[#FF2B2B] transition-colors">
                        {hosp.hospital_name || hosp.name}
                      </h4>
                      <p className="text-xs text-[#888] mt-0.5 flex items-center gap-2">
                        <span>{hosp.location}</span>
                        <span>•</span>
                        <span className="text-[#B0B0B0]">{hosp.district} District</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#999] border border-white/5">
                      {hosp.user_key}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="absolute right-12 top-4.5 text-xs text-[#737373] flex items-center gap-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#FF2B2B]" />
            </div>
          )}
        </div>

        {/* Selected Hospital Card & Nearby Donors Results */}
        {selectedHospital && (
          <div className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-fadeIn relative overflow-hidden">
            {/* Top edge glass reflection highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            
            {/* Hospital Details Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.4)] flex-shrink-0">
                  <Building className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED HOSPITAL ACCOUNT
                    </span>
                    <span className="text-xs text-[#555]">•</span>
                    <span className="text-xs font-mono text-[#B0B0B0]">{selectedHospital.user_key}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {selectedHospital.hospital_name || selectedHospital.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#B0B0B0] mt-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#E50914]" />
                      <strong>Location:</strong> {selectedHospital.location}
                    </span>
                    <span>•</span>
                    <span><strong>District:</strong> {selectedHospital.district}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">
                      <strong>GPS:</strong> {selectedHospital.latitude?.toFixed(4)}° N, {selectedHospital.longitude?.toFixed(4)}° E
                    </span>
                  </div>
                </div>
              </div>

              {/* View on Map Link */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedHospital.latitude},${selectedHospital.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222] border border-white/10 text-xs font-bold text-white transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#FF2B2B]" />
                  <span>Open Location in Map</span>
                  <ExternalLink className="w-3 h-3 text-[#737373]" />
                </a>
              </div>
            </div>

            {/* Filter Controls: Blood Group & Radius */}
            <div className="py-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#FF2B2B]" />
                  <span>Filter Donors Near This Hospital</span>
                </h4>
                <p className="text-xs text-[#888] mt-0.5">
                  Showing active voluntary blood donors sorted strictly by Haversine distance.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Blood Group Select */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#B0B0B0] mb-1">Blood Group</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="bg-[#161616] border border-[#333] text-white text-xs rounded-xl px-3 py-2 outline-none font-bold cursor-pointer"
                  >
                    <option value="All">All Blood Groups</option>
                    {bloodGroups.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {/* Radius Select */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#B0B0B0] mb-1">Search Radius</label>
                  <select
                    value={selectedRadius}
                    onChange={(e) => setSelectedRadius(Number(e.target.value))}
                    className="bg-[#161616] border border-[#333] text-white text-xs rounded-xl px-3 py-2 outline-none font-bold cursor-pointer"
                  >
                    <option value={5}>5 km Radius</option>
                    <option value={10}>10 km Radius</option>
                    <option value={25}>25 km Radius (Default)</option>
                    <option value={50}>50 km Radius</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nearby Blood Donors Header */}
            <div className="pt-6 mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E50914]" />
                  <span>Nearby Blood Donors</span>
                  <span className="text-xs font-normal text-[#B0B0B0]">
                    ({nearbyDonors.length} available within {selectedRadius} km)
                  </span>
                </h4>
              </div>
            </div>

            {/* Nearby Donors List */}
            {loadingDonors ? (
              <div className="py-16 text-center text-xs text-[#737373] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 text-[#FF2B2B] animate-spin" />
                <span>Calculating geographic distance to active donors...</span>
              </div>
            ) : donorError ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {donorError}
              </div>
            ) : nearbyDonors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyDonors.map((donor) => (
                  <div
                    key={donor.id}
                    className="bg-[#161616] border border-white/5 hover:border-[#E50914]/50 rounded-2xl p-4 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#E50914]/20 text-[#FF2B2B] text-xs font-black">
                          {donor.bloodGroup || donor.blood_group}
                        </span>
                        <h5 className="text-sm font-bold text-white">{donor.name}</h5>
                      </div>
                      
                      {/* Haversine Distance Badge */}
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#1a080a] text-[#FF2B2B] border border-[#E50914]/30 shadow-[0_0_10px_rgba(229,9,20,0.2)]">
                        {donor.distanceFormatted}
                      </span>
                    </div>

                    <div className="text-xs text-[#B0B0B0] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E50914]" />
                      <span>{donor.city ? `${donor.city}, ${donor.district}` : donor.district}</span>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-3">
                        {donor.phone && (
                          <a
                            href={`tel:${donor.phone}`}
                            className="font-mono text-[#888] hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Phone className="w-3 h-3 text-[#737373]" />
                            <span>{donor.phone}</span>
                          </a>
                        )}
                        {(donor.displayEmail || donor.email) && (
                          <a
                            href={`mailto:${donor.email || donor.displayEmail}`}
                            className="text-[#888] hover:text-white flex items-center gap-1 transition-colors break-all"
                          >
                            <Mail className="w-3 h-3 text-[#E50914]" />
                            <span>{donor.displayEmail || donor.email}</span>
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#737373] bg-[#141414] rounded-2xl border border-white/5 p-6">
                <AlertCircle className="w-8 h-8 text-amber-500/80 mx-auto mb-2" />
                <p className="text-white font-semibold mb-1">
                  No active {selectedGroup !== 'All' ? `${selectedGroup} ` : ''}donors found within {selectedRadius} km
                </p>
                <p>Try widening your search radius to 25 km or 50 km to discover more nearby donors.</p>
              </div>
            )}

          </div>
        )}

      </div>
    </section>
  );
}
