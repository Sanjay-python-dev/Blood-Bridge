import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, RefreshCw, AlertCircle, Users, CheckCircle2, Loader2, ChevronLeft, ChevronRight, ShieldAlert, HeartHandshake, Info, Send, Key, Plus, Flame, Building } from 'lucide-react';
import DonorCard from '../components/DonorCard';
import BombayRequestModal from '../components/BombayRequestModal';
import BombayTrackModal from '../components/BombayTrackModal';
import { bloodGroups, BOMBAY_BLOOD_GROUP, BOMBAY_BLOOD_GROUP_LABEL } from '../data/mockData';
import { getDonors } from '../services/donorService';
import { getDemoDistricts, filterDonors } from '../services/demoDonorService';
import { getCountries, getStates, getDistricts, getNearbyDistricts, defaultCountry, defaultState } from '../services/locationService';
import { MEDICAL_ELIGIBILITY_DISCLAIMER } from '../services/eligibilityService';
import { isRareBloodGroup } from '../services/privacyService';
import { useAuth } from '../context/AuthContext';

export default function FindBlood() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAuth();
  const initialGroup = searchParams.get('group') || 'All Groups';

  // Location Hierarchy State
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [selectedState, setSelectedState] = useState(defaultState);
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');

  // Filter State
  const [selectedGroup, setSelectedGroup] = useState(initialGroup);
  const [selectedAvailability, setSelectedAvailability] = useState('All Donors');
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [onlyEmergency, setOnlyEmergency] = useState(false);
  const [filterCompatible, setFilterCompatible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Bombay Blood Group Special Flow State
  const [showBombayModal, setShowBombayModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);

  const isBombaySelection =
    selectedGroup === BOMBAY_BLOOD_GROUP ||
    selectedGroup === BOMBAY_BLOOD_GROUP_LABEL ||
    selectedGroup.toLowerCase().includes('bombay') ||
    selectedGroup === 'Oh';

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Data & Status State
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Available lists dynamically loaded from JSON (Requirement 11)
  const countries = getCountries();
  const states = getStates(selectedCountry);
  const demoDistricts = getDemoDistricts();
  const districts = demoDistricts.length > 0 ? demoDistricts : getDistricts(selectedCountry, selectedState);

  // Fetch donors using 38-district demo data source
  const fetchDonors = useCallback(async () => {
    // Bombay Blood Group does NOT display public donors (Requirement 2 & 4)
    if (isBombaySelection) {
      setDonors([]);
      setTotalPages(1);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError('');
    try {
      const res = filterDonors({
        district: selectedDistrict,
        bloodGroup: selectedGroup,
        availability: selectedAvailability,
        onlyEligible,
        onlyEmergency,
        matchCompatibleForRecipient: filterCompatible && selectedGroup !== 'All Groups' ? selectedGroup : null,
        searchQuery,
        page,
        limit: 9,
      });

      setDonors(res.donors || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.warn('Could not fetch demo donors:', err);
      setFetchError('Could not load demo donor dataset.');
    } finally {
      setLoading(false);
    }
  }, [
    isBombaySelection,
    selectedDistrict,
    selectedGroup,
    selectedAvailability,
    onlyEligible,
    onlyEmergency,
    filterCompatible,
    searchQuery,
    page,
  ]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  // Sync blood group if URL parameter changes
  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (
      groupParam &&
      (bloodGroups.includes(groupParam) ||
        groupParam === 'All Groups' ||
        groupParam === BOMBAY_BLOOD_GROUP ||
        groupParam === BOMBAY_BLOOD_GROUP_LABEL ||
        groupParam.toLowerCase().includes('bombay') ||
        groupParam === 'Oh')
    ) {
      setSelectedGroup(groupParam);
    }
  }, [searchParams]);

  // Reset District whenever State changes
  const handleStateChange = (newState) => {
    setSelectedState(newState);
    setSelectedDistrict('All Districts');
    setPage(1);
  };

  const handleReset = () => {
    setSelectedCountry(defaultCountry);
    setSelectedState(defaultState);
    setSelectedDistrict('All Districts');
    setSelectedGroup('All Groups');
    setSelectedAvailability('All Donors');
    setOnlyEligible(false);
    setOnlyEmergency(false);
    setSearchQuery('');
    setPage(1);
    setSearchParams({});
  };

  const handleSearchNearby = () => {
    const nearby = getNearbyDistricts(selectedDistrict === 'All Districts' ? 'Karur' : selectedDistrict);
    if (nearby.length > 0) {
      setSelectedDistrict(nearby[0]);
      setPage(1);
    } else {
      setSelectedDistrict('All Districts');
    }
  };

  const isRareSelection = isRareBloodGroup(selectedGroup);

  return (
    <div className="min-h-screen bg-[#050505] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-3">
            VERIFIED DONOR DIRECTORY
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Find Blood <span className="text-[#E50914]">Donors</span>
          </h1>
          <p className="mt-3 text-base text-[#B0B0B0]">
            Connect with ready and verified voluntary donors across Karur, Chennai, Coimbatore, and all Indian districts.
          </p>

          {/* Blood Request Call to Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/request-blood"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF2B2B]" />
              <span>Request Blood</span>
            </Link>
            <Link
              to="/request-blood?urgency=Emergency"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-white font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all transform hover:-translate-y-0.5"
            >
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>Emergency Blood Request</span>
            </Link>
          </div>
        </div>

        {/* Hospital Blood Needs Callout Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-[#18080a] via-[#120a0d] to-[#0a0a0a] border border-[#E50914]/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_25px_rgba(229,9,20,0.12)]">
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] flex-shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Looking to donate blood instead?</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF2B2B]/20 text-[#FF2B2B] border border-[#FF2B2B]/30">Active Needs</span>
              </div>
              <p className="text-xs text-[#B0B0B0] mt-0.5">
                Verified regional hospitals across Tamil Nadu have published critical blood requirements. Respond voluntarily to save lives.
              </p>
            </div>
          </div>
          <Link
            to="/donate-blood"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all whitespace-nowrap flex-shrink-0"
          >
            <span>Explore Hospital Needs</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </Link>
        </div>

        {/* Rare Blood Group Privacy Warning Banner */}
        {isRareSelection && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5 text-xs text-amber-300 animate-fadeIn">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-bold mb-0.5">Confidential Rare Blood Group Protocol Active ({selectedGroup})</strong>
              <p className="leading-relaxed text-[#B0B0B0]">
                Donors with rare phenotypes are protected under confidential privacy rules. Individual contact records are masked in public catalogs. Requests submitted will be routed directly via BloodBridge Administration and Authorized Regional Hospitals.
              </p>
            </div>
          </div>
        )}

        {/* Filter Card */}
        <div className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] mb-12 relative overflow-hidden">
          {/* Top edge glass reflection highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          
          {/* Row 1: Country -> State -> District -> Blood Group */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            
            {/* Filter 1: State / Union Territory */}
            <div>
              <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                State / UT
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-medium outline-none cursor-pointer transition-colors"
              >
                {states.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: District (Dynamically resets & updates based on State) */}
            <div>
              <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                District / Region
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-medium outline-none cursor-pointer transition-colors"
              >
                <option value="All Districts">All Districts ({selectedState})</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Blood Group */}
            <div>
              <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                Blood Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setPage(1);
                  if (e.target.value === 'All Groups') {
                    searchParams.delete('group');
                    setSearchParams(searchParams);
                  } else {
                    setSearchParams({ group: e.target.value });
                  }
                }}
                className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-black outline-none cursor-pointer transition-colors"
              >
                <option value="All Groups">All Blood Groups</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
                <option value={BOMBAY_BLOOD_GROUP_LABEL} className="text-[#FF2B2B] font-bold">
                  ★ {BOMBAY_BLOOD_GROUP_LABEL} (Protected Registry)
                </option>
              </select>
            </div>

            {/* Filter 4: Text Search Keyword */}
            <div>
              <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                Keyword Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search name, area, hospital..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#666] outline-none transition-colors"
                />
                <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-3.5" />
              </div>
            </div>

          </div>

          {/* Row 2: Advanced Filters (Availability, Eligible to Donate, Emergency Availability) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
            {/* Availability dropdown */}
            <div>
              <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                Availability Status
              </label>
              <select
                value={selectedAvailability}
                onChange={(e) => {
                  setSelectedAvailability(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-xs text-white font-medium outline-none cursor-pointer"
              >
                <option value="All Donors">All Availability Statuses</option>
                <option value="Available Now">Available Now (Ready)</option>
                <option value="Available Soon">Available Soon</option>
              </select>
            </div>

            {/* Checkbox: Eligible to Donate Now */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyEligible}
                  onChange={(e) => {
                    setOnlyEligible(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">
                  Eligible to Donate (Cooling interval passed)
                </span>
              </label>
            </div>

            {/* Checkbox: Emergency Availability */}
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyEmergency}
                  onChange={(e) => {
                    setOnlyEmergency(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">
                  Emergency Readiness (Available on call)
                </span>
              </label>
            </div>

            {/* Checkbox: Compatible Donors Filter */}
            {selectedGroup !== 'All Groups' && (
              <div className="flex items-center pt-2 sm:col-span-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterCompatible}
                    onChange={(e) => {
                      setFilterCompatible(e.target.checked);
                      setPage(1);
                    }}
                    className="w-4 h-4 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#FF2B2B]">
                    Include all clinically compatible donor types for patient type {selectedGroup}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#B0B0B0]">
              <Users className="w-4 h-4 text-[#FF2B2B]" />
              <span>
                Found <strong className="text-white">{totalCount}</strong> matching donors in{' '}
                <strong className="text-white">{selectedDistrict}</strong> ({selectedState})
              </span>
              {selectedGroup !== 'All Groups' && (
                <span className="bg-[#1c0a0c] text-[#FF2B2B] border border-[#E50914]/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Type: {selectedGroup}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#B0B0B0] hover:text-white bg-[#1a1a1a] hover:bg-[#222] border border-white/10 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>

              <button
                onClick={fetchDonors}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF2B2B] to-[#E50914] shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                <span>SEARCH DONORS</span>
              </button>
            </div>
          </div>

        </div>

        {fetchError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button onClick={fetchDonors} className="underline hover:text-white font-semibold">Retry</button>
          </div>
        )}

        {/* Fictional Demo Donor Data Notice (Requirement 15) */}
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Demo donor data — contact details are for demonstration only.</span>
        </div>

        {/* Donors Catalog Grid / Bombay Protocol View */}
        {isBombaySelection ? (
          <div className="bg-[#111111]/90 backdrop-blur-2xl border border-red-500/30 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden animate-fadeIn">
            {/* Top Red Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold tracking-wider uppercase mb-5">
                <ShieldAlert className="w-4 h-4 text-[#FF2B2B]" />
                <span>Restricted Clinical Protocol • Rare Phenotype Registry</span>
              </div>

              <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
                Bombay Blood Group <span className="text-[#FF2B2B]">(Oh / hh)</span>
              </h2>

              <div className="p-4 rounded-2xl bg-black/50 border border-red-500/20 text-xs md:text-sm text-neutral-300 mb-8 leading-relaxed text-left space-y-3">
                <p className="font-semibold text-white">
                  Bombay Blood Group (Oh / hh) is an extremely rare blood phenotype. Due to donor safety, vulnerability to solicitation, and extreme clinical scarcity, donor details are protected and cannot be browsed publicly. Access requires verified hospital authorization.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Genotype / Antigen</div>
                    <div className="text-xs font-bold text-white mt-0.5">H-Deficient (hh / Oh)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Compatibility Rule</div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">Can ONLY receive Oh</div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Prevalence</div>
                    <div className="text-xs font-bold text-red-400 mt-0.5">&lt; 0.0004% (~1 in 10,000)</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
                <button
                  onClick={() => setShowBombayModal(true)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:brightness-110 shadow-[0_0_25px_rgba(229,9,20,0.45)] transition-all flex items-center justify-center gap-2"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Request Bombay Blood</span>
                </button>

                <button
                  onClick={() => setShowTrackModal(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-neutral-400" />
                  <span>Track Existing Request</span>
                </button>

                <Link
                  to="/bombay-access"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  <span>Hospital Access Portal</span>
                </Link>
              </div>

              {/* 24/7 Helpline Footer */}
              <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
                <span>Emergency 24/7 BloodBridge Rare Protocol Line:</span>
                <span className="font-mono font-bold text-red-400 tracking-wider">1800-BLOOD-BRIDGE (Toll Free)</span>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-center bg-[#111111]/40 border border-white/5 rounded-3xl">
            <Loader2 className="w-10 h-10 text-[#FF2B2B] animate-spin" />
            <p className="text-sm text-[#B0B0B0] font-medium tracking-wide">
              Scanning live donor directory across {selectedDistrict} and {selectedState}...
            </p>
          </div>
        ) : donors.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {donors.map((donor) => (
                <DonorCard key={donor.id} donor={donor} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="p-2.5 rounded-xl bg-[#111111] border border-white/10 text-[#B0B0B0] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPage(p);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      page === p
                        ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]'
                        : 'bg-[#111111] border border-white/10 text-[#B0B0B0] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="p-2.5 rounded-xl bg-[#111111] border border-white/10 text-[#B0B0B0] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State as Specified in Rule 4 & Requirement 7 */
          <div className="text-center py-20 bg-[#111111] border border-[#222222] rounded-3xl p-8 animate-fadeIn max-w-2xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              No matching donors found in this district.
            </h3>
            <p className="text-sm text-[#B0B0B0] max-w-md mx-auto mb-8 leading-relaxed">
              We couldn't find active voluntary donors matching <strong className="text-white">{selectedGroup}</strong> in <strong className="text-white">{selectedDistrict}</strong>. Choose one of the instant triage actions below:
            </p>

            {/* Action buttons: Search Nearby Districts, Modify Blood Group, Submit Emergency Request */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleSearchNearby}
                className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/20 text-white text-xs font-semibold transition-all"
              >
                Search Nearby Districts
              </button>

              <button
                onClick={() => {
                  setSelectedGroup('All Groups');
                  setPage(1);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/20 text-white text-xs font-semibold transition-all"
              >
                Modify Blood Group
              </button>

              <Link
                to="/request-blood"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all"
              >
                Submit Emergency Request
              </Link>
            </div>
          </div>
        )}

        {/* Informational Disclaimer Footer */}
        <div className="mt-16 text-center pt-8 border-t border-white/5">
          <p className="text-xs text-[#737373] max-w-2xl mx-auto leading-relaxed">
            * {MEDICAL_ELIGIBILITY_DISCLAIMER}
          </p>
        </div>

      </div>

      {/* Bombay Request Modal */}
      {showBombayModal && (
        <BombayRequestModal
          isOpen={showBombayModal}
          onClose={() => setShowBombayModal(false)}
          initialDistrict={selectedDistrict !== 'All Districts' ? selectedDistrict : ''}
        />
      )}

      {/* Bombay Request Tracking Modal */}
      {showTrackModal && (
        <BombayTrackModal
          isOpen={showTrackModal}
          onClose={() => setShowTrackModal(false)}
        />
      )}
    </div>
  );
}
