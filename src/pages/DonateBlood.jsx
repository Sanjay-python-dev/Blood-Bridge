import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Heart,
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  MapPin,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Eye,
  Send,
  UserPlus,
  Sparkles,
  Flame,
  Droplet,
  CheckCircle2
} from 'lucide-react';
import { bloodGroups } from '../data/mockData';
import { TAMIL_NADU_DISTRICTS } from '../data/locationData';
import { useAuth } from '../context/AuthContext';
import { getStates, getDistricts, defaultCountry, defaultState } from '../services/locationService';
import { registerNewDonor } from '../services/donorService';
import { MEDICAL_ELIGIBILITY_DISCLAIMER } from '../services/eligibilityService';
import { fetchHospitalRequirements } from '../services/hospitalRequirementService';
import { showToast } from '../components/Toast';
import BloodDonationInteractiveDrop from '../components/animations/BloodDonationInteractiveDrop';
import BloodLoadingDrop from '../components/animations/BloodLoadingDrop';
import HospitalRequirementModal from '../components/HospitalRequirementModal';
import DonateResponseModal from '../components/DonateResponseModal';

export default function DonateBlood() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, donorRecord, refreshProfile } = useAuth();

  // Active Main Tab: 'needs' (Current Hospital Blood Needs) or 'register' (Become a Voluntary Donor)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'needs');

  // Filters State for Hospital Needs
  const [selectedGroup, setSelectedGroup] = useState(searchParams.get('group') || 'All');
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get('district') || 'All');
  const [selectedUrgency, setSelectedUrgency] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Hospital Requirements Data State
  const [requirements, setRequirements] = useState([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [errorRequirements, setErrorRequirements] = useState('');

  // Modals State
  const [selectedRequirementDetails, setSelectedRequirementDetails] = useState(null);
  const [selectedRequirementForDonate, setSelectedRequirementForDonate] = useState(null);

  // User district for location-based discovery
  const userDistrict = profile?.district || donorRecord?.district || '';

  // --------------------------------------------------------------------------
  // 1. Fetch Hospital Blood Requirements
  // --------------------------------------------------------------------------
  const loadRequirements = useCallback(async () => {
    setLoadingRequirements(true);
    setErrorRequirements('');
    try {
      const data = await fetchHospitalRequirements({
        bloodGroup: selectedGroup,
        district: selectedDistrict,
        urgency: selectedUrgency,
        search: searchQuery,
      });
      setRequirements(data || []);
    } catch (err) {
      console.warn('Error loading hospital requirements:', err);
      setErrorRequirements('Unable to load current blood requirements. Please try again.');
    } finally {
      setLoadingRequirements(false);
    }
  }, [selectedGroup, selectedDistrict, selectedUrgency, searchQuery]);

  useEffect(() => {
    if (activeTab === 'needs') {
      loadRequirements();
    }
  }, [activeTab, loadRequirements]);

  // Location-based prioritization: if user has a district, rank those requirements first
  const sortedRequirements = useMemo(() => {
    if (!requirements || requirements.length === 0) return [];
    if (!userDistrict) return requirements;

    const userDistLower = userDistrict.toLowerCase();
    return [...requirements].sort((a, b) => {
      const aDistMatch = (a.district || '').toLowerCase() === userDistLower ? -1 : 0;
      const bDistMatch = (b.district || '').toLowerCase() === userDistLower ? -1 : 0;
      if (aDistMatch !== bDistMatch) return aDistMatch - bDistMatch;
      return 0; // preserve original urgency sort
    });
  }, [requirements, userDistrict]);

  // Separate emergency requirements for top priority banner
  const emergencyRequirements = useMemo(() => {
    return sortedRequirements.filter(r => r.urgency === 'Emergency');
  }, [sortedRequirements]);

  // Standard/All filtered list
  const standardRequirements = useMemo(() => {
    return sortedRequirements;
  }, [sortedRequirements]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedGroup('All');
    setSelectedDistrict('All');
    setSelectedUrgency('All');
    setSearchQuery('');
  };

  // --------------------------------------------------------------------------
  // 2. Existing Donor Registration Form Logic (Preserved in 'register' Tab)
  // --------------------------------------------------------------------------
  const [submittedDonor, setSubmittedDonor] = useState(false);
  const [donorErrors, setDonorErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmittingDonor, setIsSubmittingDonor] = useState(false);
  const [createdDonorId, setCreatedDonorId] = useState('BB-TN-8924');

  const [selectedState, setSelectedState] = useState(defaultState);
  const availableDistricts = getDistricts(defaultCountry, selectedState);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    gender: 'Male',
    bloodGroup: '',
    country: defaultCountry,
    state: defaultState,
    city: availableDistricts[0] || 'Karur',
    area: '',
    lastDonationDate: '',
    isAvailable: true,
    medicalEligibility: false,
  });

  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || profile?.full_name || '',
        email: prev.email || profile?.email || user?.email || '',
        phone: prev.phone || profile?.phone || '',
      }));
    }
  }, [profile, user]);

  const handleStateChange = (newState) => {
    setSelectedState(newState);
    const districts = getDistricts(defaultCountry, newState);
    setFormData((prev) => ({
      ...prev,
      state: newState,
      city: districts[0] || '',
    }));
  };

  const validateDonorForm = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) errs.email = 'Valid email is required';
    if (!formData.phone.trim() || formData.phone.length < 10) errs.phone = '10-digit mobile number required';
    if (!formData.dob) {
      errs.dob = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dob);
      const ageDifMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDifMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (calculatedAge < 18 || calculatedAge > 65) {
        errs.dob = 'Donors must be between 18 and 65 years of age';
      }
    }
    if (!formData.bloodGroup) errs.bloodGroup = 'Please select your blood group';
    if (!formData.area.trim()) errs.area = 'Area/Locality is required';
    if (!formData.medicalEligibility) errs.medicalEligibility = 'You must confirm medical eligibility';
    setDonorErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDonorSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateDonorForm()) return;

    setIsSubmittingDonor(true);
    try {
      let calculatedAge = 25;
      if (formData.dob) {
        const birthDate = new Date(formData.dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      }

      const newDonor = await registerNewDonor({
        ...formData,
        age: calculatedAge,
        state: selectedState,
        district: formData.city,
      }, user?.id);

      if (refreshProfile) {
        await refreshProfile();
      }

      setCreatedDonorId(`BB-TN-${newDonor.id ? String(newDonor.id).slice(-4).toUpperCase() : '8924'}`);
      setSubmittedDonor(true);
      showToast('Thank you! Your voluntary donor profile is active.', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setServerError(err.message || 'Failed to register as donor. Please try again.');
    } finally {
      setIsSubmittingDonor(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle Ambient Red Glows */}
      <div className="absolute top-10 left-1/3 w-[500px] h-[500px] bg-[#E50914]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[450px] h-[450px] bg-[#FF2B2B]/8 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* =========================================================================
            HEADER SECTION
           ========================================================================= */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-extrabold text-[#FF2B2B] bg-[#1a080a] border border-[#E50914]/30 px-4 py-1.5 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />
            <span>DONATE BLOOD</span>
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Current <span className="text-[#E50914]">Hospital Blood Needs</span>
          </h1>

          <p className="text-sm sm:text-base text-[#B0B0B8] leading-relaxed">
            Your donation can help someone in need. Find verified hospital blood requirements near you and voluntarily offer to save a life.
          </p>

          {/* User Location Match Capsule if authenticated */}
          {userDistrict && (
            <div className="pt-1 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              <span>Prioritizing requirements near your registered district: <strong>{userDistrict}</strong></span>
            </div>
          )}
        </div>

        {/* =========================================================================
            TWO-TAB NAVIGATOR (iOS Glass Material)
           ========================================================================= */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-lg">
            <button
              onClick={() => {
                setActiveTab('needs');
                setSearchParams({});
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'needs'
                  ? 'bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] text-white shadow-[0_0_20px_rgba(229,9,20,0.5)]'
                  : 'text-[#B0B0B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Hospital Blood Needs</span>
              {requirements.length > 0 && (
                <span className="ml-1 px-2 py-0.2 rounded-full bg-white/20 text-[11px]">
                  {requirements.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setSearchParams({ tab: 'register' });
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] text-white shadow-[0_0_20px_rgba(229,9,20,0.5)]'
                  : 'text-[#B0B0B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Become a Voluntary Donor</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: HOSPITAL BLOOD NEEDS
           ========================================================================= */}
        {activeTab === 'needs' && (
          <div className="space-y-8 animate-fadeIn">

            {/* Filter Bar (iOS Glass Material) */}
            <div className="glass-lvl2 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Filter className="w-4 h-4 text-[#FF2B2B]" />
                  <span>Filter Hospital Requirements</span>
                </div>

                {(selectedGroup !== 'All' || selectedDistrict !== 'All' || selectedUrgency !== 'All' || searchQuery) && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-[#FF2B2B] hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Blood Group (Strictly without Bombay Oh per Rule 7 & 40) */}
                <div>
                  <label className="block text-[11px] font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                    Blood Group
                  </label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full bg-[#141418] border border-white/15 focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer font-bold"
                  >
                    <option value="All">All Blood Groups</option>
                    {bloodGroups.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. District Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                    District (Tamil Nadu)
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-[#141418] border border-white/15 focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="All">All 38 Districts</option>
                    {TAMIL_NADU_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Urgency Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                    Urgency Level
                  </label>
                  <select
                    value={selectedUrgency}
                    onChange={(e) => setSelectedUrgency(e.target.value)}
                    className="w-full bg-[#141418] border border-white/15 focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="All">All Urgency Levels</option>
                    <option value="Emergency">🚨 Emergency Only</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>

                {/* 4. Search Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[#B0B0B8] uppercase tracking-wider mb-1.5">
                    Search Hospital / City
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Apollo, Karur, KMCH..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#141418] border border-white/15 focus:border-[#E50914] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex items-center justify-between text-xs text-[#B0B0B8] px-1">
              <span>
                Showing <strong className="text-white">{standardRequirements.length}</strong> verified hospital blood requirements
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Live Regional Feed • Updated just now
              </span>
            </div>

            {/* =========================================================================
                LOADING STATE
               ========================================================================= */}
            {loadingRequirements && (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                <BloodLoadingDrop />
                <p className="text-sm font-semibold tracking-wide text-[#B0B0B8]">
                  Finding current blood requirements...
                </p>
              </div>
            )}

            {/* =========================================================================
                ERROR STATE
               ========================================================================= */}
            {!loadingRequirements && errorRequirements && (
              <div className="glass-lvl2 border border-red-500/30 rounded-3xl p-8 text-center max-w-md mx-auto space-y-4">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <p className="text-sm font-semibold text-red-300">
                  {errorRequirements}
                </p>
                <button
                  onClick={loadRequirements}
                  className="px-6 py-2.5 rounded-xl bg-[#E50914] text-xs font-bold text-white shadow-md hover:bg-[#FF2B2B] transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* =========================================================================
                EMPTY STATE
               ========================================================================= */}
            {!loadingRequirements && !errorRequirements && standardRequirements.length === 0 && (
              <div className="glass-lvl2 border border-white/10 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 mx-auto">
                  <Building className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  No active blood requirements right now.
                </h3>
                <p className="text-xs text-[#B0B0B8] leading-relaxed">
                  Check again later or explore other nearby districts. You can also register as a voluntary donor to get notified when a nearby hospital needs your blood group.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white transition-all"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* =========================================================================
                HOSPITAL BLOOD NEED CARDS GRID
               ========================================================================= */}
            {!loadingRequirements && !errorRequirements && standardRequirements.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {standardRequirements.map((req) => {
                  const isEmergency = req.urgency === 'Emergency';
                  const isLocal = userDistrict && (req.district || '').toLowerCase() === userDistrict.toLowerCase();
                  const unitsRemaining = Math.max(0, (req.units_required || 1) - (req.units_confirmed || 0));

                  return (
                    <div
                      key={req.id || req.requirement_code}
                      className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                        isEmergency
                          ? 'glass-card-elevated border-2 border-[#E50914]/60 shadow-[0_0_35px_rgba(229,9,20,0.35)]'
                          : 'glass-card hover:border-white/25 shadow-lg'
                      }`}
                    >
                      {/* Top Edge Reflection */}
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                      <div className="space-y-4">
                        {/* Top Badges Row */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            isEmergency
                              ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.6)] animate-pulse'
                              : req.urgency === 'Urgent'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {isEmergency && <Flame className="w-3 h-3 fill-white" />}
                            <span>{isEmergency ? '🚨 Emergency' : req.urgency}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isLocal && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                Nearby
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/5">
                              {req.requirement_code}
                            </span>
                          </div>
                        </div>

                        {/* Hospital Title & Location */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified Hospital</span>
                          </div>
                          <h3 className="text-lg font-black text-white leading-snug line-clamp-2" title={req.hospital_name}>
                            {req.hospital_name}
                          </h3>
                          <p className="text-xs text-[#B0B0B8] flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-[#FF2B2B] flex-shrink-0" />
                            <span>{req.hospital_location || req.city}, {req.district}</span>
                          </p>
                        </div>

                        {/* Blood Requirement Key Metric Capsule */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                              Blood Required
                            </span>
                            <span className="text-2xl font-black text-[#FF2B2B]">
                              {req.blood_group}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                              Units Needed
                            </span>
                            <span className="text-xl font-bold text-white">
                              {unitsRemaining} <span className="text-xs font-normal text-zinc-400">Unit{unitsRemaining !== 1 ? 's' : ''}</span>
                            </span>
                          </div>
                        </div>

                        {/* Schedule & Timing Info */}
                        <div className="text-xs text-zinc-300 space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-sky-400" />
                              Required By:
                            </span>
                            <span className="font-mono font-semibold text-white">{req.required_date}</span>
                          </div>

                          {req.reason && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 pt-1 border-t border-white/5 italic">
                              "{req.reason}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-5 mt-4 border-t border-white/10 grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => setSelectedRequirementDetails(req)}
                          className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/15 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-300" />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => setSelectedRequirementForDonate(req)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] hover:shadow-[0_0_25px_rgba(229,9,20,0.8)] transition-all flex items-center justify-center gap-1.5 transform hover:-translate-y-0.5"
                        >
                          <Heart className="w-3.5 h-3.5 fill-white" />
                          <span>I Want to Donate</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* =========================================================================
            TAB 2: BECOME A VOLUNTARY DONOR (PRESERVED REGISTRATION FLOW)
           ========================================================================= */}
        {activeTab === 'register' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            {!submittedDonor ? (
              <div>
                {/* Eligibility Quick Info Banner */}
                <div className="glass-lvl2 border border-white/15 rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs text-[#B0B0B8] shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-[#1d0b0e] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] flex-shrink-0 relative overflow-hidden">
                    <ShieldCheck className="w-5 h-5 relative z-10" />
                    <BloodDonationInteractiveDrop />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-white">General Eligibility Criteria</p>
                    <p>
                      Age 18–65, weight &gt; 45kg, minimum 3 months since your last donation, and feeling healthy with no active infection.
                    </p>
                  </div>
                </div>

                {/* Registration Form Card */}
                <form onSubmit={handleDonorSubmit} className="glass-lvl2 border border-white/15 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

                  {serverError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-400 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                      <span className="leading-relaxed">{serverError}</span>
                    </div>
                  )}

                  {/* Personal Details */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">1</span>
                      Personal Details
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Sanjay Raj"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className={`w-full bg-[#161616] border ${
                            donorErrors.fullName ? 'border-red-500' : 'border-[#2d2d2d]'
                          } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                        />
                        {donorErrors.fullName && <p className="text-xs text-red-500 mt-1">{donorErrors.fullName}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. sanjay@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full bg-[#161616] border ${
                            donorErrors.email ? 'border-red-500' : 'border-[#2d2d2d]'
                          } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                        />
                        {donorErrors.email && <p className="text-xs text-red-500 mt-1">{donorErrors.email}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. +91 98421 87654"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className={`w-full bg-[#161616] border ${
                            donorErrors.phone ? 'border-red-500' : 'border-[#2d2d2d]'
                          } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                        />
                        {donorErrors.phone && <p className="text-xs text-red-500 mt-1">{donorErrors.phone}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          value={formData.dob}
                          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                          className={`w-full bg-[#161616] border ${
                            donorErrors.dob ? 'border-red-500' : 'border-[#2d2d2d]'
                          } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors`}
                        />
                        {donorErrors.dob && <p className="text-xs text-red-500 mt-1">{donorErrors.dob}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Gender *
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Blood Group *
                        </label>
                        <select
                          value={formData.bloodGroup}
                          onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                          className={`w-full bg-[#161616] border ${
                            donorErrors.bloodGroup ? 'border-red-500' : 'border-[#2d2d2d]'
                          } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white font-bold outline-none cursor-pointer`}
                        >
                          <option value="" disabled>Select Blood Group</option>
                          {bloodGroups.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                        {donorErrors.bloodGroup && <p className="text-xs text-red-500 mt-1">{donorErrors.bloodGroup}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Location & Availability */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-white/10 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#E50914] text-white text-xs flex items-center justify-center font-bold">2</span>
                      Location & Availability
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          State / Union Territory *
                        </label>
                        <select
                          value={selectedState}
                          onChange={(e) => handleStateChange(e.target.value)}
                          className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                        >
                          {getStates().map((s) => (
                            <option key={s.code} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          District / City *
                        </label>
                        <select
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                        >
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Area / Locality *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Gandhi Gramam, Thanthonimalai"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                          className={`w-full bg-[#161616] border ${
                            donorErrors.area ? 'border-red-500' : 'border-[#2d2d2d]'
                          } focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none transition-colors`}
                        />
                        {donorErrors.area && <p className="text-xs text-red-500 mt-1">{donorErrors.area}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                          Last Blood Donation Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={formData.lastDonationDate}
                          onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                          className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                        />
                      </div>

                      <div className="flex flex-col justify-center sm:col-span-2 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={formData.isAvailable}
                            onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                            className="w-5 h-5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-white">
                            Are you currently available to donate?
                          </span>
                        </label>
                        <span className="text-xs text-[#737373] ml-8 mt-1">
                          You can toggle your availability anytime from your donor dashboard.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Medical Eligibility Confirmation */}
                  <div className="p-4 rounded-2xl bg-[#161616] border border-white/5 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.medicalEligibility}
                        onChange={(e) => setFormData({ ...formData, medicalEligibility: e.target.checked })}
                        className="w-5 h-5 mt-0.5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer flex-shrink-0"
                      />
                      <div className="text-xs text-[#B0B0B0] leading-relaxed">
                        <strong className="text-white">Medical Eligibility Confirmation: </strong>
                        I confirm that I am in good general health, weigh over 45 kg, have had no major surgeries in the last 6 months, and agree to voluntary donation without compensation.
                      </div>
                    </label>
                    {donorErrors.medicalEligibility && (
                      <p className="text-xs text-red-500 pl-8">{donorErrors.medicalEligibility}</p>
                    )}
                    <p className="text-[11px] text-[#737373] italic pl-8">
                      * {MEDICAL_ELIGIBILITY_DISCLAIMER}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingDonor}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-base font-black text-white shadow-[0_0_30px_rgba(229,9,20,0.6)] hover:shadow-[0_0_45px_rgba(229,9,20,0.9)] transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmittingDonor ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>REGISTERING DONOR...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        <span>REGISTER AS DONOR</span>
                      </>
                    )}
                  </button>

                </form>
              </div>
            ) : (
              /* Success Screen */
              <div className="text-center py-16 bg-[#111111] border border-[#222222] rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(229,9,20,0.3)] animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-[#1e0a0d] border-2 border-[#E50914] text-[#FF2B2B] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(229,9,20,0.6)] animate-bounce">
                  <Heart className="w-10 h-10 fill-[#FF2B2B]" />
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                  Thank You for Becoming a Blood Bridge Donor ❤️
                </h2>

                <p className="text-base text-[#B0B0B0] max-w-lg mx-auto mb-8 leading-relaxed">
                  Your profile for <strong className="text-white">{formData.fullName}</strong> ({formData.bloodGroup}) in <strong className="text-white">{formData.city}</strong> has been successfully registered. You are now part of our life-saving emergency network!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto mb-10 text-left">
                  <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                    <span className="text-[11px] text-[#737373] block">Assigned Donor ID</span>
                    <span className="text-sm font-bold text-white font-mono">{createdDonorId}</span>
                  </div>
                  <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                    <span className="text-[11px] text-[#737373] block">Blood Group</span>
                    <span className="text-sm font-bold text-[#FF2B2B]">{formData.bloodGroup}</span>
                  </div>
                  <div className="bg-[#161616] p-4 rounded-xl border border-white/5">
                    <span className="text-[11px] text-[#737373] block">Status</span>
                    <span className="text-sm font-bold text-emerald-400">Active & Ready</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      setSubmittedDonor(false);
                      setActiveTab('needs');
                    }}
                    className="px-8 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white font-bold text-sm shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
                  >
                    View Hospital Blood Needs Now
                  </button>
                  <Link
                    to="/donor-dashboard"
                    className="px-6 py-3.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] border border-white/20 text-white font-semibold text-sm transition-all"
                  >
                    Go to Donor Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* =========================================================================
          MODALS
         ========================================================================= */}
      {/* 1. Requirement Complete Details Modal */}
      <HospitalRequirementModal
        isOpen={Boolean(selectedRequirementDetails)}
        requirement={selectedRequirementDetails}
        onClose={() => setSelectedRequirementDetails(null)}
        onDonateClick={(req) => {
          setSelectedRequirementDetails(null);
          setSelectedRequirementForDonate(req);
        }}
      />

      {/* 2. "I Want to Donate" Eligibility Check & Response Confirmation Modal */}
      <DonateResponseModal
        isOpen={Boolean(selectedRequirementForDonate)}
        requirement={selectedRequirementForDonate}
        onClose={() => setSelectedRequirementForDonate(null)}
        onSuccess={() => {
          // Refresh list to update any units/status
          loadRequirements();
        }}
      />

    </div>
  );
}
