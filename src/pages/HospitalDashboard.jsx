import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building,
  Activity,
  Droplet,
  Users,
  Search,
  Plus,
  Clock,
  MapPin,
  ShieldCheck,
  LogOut,
  Send,
  Eye,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  Phone,
  Lock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentHospital,
  getHospitalNearbyDonors,
  createHospitalBloodRequest,
  getHospitalBloodRequests,
  changeHospitalPassword
} from '../services/hospitalService';
import { bloodGroups } from '../data/mockData';
import { showToast } from '../components/Toast';

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [hospital, setHospital] = useState(null);
  const [loadingHospital, setLoadingHospital] = useState(true);

  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedRadius, setSelectedRadius] = useState(25);
  const [matchingDonors, setMatchingDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Password Change Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);

  // New Request Form State
  const [newRequest, setNewRequest] = useState({
    bloodGroup: 'O+',
    units: 2,
    urgency: 'Critical',
    requiredDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // 1. Fetch authenticated hospital profile from GET /api/hospital/me
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoadingHospital(true);
      try {
        const hosp = await getCurrentHospital();
        if (!hosp) {
          showToast('Session expired or unauthorized. Please log in.', 'error');
          navigate('/hospital-portal');
          return;
        }
        if (isMounted) {
          setHospital(hosp);
        }
      } catch (err) {
        console.error('Error fetching hospital profile:', err);
        showToast('Authentication error. Please log in.', 'error');
        navigate('/hospital-portal');
      } finally {
        if (isMounted) {
          setLoadingHospital(false);
        }
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [navigate]);

  // 2. Fetch hospital blood requests from GET /api/hospital/blood-requests
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await getHospitalBloodRequests();
      setRequests(data || []);
    } catch (err) {
      console.warn('Could not load hospital requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (hospital) {
      fetchRequests();
    }
  }, [hospital, fetchRequests]);

  // 3. Fetch nearby donors from GET /api/hospital/nearby-donors
  const fetchDonors = useCallback(async () => {
    if (!hospital) return;
    setLoadingDonors(true);
    try {
      const res = await getHospitalNearbyDonors({
        bloodGroup: selectedGroup,
        radius: selectedRadius
      });
      setMatchingDonors(res.donors || []);
    } catch (err) {
      console.warn('Error loading nearby donors for hospital:', err);
    } finally {
      setLoadingDonors(false);
    }
  }, [hospital, selectedGroup, selectedRadius]);

  useEffect(() => {
    if (hospital) {
      fetchDonors();
    }
  }, [hospital, fetchDonors]);

  // Handle Blood Request Creation
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    try {
      const created = await createHospitalBloodRequest({
        bloodGroup: newRequest.bloodGroup,
        unitsRequired: Number(newRequest.units),
        urgency: newRequest.urgency,
        requiredDate: newRequest.requiredDate,
        notes: newRequest.notes
      });
      setRequests(prev => [created.request, ...prev]);
      setShowNewRequestModal(false);
      setNewRequest({
        bloodGroup: 'O+',
        units: 2,
        urgency: 'Critical',
        requiredDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      showToast('Blood Request Dispatched to Regional Registry.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch request.', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (pwdData.newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmittingPwd(true);
    try {
      await changeHospitalPassword({
        currentPassword: pwdData.currentPassword,
        newPassword: pwdData.newPassword
      });
      showToast('Hospital password updated successfully.', 'success');
      setShowPasswordModal(false);
      setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmittingPwd(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/hospital-portal');
  };

  if (loadingHospital) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#FF2B2B] animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-[#B0B0B0]">
          Authenticating hospital console session...
        </p>
      </div>
    );
  }

  if (!hospital) {
    return null;
  }

  const hospName = hospital.hospital_name || hospital.name;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#0a0a0a] border-r border-[#1e1e1e] p-5 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          {/* Hospital Info Capsule */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-[#222222]">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-bold text-white shadow-[0_0_12px_rgba(229,9,20,0.5)] flex-shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white truncate" title={hospName}>
                  {hospName}
                </h4>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> AUTHENTICATED
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#737373] space-y-1 border-t border-white/5 pt-2.5 font-mono">
              <div>Key: <span className="text-white font-bold">{hospital.user_key}</span></div>
              <div>District: <span className="text-[#B0B0B0] font-sans">{hospital.district}</span></div>
              <div>Location: <span className="text-[#B0B0B0] font-sans">{hospital.location}</span></div>
              {hospital.latitude && (
                <div className="text-[10px] text-zinc-500 font-mono">
                  {hospital.latitude.toFixed(4)}° N, {hospital.longitude.toFixed(4)}° E
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {['Overview', 'Nearby Donors', 'Hospital Blood Requests'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-[#1a080a] text-white border border-[#E50914]/40 shadow-[0_0_15px_rgba(229,9,20,0.2)]'
                    : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeTab === tab ? 'text-[#FF2B2B]' : 'text-[#555]'}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Security & Sign Out */}
        <div className="pt-6 border-t border-white/5 mt-6 space-y-2">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#B0B0B0] hover:text-white hover:bg-white/5 transition-all"
          >
            <Key className="w-4 h-4 text-[#FF2B2B]" />
            <span>Change Hospital Password</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#737373] hover:text-[#FF2B2B] hover:bg-[#18080a] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Hospital Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Console Area */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl overflow-x-hidden">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-[#1c1c1c]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#180a0c] border border-[#E50914]/30 text-xs font-semibold text-[#FF2B2B] mb-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
              <span>Institutional Portal • {hospital.district} ({hospital.location})</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {hospName}
            </h1>
            <p className="text-sm text-[#B0B0B0] mt-1 font-mono">
              User Key: <span className="text-white font-bold">{hospital.user_key}</span> • Coordinates: {hospital.latitude}° N, {hospital.longitude}° E
            </p>
          </div>

          <button
            onClick={() => setShowNewRequestModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all transform hover:-translate-y-0.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE BLOOD REQUIREMENT</span>
          </button>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 my-8">
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
              <span>Active Requests</span>
              <Flame className="w-4 h-4 text-[#FF2B2B]" />
            </div>
            <div className="text-3xl font-black text-[#FF2B2B]">
              {requests.length}
            </div>
            <span className="text-[11px] text-amber-400 mt-1 block font-medium">Linked to this hospital account</span>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
              <span>Nearby Donors</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white">{matchingDonors.length}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-medium">Within {selectedRadius} km</span>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
              <span>Location Center</span>
              <MapPin className="w-4 h-4 text-[#E50914]" />
            </div>
            <div className="text-lg font-bold text-white truncate">
              {hospital.location}
            </div>
            <span className="text-[11px] text-[#B0B0B0] mt-1 block font-medium">{hospital.district} District</span>
          </div>

          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
              <span>Institutional Status</span>
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-sm font-black text-emerald-400 font-mono mt-1.5">VERIFIED CREDENTIALS</div>
            <span className="text-[11px] text-[#737373] mt-1 block font-mono">{hospital.user_key}</span>
          </div>
        </div>

        {/* SECTION: NEARBY DONORS DISCOVERY (Haversine Distance Matching) */}
        <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 mb-10 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#FF2B2B]" />
                <span>Find Nearby Blood Donors</span>
              </h3>
              <p className="text-xs text-[#B0B0B0] mt-1">
                Calculates precise Haversine distance from <strong className="text-white">{hospName}</strong> ({hospital.latitude}° N, {hospital.longitude}° E).
              </p>
            </div>

            {/* Configurable Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Blood Group Filter */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#B0B0B0] mb-1">Blood Group</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="bg-[#161616] border border-[#333] text-white text-xs rounded-xl px-3 py-2 outline-none font-bold cursor-pointer"
                >
                  <option value="All Groups">All Blood Groups</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Radius Filter: 5, 10, 25, 50 km */}
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

          {/* Donors List with Haversine Distances */}
          {loadingDonors ? (
            <div className="py-16 text-center text-xs text-[#737373] flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#FF2B2B] animate-spin" />
              <span>Scanning live donor registry near {hospital.location}...</span>
            </div>
          ) : matchingDonors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchingDonors.map((donor) => (
                <div
                  key={donor.id}
                  className="bg-[#161616] border border-white/5 hover:border-[#E50914]/50 rounded-2xl p-4 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-[#E50914]/20 text-[#FF2B2B] text-xs font-black">
                        {donor.bloodGroup || donor.blood_group}
                      </span>
                      <h4 className="text-sm font-bold text-white">{donor.name}</h4>
                    </div>
                    {/* Distance Badge */}
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#1a080a] text-[#FF2B2B] border border-[#E50914]/30">
                      {donor.distanceFormatted}
                    </span>
                  </div>

                  <div className="text-xs text-[#B0B0B0] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#E50914]" />
                    <span>{donor.city ? `${donor.city}, ${donor.district}` : donor.district}</span>
                  </div>

                  {/* Authorized Contact Phone (Exclusive Clinical Permission) */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <a
                      href={`tel:${donor.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{donor.phone}</span>
                    </a>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      CLINICAL ACCESS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#737373] bg-[#141414] rounded-2xl border border-white/5 p-6">
              <AlertCircle className="w-8 h-8 text-amber-500/80 mx-auto mb-2" />
              <p className="text-white font-semibold mb-1">No active donors found within {selectedRadius} km</p>
              <p>Try increasing your search radius to 25 km or 50 km to find more regional donors.</p>
            </div>
          )}
        </div>

        {/* SECTION: ACTIVE BLOOD REQUESTS QUEUE */}
        <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF2B2B]" />
                <span>Hospital Blood Requests Queue</span>
              </h3>
              <p className="text-xs text-[#B0B0B0] mt-1">
                Emergency requirement tickets created for <strong className="text-white">{hospName}</strong>.
              </p>
            </div>
          </div>

          {loadingRequests ? (
            <div className="py-12 text-center text-xs text-[#737373]">Loading hospital blood requests...</div>
          ) : requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#161616] border border-white/5 hover:border-[#E50914]/40 rounded-2xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-black text-white text-lg flex-shrink-0">
                      {req.blood_group || req.bloodGroup}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {req.units_required || req.units || 1} Unit(s) Required
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.urgency === 'Critical'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}>
                          {req.urgency || 'Urgent'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#B0B0B0] mt-1">
                        <span>Required: {req.required_date || req.requiredDate || 'Immediate'}</span>
                        <span>•</span>
                        <span>{req.hospital_name || hospName}</span>
                      </div>
                      {req.notes && (
                        <p className="text-xs text-[#888] mt-1 italic">"{req.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-1">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {req.status || 'PENDING'}
                    </span>
                    <span className="text-[10px] text-[#737373] font-mono">ID: {req.id}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#737373] bg-[#141414] rounded-2xl border border-white/5 p-6">
              <Droplet className="w-8 h-8 text-[#555] mx-auto mb-2" />
              <p className="text-white font-semibold mb-1">No active blood requests dispatched yet</p>
              <p>Click "Create Blood Requirement" to broadcast an emergency requirement from this hospital.</p>
            </div>
          )}
        </div>

        {/* MODAL 1: CREATE BLOOD REQUIREMENT */}
        {showNewRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-lg glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
              {/* Top edge glass reflection highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#FF2B2B]">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create Blood Requirement</h3>
                  <p className="text-xs text-[#B0B0B0]">{hospName} • {hospital.district}</p>
                </div>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Blood Group *</label>
                    <select
                      value={newRequest.bloodGroup}
                      onChange={(e) => setNewRequest({ ...newRequest, bloodGroup: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer"
                    >
                      {bloodGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Units Required *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="20"
                      value={newRequest.units}
                      onChange={(e) => setNewRequest({ ...newRequest, units: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Urgency Level *</label>
                    <select
                      value={newRequest.urgency}
                      onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Critical">🔴 Critical (Immediate)</option>
                      <option value="Urgent">🟠 Urgent (Within 12h)</option>
                      <option value="Normal">🟢 Normal (Elective/Routine)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Required Date *</label>
                    <input
                      type="date"
                      required
                      value={newRequest.requiredDate}
                      onChange={(e) => setNewRequest({ ...newRequest, requiredDate: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Clinical Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. ICU patient transfusion, surgery scheduled at 2 PM..."
                    value={newRequest.notes}
                    onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewRequestModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] disabled:opacity-60"
                  >
                    {isSubmittingRequest ? 'Dispatching...' : 'Dispatch Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CHANGE HOSPITAL PASSWORD */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-md glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
              {/* Top edge glass reflection highlight */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#FF2B2B]">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Change Hospital Password</h3>
                  <p className="text-xs text-[#B0B0B0]">Update temporary initial credential password</p>
                </div>
              </div>

              {pwdError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {pwdError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Current Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={pwdData.currentPassword}
                    onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">New Password * (Min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Enter new password"
                    value={pwdData.newPassword}
                    onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Confirm new password"
                    value={pwdData.confirmPassword}
                    onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPwd}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] disabled:opacity-60"
                  >
                    {isSubmittingPwd ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
