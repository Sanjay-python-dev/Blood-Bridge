import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  ToggleLeft,
  ToggleRight,
  History,
  Bell,
  Settings,
  LogOut,
  Droplet,
  Calendar,
  Heart,
  Activity,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Building,
  Loader2,
  XCircle,
  FileText,
  Lock,
  Phone,
  Check,
  X,
  Plus,
  Search,
} from 'lucide-react';
import { useAuth, USER_ROLES } from '../context/AuthContext';
import {
  getStoredDirectDonationRequests,
  updateDonationRequestStatus,
  getOpenBloodRequests,
  getUserBloodRequests,
  updateBloodRequestStatus,
  REQUEST_STATUS,
} from '../services/requestService';
import { updateDonorLastDonationDate } from '../services/donorService';
import { getDonorEligibility, MEDICAL_ELIGIBILITY_DISCLAIMER } from '../services/eligibilityService';
import { isBloodCompatible } from '../services/compatibilityService';
import {
  getStoredNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';
import { showToast } from '../components/Toast';
import { TAMIL_NADU_DISTRICTS } from '../data/locationData';

export default function DonorDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { user, profile, donorRecord, role, signOut, updateDonorAvailability, refreshProfile, completeUserProfile } = useAuth();

  // Role detection
  const isSeeker = role === 'seeker' || profile?.role === 'seeker' || profile?.user_type === 'seeker' || profile?.user_type === 'requester';

  const defaultTab = searchParams.get('tab') === 'requests'
    ? (isSeeker ? 'My Blood Requests' : 'Donation Requests')
    : 'Dashboard';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [directRequests, setDirectRequests] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pledgedRequests, setPledgedRequests] = useState({});
  const [editingLastDate, setEditingLastDate] = useState(false);
  const [newLastDate, setNewLastDate] = useState('');

  // Complete Profile Modal State (Requirement 14 for existing user compatibility)
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    bloodGroup: '',
    district: '',
    city: '',
    hasDonatedBefore: false,
    lastDonationDate: '',
    donationCount: '',
    isAvailableForDonation: true,
  });
  const [profileModalError, setProfileModalError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Consent settings state
  const [consentSettings, setConsentSettings] = useState({
    shareWithHospitals: true,
    emergencyContactConsent: true,
    allowEmergencyPush: true,
  });

  const displayName = profile?.full_name || donorRecord?.full_name || user?.email?.split('@')[0] || 'Member';
  const displayBlood = profile?.blood_group || donorRecord?.blood_group || 'Not selected';
  const displayDistrict = profile?.district || donorRecord?.district || '';
  const displayCity = profile?.city || donorRecord?.city || displayDistrict || 'Not selected';
  const displayLocation = displayDistrict
    ? `${displayDistrict}, ${profile?.state || donorRecord?.state || 'Tamil Nadu'}`
    : (displayCity !== 'Not selected' ? `${displayCity}, Tamil Nadu` : 'Not selected');
  const lastDonationDate = profile?.last_donation_date || donorRecord?.last_donation_date || null;
  const isProfileIncomplete = !profile?.blood_group || !profile?.district;

  const eligibility = lastDonationDate ? getDonorEligibility({
    lastDonationDate,
    gender: donorRecord?.gender || 'Male',
  }) : {
    isEligible: true,
    statusText: 'Clinical Check Required',
    statusBadge: 'Ready to Evaluate',
    disclaimer: 'No prior blood donation date recorded. BloodBridge does not determine medical eligibility.',
  };

  // Sync availability with database profile/donorRecord
  useEffect(() => {
    if (profile?.is_available_for_donation !== undefined && profile?.is_available_for_donation !== null) {
      setIsAvailable(Boolean(profile.is_available_for_donation));
    } else if (donorRecord) {
      setIsAvailable(Boolean(donorRecord.available));
    }
  }, [donorRecord, profile]);

  // Load dashboard data
  const loadData = useCallback(async () => {
    setLoadingRequests(true);
    try {
      setDirectRequests(getStoredDirectDonationRequests());
      setNotifications(getStoredNotifications());

      // 1. Fetch live open requests
      const openReqs = await getOpenBloodRequests();
      setEmergencyRequests(openReqs || []);

      // 2. Fetch user's own requests if logged in
      if (user?.id) {
        const myReqs = await getUserBloodRequests(user.id);
        setUserRequests(myReqs || []);
      }
    } catch (e) {
      console.warn('Dashboard data loading note:', e);
    } finally {
      setLoadingRequests(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle availability in database
  const handleToggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    if (updateDonorAvailability) {
      await updateDonorAvailability(next);
    }
    showToast(next ? 'Availability Status: ACTIVE (Ready to Donate)' : 'Availability Status: PAUSED', 'info');
  };

  const handlePauseAvailability = async () => {
    const nextPause = !isPaused;
    setIsPaused(nextPause);
    const nextAvail = !nextPause;
    setIsAvailable(nextAvail);
    if (updateDonorAvailability) {
      await updateDonorAvailability(nextAvail);
    }
    showToast(nextPause ? 'Temporary Availability Pause Activated.' : 'Availability Resumed.', 'info');
  };

  const handleSaveLastDonationDate = async () => {
    if (!newLastDate) return;
    try {
      if (user?.id) {
        await updateDonorLastDonationDate(user.id, newLastDate);
      }
      if (refreshProfile) {
        await refreshProfile();
      }
      setEditingLastDate(false);
      showToast('Last donation date updated successfully.', 'success');
    } catch (e) {
      showToast('Could not update donation date.', 'error');
    }
  };

  const handleRequestAction = (reqId, newStatus) => {
    updateDonationRequestStatus(reqId, newStatus);
    setDirectRequests(getStoredDirectDonationRequests());
    if (newStatus === REQUEST_STATUS.ACCEPTED || newStatus === 'Fulfilled') {
      showToast('You ACCEPTED this donation request. Emergency contact details unlocked.', 'success');
    } else {
      showToast('You DECLINED this request. BloodBridge will route to another donor.', 'info');
    }
  };

  // Seeker: update status of own blood request
  const handleUserRequestStatus = async (reqId, newStatus) => {
    try {
      await updateBloodRequestStatus(reqId, newStatus);
      await loadData();
      showToast(`Blood request status updated to: ${newStatus}`, 'success');
    } catch (e) {
      showToast('Could not update request status.', 'error');
    }
  };

  const handlePledge = (reqId) => {
    setPledgedRequests((prev) => ({
      ...prev,
      [reqId]: !prev[reqId],
    }));
    showToast('Emergency pledge submitted to hospital triage.', 'success');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter regional emergency requests compatible with donor
  const compatibleEmergencyRequests = emergencyRequests.filter((req) => {
    if (isSeeker) return true;
    return isBloodCompatible(displayBlood, req.bloodGroup);
  });

  // Sidebar navigation menu
  const menuItems = isSeeker
    ? [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'My Blood Requests', icon: Heart, badge: userRequests.filter((r) => r.status === 'Open').length || null },
        { name: 'My Profile', icon: User },
        { name: 'Notifications', icon: Bell, badge: unreadCount || null },
        { name: 'Settings', icon: Settings },
      ]
    : [
        { name: 'Dashboard', icon: LayoutDashboard },
        { name: 'My Profile', icon: User },
        { name: 'Availability', icon: isAvailable ? ToggleRight : ToggleLeft },
        { name: 'Donation Requests', icon: Heart, badge: directRequests.filter((r) => r.status === REQUEST_STATUS.PENDING || r.status === 'Open').length || null },
        { name: 'My Blood Requests', icon: FileText, badge: userRequests.filter((r) => r.status === 'Open').length || null },
        { name: 'Donation History', icon: History },
        { name: 'Notifications', icon: Bell, badge: unreadCount || null },
        { name: 'Settings', icon: Settings },
      ];

  const donationHistoryList = [
    { date: 'May 01, 2026', place: 'Govt Medical College Hospital, Karur', units: '1 Unit', type: 'Whole Blood' },
    { date: 'January 20, 2026', place: 'Apollo Speciality Hospital, Karur', units: '1 Unit', type: 'Whole Blood' },
    { date: 'September 15, 2025', place: 'Rotary Blood Bank, Coimbatore', units: '1 Unit', type: 'Platelets' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0a0a0a] border-r border-[#1e1e1e] p-5 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          {/* User Info Capsule */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#141414] border border-[#222222]">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-bold text-white shadow-[0_0_12px_rgba(229,9,20,0.5)] flex-shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-white truncate">{displayName}</h4>
              <p className="text-[11px] text-[#B0B0B0] flex items-center gap-1 font-mono">
                <span className="text-[#FF2B2B] font-bold">{displayBlood}</span> • {displayCity}
              </p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                {isSeeker ? 'Blood Seeker' : 'Active Donor'}
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#1a080a] text-white border border-[#E50914]/40 shadow-[0_0_15px_rgba(229,9,20,0.2)]'
                      : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF2B2B]' : 'text-[#737373]'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="w-4 h-4 rounded-full bg-[#E50914] text-white text-[10px] flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="pt-6 border-t border-white/5 mt-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#737373] hover:text-[#FF2B2B] hover:bg-[#18080a] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl overflow-x-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-[#1c1c1c]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#180a0c] border border-[#E50914]/30 text-xs font-semibold text-[#FF2B2B] mb-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
              <span>{isSeeker ? 'Blood Seeker Portal • Active Desk' : 'Donor Portal • Live Database Status'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Welcome Back, {displayName.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-[#B0B0B0] mt-1">
              {isSeeker
                ? `Manage your active blood tickets and find verified compatible donors in ${displayCity}.`
                : `Your commitment keeps hope alive for patients across ${displayCity} and Tamil Nadu.`}
            </p>
          </div>

          {/* Quick Availability Toggle (For Donors) or Quick Request Button (For Seekers) */}
          {!isSeeker ? (
            <div className="bg-[#111111] border border-[#222222] p-4 rounded-2xl flex items-center gap-4 shadow-lg">
              <div>
                <span className="text-xs text-[#737373] block uppercase tracking-wider font-mono">
                  Available to Donate
                </span>
                <span className={`text-sm font-bold ${isAvailable ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {isAvailable ? '🟢 ACTIVE (ON)' : '⚪ PAUSED (OFF)'}
                </span>
              </div>
              <button
                onClick={handleToggleAvailability}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${
                  isAvailable ? 'bg-[#E50914]' : 'bg-[#2a2a2a]'
                }`}
                aria-label="Toggle availability"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    isAvailable ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ) : (
            <Link
              to="/request-blood"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-black text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>POST NEW REQUEST</span>
            </Link>
          )}
        </div>

        {/* Existing User Incomplete Profile Banner (Requirement 14) */}
        {isProfileIncomplete && (
          <div id="incomplete-profile-banner" className="my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#220a0d] to-[#141414] border border-[#E50914]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_30px_rgba(229,9,20,0.25)] animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Complete your BloodBridge profile</h4>
                <p className="text-xs text-[#B0B0B0] mt-0.5">
                  Complete your BloodBridge profile to help us provide accurate blood matching.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="complete-profile-btn"
              onClick={() => {
                setProfileFormData({
                  bloodGroup: profile?.blood_group || '',
                  district: profile?.district || '',
                  city: profile?.city || '',
                  hasDonatedBefore: Boolean(profile?.has_donated_before),
                  lastDonationDate: profile?.last_donation_date || '',
                  donationCount: profile?.donation_count || '',
                  isAvailableForDonation: profile?.is_available_for_donation ?? true,
                });
                setProfileModalError('');
                setShowCompleteProfileModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto transform hover:-translate-y-0.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Complete Profile</span>
            </button>
          </div>
        )}

        {/* ====================================================
            TAB 1: MAIN DASHBOARD OVERVIEW
            ==================================================== */}
        {activeTab === 'Dashboard' && (
          <div className="space-y-8 mt-8">
            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/find-blood"
                className="p-3.5 rounded-2xl bg-[#111111] hover:bg-[#161616] border border-white/5 hover:border-[#E50914]/50 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                <Search className="w-5 h-5 text-[#FF2B2B]" />
                <span className="text-xs font-bold text-white">Find Donors</span>
              </Link>

              {!isSeeker ? (
                <button
                  onClick={() => setActiveTab('Availability')}
                  className="p-3.5 rounded-2xl bg-[#111111] hover:bg-[#161616] border border-white/5 hover:border-[#E50914]/50 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-sm"
                >
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Update Availability</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('My Blood Requests')}
                  className="p-3.5 rounded-2xl bg-[#111111] hover:bg-[#161616] border border-white/5 hover:border-[#E50914]/50 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-bold text-white">My Requests ({userRequests.length})</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab(isSeeker ? 'My Blood Requests' : 'Donation Requests')}
                className="p-3.5 rounded-2xl bg-[#111111] hover:bg-[#161616] border border-white/5 hover:border-[#E50914]/50 transition-all text-center flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                <Heart className="w-5 h-5 text-[#FF2B2B]" />
                <span className="text-xs font-bold text-white">
                  {isSeeker ? `Active (${userRequests.filter((r) => r.status === 'Open').length})` : `Requests (${directRequests.length})`}
                </span>
              </button>

              <Link
                to="/request-blood"
                className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-center flex flex-col items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all transform hover:-translate-y-0.5"
              >
                <Send className="w-5 h-5 text-white" />
                <span className="text-xs font-black text-white">Emergency Request</span>
              </Link>
            </div>

            {/* 4 Overview Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1 */}
              <div className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/60 rounded-2xl p-5 transition-all shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider">
                    {isSeeker ? 'Total Requests Placed' : 'Blood Group'}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B]">
                    <Droplet className="w-4 h-4 fill-current" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white">
                  {isSeeker ? userRequests.length : displayBlood}
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">
                  {isSeeker
                    ? `${userRequests.filter((r) => r.status === 'Open').length} Currently Open`
                    : (displayBlood === 'Not selected' ? 'Blood Group Not Set' : 'Verified Clinical Profile')}
                </span>
              </div>

              {/* Card 2 */}
              <div className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/60 rounded-2xl p-5 transition-all shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider">
                    {isSeeker ? 'Units Requested' : 'Eligibility Status'}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B]">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-black text-emerald-400 leading-snug">
                  {isSeeker
                    ? `${userRequests.reduce((acc, r) => acc + (parseInt(r.units) || 1), 0)} Units Total`
                    : eligibility.statusText}
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">
                  {isSeeker ? 'Live Hospital Requirements' : (lastDonationDate ? `Last: ${lastDonationDate}` : 'No previous donation on record')}
                </span>
              </div>

              {/* Card 3 */}
              <div className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/60 rounded-2xl p-5 transition-all shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider">
                    {isSeeker ? 'Fulfilled Requests' : 'Current Availability'}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl font-black ${isSeeker ? 'text-emerald-400' : (isAvailable ? 'text-emerald-400' : 'text-zinc-500')}`}>
                  {isSeeker
                    ? userRequests.filter((r) => r.status === 'Fulfilled').length
                    : (isAvailable ? 'Available' : 'Paused')}
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">
                  {isSeeker ? 'Lives Helped by Donors' : (isAvailable ? 'Live in Emergency Match Queue' : 'Donation Availability Inactive')}
                </span>
              </div>

              {/* Card 4 */}
              <div className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/60 rounded-2xl p-5 transition-all shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#B0B0B0] uppercase tracking-wider">
                    {isSeeker ? 'Primary Location' : 'Registered Location'}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B]">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-white truncate">
                  {displayLocation}
                </div>
                <span className="text-[11px] text-[#737373] mt-1 block">
                  {profile?.has_donated_before
                    ? `Previously Donated • ${profile?.donation_count || '1'} times`
                    : (profile?.has_donated_before === false ? 'First-time Potential Donor' : 'Profile Status')}
                </span>
              </div>
            </div>

            {/* Grid: Pending Direct Requests & Regional Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Col 1 & 2 */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Heart className="w-4 h-4 text-[#FF2B2B]" />
                      <span>{isSeeker ? 'My Active Blood Requests' : 'Pending Donation Requests For You'}</span>
                    </h3>
                    <p className="text-xs text-[#B0B0B0]">
                      {isSeeker
                        ? 'Your live requests broadcast across active donors'
                        : 'Direct connection requests sent by patients and verified hospitals'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab(isSeeker ? 'My Blood Requests' : 'Donation Requests')}
                    className="text-xs font-bold text-[#FF2B2B] hover:underline"
                  >
                    View All ({isSeeker ? userRequests.length : directRequests.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {isSeeker ? (
                    userRequests.length > 0 ? (
                      userRequests.slice(0, 3).map((req) => (
                        <div
                          key={req.id}
                          className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/50 rounded-2xl p-5 transition-all shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-black text-white text-lg flex-shrink-0">
                                {req.bloodGroup}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-white">{req.patientName || req.patient}</h4>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    req.status === 'Fulfilled'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                      : req.status === 'Cancelled'
                                      ? 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/40'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                                  }`}>
                                    {req.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#B0B0B0] mt-1">
                                  <Building className="w-3.5 h-3.5 text-[#E50914]" />
                                  <span>{req.hospitalName || req.hospital}</span>
                                  <span>•</span>
                                  <span>{req.city}</span>
                                  <span>•</span>
                                  <span className="font-bold text-white">{req.units} Units</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link
                                to={`/find-blood?group=${req.bloodGroup}&city=${req.city}`}
                                className="px-3 py-1.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <Search className="w-3 h-3 text-[#FF2B2B]" />
                                <span>Find Donors</span>
                              </Link>
                              {req.status === 'Open' && (
                                <button
                                  onClick={() => handleUserRequestStatus(req.id, 'Fulfilled')}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Fulfilled</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-[#111111] border border-white/5 rounded-2xl text-xs text-[#737373]">
                        You haven't submitted any blood requests yet.{' '}
                        <Link to="/request-blood" className="text-[#FF2B2B] underline font-bold">
                          Create one now
                        </Link>
                      </div>
                    )
                  ) : directRequests.filter((r) => r.status === REQUEST_STATUS.PENDING || r.status === 'Open').length > 0 ? (
                    directRequests
                      .filter((r) => r.status === REQUEST_STATUS.PENDING || r.status === 'Open')
                      .map((req) => (
                        <div
                          key={req.id}
                          className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/50 rounded-2xl p-5 transition-all shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-black text-white text-lg flex-shrink-0">
                                {req.donorBloodGroup || displayBlood}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-white">{req.patientName}</h4>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                                    {req.urgency}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#B0B0B0] mt-1">
                                  <Building className="w-3.5 h-3.5 text-[#E50914]" />
                                  <span>{req.hospital}</span>
                                  <span>•</span>
                                  <span>{req.city}</span>
                                </div>
                                {req.note && (
                                  <p className="text-[11px] text-[#737373] mt-1 italic">"{req.note}"</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleRequestAction(req.id, REQUEST_STATUS.ACCEPTED)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleRequestAction(req.id, REQUEST_STATUS.DECLINED)}
                                className="px-3 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-[#B0B0B0] hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-8 text-center bg-[#111111] border border-white/5 rounded-2xl text-xs text-[#737373]">
                      No pending direct connection requests. You are all caught up!
                    </div>
                  )}
                </div>

                {/* Regional Emergency Tickets (Compatible) */}
                <div className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
                      <span>Compatible Emergency Requests ({displayCity})</span>
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {compatibleEmergencyRequests.slice(0, 3).map((req) => {
                      const isPledged = pledgedRequests[req.id];
                      return (
                        <div
                          key={req.id}
                          className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/50 rounded-2xl p-4 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 rounded-lg bg-[#1e0a0d] border border-[#E50914]/40 text-[#FF2B2B] font-black text-sm">
                                {req.bloodGroup}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white">
                                  {req.patient || req.patientName} ({req.units} Units)
                                </h5>
                                <span className="text-[11px] text-[#737373]">
                                  {req.hospital || req.hospitalName} • {req.city}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handlePledge(req.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                isPledged
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#E50914] hover:bg-[#FF2B2B] text-white'
                              }`}
                            >
                              {isPledged ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                              <span>{isPledged ? 'Pledged' : 'Pledge'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Col 3: Past History & Milestones */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#FF2B2B]" />
                  <span>Donation Milestones</span>
                </h3>

                <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 space-y-4">
                  {donationHistoryList.map((item, idx) => (
                    <div key={idx} className="pb-3 border-b border-white/5 last:border-none last:pb-0">
                      <div className="flex items-center justify-between text-xs text-[#737373] mb-1">
                        <span className="font-mono">{item.date}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-white font-semibold text-[10px]">
                          {item.units}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-white leading-tight">{item.place}</h5>
                      <span className="text-[11px] text-[#B0B0B0] mt-0.5 block">{item.type}</span>
                    </div>
                  ))}
                </div>

                {/* Lifesaver Badge */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1c080b] to-[#111111] border border-[#E50914]/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E50914] text-white flex items-center justify-center font-black">
                    ★
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Verified Voluntary Lifesaver</h5>
                    <p className="text-[11px] text-[#B0B0B0]">Registered in BloodBridge Network</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: MY BLOOD REQUESTS (Seeker / Requester Management)
            ==================================================== */}
        {activeTab === 'My Blood Requests' && (
          <div className="space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">My Blood Requests</h3>
                <p className="text-sm text-[#B0B0B0] mt-1">
                  Track, update, or cancel blood requests you have posted.
                </p>
              </div>
              <Link
                to="/request-blood"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-bold text-white shadow-md flex items-center gap-2 self-start"
              >
                <Plus className="w-4 h-4" />
                <span>New Blood Request</span>
              </Link>
            </div>

            <div className="space-y-4">
              {userRequests.length > 0 ? (
                userRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/50 rounded-3xl p-6 transition-all shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                          {req.bloodGroup}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-lg font-bold text-white">{req.patientName || req.patient}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              req.status === 'Fulfilled'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : req.status === 'Cancelled'
                                ? 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/40'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}>
                              {req.status}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {req.emergencyLevel || 'Critical'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#B0B0B0] mt-1">
                            <Building className="w-3.5 h-3.5 text-[#E50914]" />
                            <span>{req.hospitalName || req.hospital}</span>
                            <span>•</span>
                            <span>{req.city}</span>
                            <span>•</span>
                            <span className="font-bold text-white">{req.units} Units Required</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/find-blood?group=${req.bloodGroup}&city=${req.city}`}
                          className="px-4 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5 text-[#FF2B2B]" />
                          <span>Search Matching Donors</span>
                        </Link>
                        {req.status === 'Open' && (
                          <>
                            <button
                              onClick={() => handleUserRequestStatus(req.id, 'Fulfilled')}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Fulfilled</span>
                            </button>
                            <button
                              onClick={() => handleUserRequestStatus(req.id, 'Cancelled')}
                              className="px-3.5 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-red-400 border border-red-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {req.additionalMessage && (
                      <p className="text-xs text-[#B0B0B0] mt-3 italic">
                        Note: "{req.additionalMessage}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center bg-[#111111] border border-white/5 rounded-3xl text-sm text-[#737373]">
                  You have not submitted any blood requests yet.{' '}
                  <Link to="/request-blood" className="text-[#FF2B2B] underline font-bold ml-1">
                    Submit your first request
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 2: DONATION REQUESTS (Accept / Decline Workflow)
            ==================================================== */}
        {activeTab === 'Donation Requests' && (
          <div className="space-y-6 mt-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Direct Donation Requests</h3>
              <p className="text-sm text-[#B0B0B0] mt-1">
                Patients and hospitals requesting direct blood donation connections with you.
              </p>
            </div>

            <div className="space-y-4">
              {directRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#111111] border border-[#222222] hover:border-[#E50914]/50 rounded-3xl p-6 transition-all shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center text-white font-black text-xl flex-shrink-0">
                        {req.donorBloodGroup || displayBlood}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-lg font-bold text-white">{req.patientName}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                            {req.urgency}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#B0B0B0] mt-1">
                          <Building className="w-3.5 h-3.5 text-[#E50914]" />
                          <span>{req.hospital}</span>
                          <span>•</span>
                          <span>{req.city}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        req.status === REQUEST_STATUS.ACCEPTED || req.status === 'Fulfilled'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : req.status === REQUEST_STATUS.DECLINED || req.status === 'Cancelled'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-[#B0B0B0] space-y-1">
                      {req.note && <p className="italic">Note: "{req.note}"</p>}
                      {(req.status === REQUEST_STATUS.ACCEPTED || req.status === 'Fulfilled') && req.requesterPhone && (
                        <p className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>Callback Contact: {req.requesterPhone}</span>
                        </p>
                      )}
                    </div>

                    {(req.status === REQUEST_STATUS.PENDING || req.status === 'Open') ? (
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleRequestAction(req.id, REQUEST_STATUS.ACCEPTED)}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, REQUEST_STATUS.DECLINED)}
                          className="px-4 py-2.5 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-[#B0B0B0] hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#737373] italic">
                        Action completed on {new Date().toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 3: AVAILABILITY SETTINGS
            ==================================================== */}
        {activeTab === 'Availability' && (
          <div className="space-y-6 mt-8 max-w-2xl">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Availability Management</h3>
              <p className="text-sm text-[#B0B0B0] mt-1">
                Control your visibility in the voluntary blood donor match catalog.
              </p>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                  <h4 className="text-base font-bold text-white">Active Donor Registry</h4>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">Show your profile in search results for Karur & Tamil Nadu.</p>
                </div>
                <button
                  onClick={handleToggleAvailability}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                    isAvailable ? 'bg-[#E50914]' : 'bg-[#2a2a2a]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      isAvailable ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pb-6 border-b border-white/5">
                <div>
                  <h4 className="text-base font-bold text-white">Temporary Pause</h4>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">Temporarily pause alerts while traveling, recuperating, or unavailable.</p>
                </div>
                <button
                  onClick={handlePauseAvailability}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isPaused ? 'bg-amber-600 text-white' : 'bg-[#1c1c1c] text-[#B0B0B0] border border-white/10'
                  }`}
                >
                  {isPaused ? 'Paused (Resume)' : 'Pause Now'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#170a0c] border border-[#E50914]/30 text-xs text-[#B0B0B0]">
                <strong className="text-white block mb-1">Cooling Period Guideline:</strong>
                Minimum 90 days required between whole blood donations according to clinical guidelines.
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 4: MY PROFILE
            ==================================================== */}
        {activeTab === 'My Profile' && (
          <div className="space-y-6 mt-8 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">User Profile</h3>
                <p className="text-sm text-[#B0B0B0] mt-1">Review your registered details and donation information.</p>
              </div>
              <button
                type="button"
                id="edit-profile-tab-button"
                onClick={() => {
                  setProfileFormData({
                    bloodGroup: profile?.blood_group || '',
                    district: profile?.district || '',
                    city: profile?.city || '',
                    hasDonatedBefore: Boolean(profile?.has_donated_before),
                    lastDonationDate: profile?.last_donation_date || '',
                    donationCount: profile?.donation_count || '',
                    isAvailableForDonation: profile?.is_available_for_donation ?? true,
                  });
                  setProfileModalError('');
                  setShowCompleteProfileModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#1e0a0d] border border-[#E50914]/50 hover:bg-[#E50914] text-xs font-bold text-white transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isProfileIncomplete ? 'Complete Profile' : 'Edit Profile Details'}</span>
              </button>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#737373] uppercase block font-bold">Full Name</span>
                  <span className="text-sm font-bold text-white mt-1 block">{displayName}</span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] uppercase block font-bold">Account Role</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block uppercase">
                    {isSeeker ? 'Blood Seeker' : 'Blood Donor'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] uppercase block font-bold">Blood Group</span>
                  <span className="text-sm font-black text-[#FF2B2B] mt-1 block">{displayBlood}</span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] uppercase block font-bold">Primary Location</span>
                  <span className="text-sm font-bold text-white mt-1 block">{displayLocation}</span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] uppercase block font-bold">Email Address</span>
                  <span className="text-sm font-medium text-white mt-1 block truncate">{user?.email || profile?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-[#737373] uppercase block font-bold">Phone Number</span>
                  <span className="text-sm font-medium text-white mt-1 block">{profile?.phone || donorRecord?.phone || '+91 98421 •••••'}</span>
                </div>
              </div>

              {!isSeeker && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#737373] uppercase block font-bold">Last Donation Date</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">{lastDonationDate || 'Not recorded'}</span>
                    </div>
                    <button
                      onClick={() => setEditingLastDate(!editingLastDate)}
                      className="text-xs font-bold text-[#FF2B2B] hover:underline"
                    >
                      {editingLastDate ? 'Cancel' : 'Update Date'}
                    </button>
                  </div>

                  {editingLastDate && (
                    <div className="p-3.5 rounded-xl bg-[#161616] border border-[#2d2d2d] flex items-center gap-3">
                      <input
                        type="date"
                        value={newLastDate}
                        onChange={(e) => setNewLastDate(e.target.value)}
                        className="bg-[#111111] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                      <button
                        onClick={handleSaveLastDonationDate}
                        className="px-4 py-1.5 rounded-lg bg-[#E50914] text-white text-xs font-bold hover:bg-[#FF2B2B]"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#161616] border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-semibold">Clinical Eligibility Status:</span>
                      <span className="text-emerald-400 font-bold">{eligibility.statusText}</span>
                    </div>
                    <p className="text-[#737373] mt-2 italic">{eligibility.disclaimer}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 5: NOTIFICATIONS
            ==================================================== */}
        {activeTab === 'Notifications' && (
          <div className="space-y-6 mt-8 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Notification History</h3>
                <p className="text-sm text-[#B0B0B0] mt-1">Real-time alerts, hospital requests, and connection updates.</p>
              </div>
              <button
                onClick={() => {
                  markAllNotificationsAsRead();
                  setNotifications(getStoredNotifications());
                  showToast('All notifications marked as read', 'info');
                }}
                className="text-xs font-bold text-[#FF2B2B] hover:underline"
              >
                Mark all read
              </button>
            </div>

            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    n.read ? 'bg-[#121212] border-white/5 opacity-85' : 'bg-[#1a0a0c] border-[#E50914]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-white">{n.title}</h5>
                      <p className="text-xs text-[#B0B0B0] mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-[#737373] mt-2 block font-mono">
                        {new Date(n.timestamp).toLocaleDateString()} at {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 6: SETTINGS (Consent & Privacy)
            ==================================================== */}
        {activeTab === 'Settings' && (
          <div className="space-y-6 mt-8 max-w-2xl">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Privacy & Consent Settings</h3>
              <p className="text-sm text-[#B0B0B0] mt-1">Configure clinical data sharing and alert permissions.</p>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 space-y-6">
              <label className="flex items-start justify-between gap-4 cursor-pointer">
                <div>
                  <h4 className="text-sm font-bold text-white">Share Contact with Authorized Hospitals</h4>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">
                    Permit verified clinical hospitals to contact you directly during critical trauma bypass cases.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consentSettings.shareWithHospitals}
                  onChange={(e) => {
                    const updated = { ...consentSettings, shareWithHospitals: e.target.checked };
                    setConsentSettings(updated);
                    showToast('Privacy consent settings saved', 'success');
                  }}
                  className="w-5 h-5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer mt-0.5"
                />
              </label>

              <label className="flex items-start justify-between gap-4 cursor-pointer pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">Emergency Blood Alert Notifications</h4>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">
                    Receive urgent SMS and in-app alerts when a matching patient needs blood within your district.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consentSettings.allowEmergencyPush}
                  onChange={(e) => {
                    const updated = { ...consentSettings, allowEmergencyPush: e.target.checked };
                    setConsentSettings(updated);
                    showToast('Emergency alert preferences updated', 'success');
                  }}
                  className="w-5 h-5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer mt-0.5"
                />
              </label>
            </div>
          </div>
        )}
      </main>

      {/* Complete Profile Modal (Requirement 14 for existing user compatibility) */}
      {showCompleteProfileModal && (
        <div
          id="complete-profile-modal-overlay"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] relative animate-fadeIn my-8 overflow-hidden">
            {/* Top edge glass reflection highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Complete Your Profile</h3>
                  <p className="text-xs text-[#B0B0B0]">Provide accurate details for medical compatibility matching</p>
                </div>
              </div>
              <button
                type="button"
                id="close-complete-profile-modal"
                onClick={() => setShowCompleteProfileModal(false)}
                className="text-[#737373] hover:text-white p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileModalError && (
              <div id="profile-modal-error" className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileModalError}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileModalError('');

                if (!profileFormData.bloodGroup) {
                  setProfileModalError('Please select your blood group.');
                  return;
                }
                if (!profileFormData.district) {
                  setProfileModalError('Please select your district.');
                  return;
                }
                if (profileFormData.hasDonatedBefore) {
                  if (!profileFormData.lastDonationDate) {
                    setProfileModalError('Please enter your last blood donation date.');
                    return;
                  }
                  const today = new Date().toISOString().split('T')[0];
                  if (profileFormData.lastDonationDate > today) {
                    setProfileModalError('Last donation date cannot be in the future.');
                    return;
                  }
                }

                setIsSavingProfile(true);
                try {
                  if (completeUserProfile) {
                    await completeUserProfile({
                      bloodGroup: profileFormData.bloodGroup,
                      district: profileFormData.district,
                      city: profileFormData.city?.trim() || profileFormData.district,
                      state: 'Tamil Nadu',
                      hasDonatedBefore: profileFormData.hasDonatedBefore,
                      lastDonationDate: profileFormData.hasDonatedBefore ? profileFormData.lastDonationDate : null,
                      donationCount: profileFormData.hasDonatedBefore ? profileFormData.donationCount : null,
                      isAvailableForDonation: profileFormData.isAvailableForDonation,
                    });
                  }
                  showToast('Profile updated successfully!', 'success');
                  setShowCompleteProfileModal(false);
                } catch (err) {
                  setProfileModalError(err.message || 'Could not update profile. Please try again.');
                } finally {
                  setIsSavingProfile(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {/* Blood Group */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                  Blood Group *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <button
                      type="button"
                      key={bg}
                      id={`modal-blood-${bg.replace('+', 'pos').replace('-', 'neg')}`}
                      onClick={() => setProfileFormData({ ...profileFormData, bloodGroup: bg })}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                        profileFormData.bloodGroup === bg
                          ? 'bg-[#1e0a0d] border-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.5)]'
                          : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0] hover:border-white/20'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              {/* District */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  District (Tamil Nadu) *
                </label>
                <select
                  id="modal-district-select"
                  value={profileFormData.district}
                  onChange={(e) => setProfileFormData({ ...profileFormData, district: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2e2e2e] focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-white outline-none"
                >
                  <option value="" disabled>Select your district</option>
                  {TAMIL_NADU_DISTRICTS.map((d) => (
                    <option key={d} value={d} className="bg-[#111]">{d}</option>
                  ))}
                </select>
              </div>

              {/* City / Taluk */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  City / Taluk (Optional)
                </label>
                <input
                  type="text"
                  id="modal-city-input"
                  placeholder="e.g. Kulithalai"
                  value={profileFormData.city}
                  onChange={(e) => setProfileFormData({ ...profileFormData, city: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2e2e2e] focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-white placeholder-[#555] outline-none"
                />
              </div>

              {/* Have you donated before? */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Have you donated blood before? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="modal-donated-yes"
                    onClick={() => setProfileFormData({ ...profileFormData, hasDonatedBefore: true })}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      profileFormData.hasDonatedBefore === true
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    id="modal-donated-no"
                    onClick={() => setProfileFormData({ ...profileFormData, hasDonatedBefore: false, lastDonationDate: '', donationCount: '' })}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      profileFormData.hasDonatedBefore === false
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0]'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* If Yes: date */}
              {profileFormData.hasDonatedBefore && (
                <div className="p-3.5 rounded-xl bg-[#181818] border border-[#2b2b2b] space-y-3">
                  <div>
                    <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-1">
                      Last Donation Date *
                    </label>
                    <input
                      type="date"
                      id="modal-last-donation-date"
                      max={new Date().toISOString().split('T')[0]}
                      value={profileFormData.lastDonationDate}
                      onChange={(e) => setProfileFormData({ ...profileFormData, lastDonationDate: e.target.value })}
                      className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-1">
                      Times Donated (Optional)
                    </label>
                    <select
                      id="modal-donation-count"
                      value={profileFormData.donationCount}
                      onChange={(e) => setProfileFormData({ ...profileFormData, donationCount: e.target.value })}
                      className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white outline-none"
                    >
                      <option value="">Select times donated</option>
                      {['1', '2–5', '6–10', '11–20', 'More than 20'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Willing to donate */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase tracking-wider mb-1.5">
                  Are you currently willing to donate? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="modal-willing-yes"
                    onClick={() => setProfileFormData({ ...profileFormData, isAvailableForDonation: true })}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      profileFormData.isAvailableForDonation === true
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0]'
                    }`}
                  >
                    Yes (Available)
                  </button>
                  <button
                    type="button"
                    id="modal-willing-no"
                    onClick={() => setProfileFormData({ ...profileFormData, isAvailableForDonation: false })}
                    className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                      profileFormData.isAvailableForDonation === false
                        ? 'bg-[#1c090c] border-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                        : 'bg-[#161616] border-[#2e2e2e] text-[#B0B0B0]'
                    }`}
                  >
                    No (Not Currently)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  id="modal-cancel-button"
                  onClick={() => setShowCompleteProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#333] text-white font-bold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="modal-save-profile-button"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white font-bold shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
