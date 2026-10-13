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
  Mail,
  Lock,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Key,
  ShieldAlert,
  Check,
  X,
  Filter,
  CheckCircle,
  XCircle,
  FileText,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getCurrentHospital,
  getHospitalNearbyDonors,
  createHospitalBloodRequest,
  getHospitalBloodRequests,
  changeHospitalPassword
} from '../services/hospitalService';
import {
  fetchHospitalMyRequirements,
  createHospitalRequirement,
  updateHospitalRequirementStatus,
  fetchHospitalDonorResponses,
  respondToHospitalDonorResponse
} from '../services/hospitalRequirementService';
import { bloodGroups } from '../data/mockData';
import { showToast } from '../components/Toast';

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Core Hospital Profile
  const [hospital, setHospital] = useState(null);
  const [loadingHospital, setLoadingHospital] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState('Overview');

  // 1. Hospital Blood Requirements & Donor Responses state
  const [hospitalReqs, setHospitalReqs] = useState([]);
  const [loadingHospitalReqs, setLoadingHospitalReqs] = useState(false);
  const [donorResponses, setDonorResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Requirement Filters
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');

  // Response Filters
  const [respStatusFilter, setRespStatusFilter] = useState('ALL');
  const [respReqFilter, setRespReqFilter] = useState('ALL');

  // Modal States
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isPublishingReq, setIsPublishingReq] = useState(false);
  const [publishForm, setPublishForm] = useState({
    bloodGroup: 'O+',
    unitsRequired: 2,
    urgency: 'Emergency',
    requiredDate: new Date().toISOString().split('T')[0],
    requiredTime: '12:00',
    reason: 'Surgery',
    doctorContact: '',
    patientIdentifier: '',
    additionalInstructions: ''
  });

  // Scheduling Modal
  const [schedulingResponse, setSchedulingResponse] = useState(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Decline Modal
  const [decliningResponse, setDecliningResponse] = useState(null);
  const [declineReason, setDeclineReason] = useState('Requirement already fulfilled');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // 2. Nearby Donors State (Haversine)
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [selectedRadius, setSelectedRadius] = useState(25);
  const [matchingDonors, setMatchingDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);

  // 3. Direct Requests Queue State (Legacy broadcast)
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    bloodGroup: 'O+',
    units: 2,
    urgency: 'Critical',
    requiredDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // 4. Password Change Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);

  // Fetch authenticated hospital profile
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

  // Fetch verified hospital blood requirements
  const fetchMyRequirements = useCallback(async () => {
    setLoadingHospitalReqs(true);
    try {
      const data = await fetchHospitalMyRequirements();
      setHospitalReqs(data || []);
    } catch (err) {
      console.warn('Error fetching hospital requirements:', err);
    } finally {
      setLoadingHospitalReqs(false);
    }
  }, []);

  // Fetch donor responses for this hospital's requirements
  const fetchResponses = useCallback(async () => {
    setLoadingResponses(true);
    try {
      const data = await fetchHospitalDonorResponses();
      setDonorResponses(data || []);
    } catch (err) {
      console.warn('Error fetching hospital donor responses:', err);
    } finally {
      setLoadingResponses(false);
    }
  }, []);

  // Fetch legacy direct requests
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

  // Fetch nearby donors
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

  // Initial loads when hospital is loaded
  useEffect(() => {
    if (hospital) {
      fetchMyRequirements();
      fetchResponses();
      fetchRequests();
      fetchDonors();
    }
  }, [hospital, fetchMyRequirements, fetchResponses, fetchRequests, fetchDonors]);

  // Publish verified hospital blood requirement
  const handlePublishRequirement = async (e) => {
    e.preventDefault();

    // Check for Bombay blood group attempt
    if (publishForm.bloodGroup === 'Oh' || publishForm.bloodGroup.toLowerCase().includes('bombay')) {
      showToast('Bombay Blood Group (Oh) requirements must be routed through Bombay Secure Access.', 'error');
      return;
    }

    setIsPublishingReq(true);
    try {
      const created = await createHospitalRequirement({
        bloodGroup: publishForm.bloodGroup,
        unitsRequired: parseInt(publishForm.unitsRequired, 10),
        urgency: publishForm.urgency,
        requiredDate: publishForm.requiredDate,
        requiredTime: publishForm.requiredTime,
        reason: publishForm.reason,
        doctorContact: publishForm.doctorContact || hospital?.contact_phone || hospital?.contactPhone || '+91 98421 00000',
        patientIdentifier: publishForm.patientIdentifier,
        additionalInstructions: publishForm.additionalInstructions,
      });

      setHospitalReqs(prev => [created, ...prev]);
      setShowPublishModal(false);
      showToast('Verified Blood Requirement Published to Public Feed! 🎉', 'success');

      // Reset form
      setPublishForm({
        bloodGroup: 'O+',
        unitsRequired: 2,
        urgency: 'Emergency',
        requiredDate: new Date().toISOString().split('T')[0],
        requiredTime: '12:00',
        reason: 'Surgery',
        doctorContact: '',
        patientIdentifier: '',
        additionalInstructions: ''
      });
    } catch (err) {
      showToast(err.message || 'Failed to publish blood requirement.', 'error');
    } finally {
      setIsPublishingReq(false);
    }
  };

  // Cancel requirement
  const handleCancelRequirement = async (reqId) => {
    if (!window.confirm('Are you sure you want to cancel this blood requirement? It will be marked CANCELLED and removed from the active donor feed.')) {
      return;
    }
    try {
      await updateHospitalRequirementStatus(reqId, 'CANCELLED');
      setHospitalReqs(prev => prev.map(r => r.id === reqId ? { ...r, status: 'CANCELLED' } : r));
      showToast('Blood requirement marked as CANCELLED.', 'info');
    } catch (err) {
      showToast(err.message || 'Could not cancel requirement.', 'error');
    }
  };

  // Donor response triage: 1. ACCEPT
  const handleAcceptResponse = async (resp) => {
    setActionLoadingId(resp.id);
    try {
      await respondToHospitalDonorResponse({
        responseId: resp.id,
        action: 'ACCEPT',
      });
      setDonorResponses(prev => prev.map(r => r.id === resp.id ? { ...r, status: 'ACCEPTED_BY_HOSPITAL' } : r));
      showToast(`Accepted donation offer from ${resp.donor_name}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to accept response.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Donor response triage: 2. SCHEDULE
  const handleConfirmSchedule = async (e) => {
    e.preventDefault();
    if (!schedulingResponse || !scheduleDateTime) {
      showToast('Please select a valid date and time for the appointment.', 'error');
      return;
    }
    setIsSubmittingSchedule(true);
    try {
      await respondToHospitalDonorResponse({
        responseId: schedulingResponse.id,
        action: 'SCHEDULE',
        scheduledAt: scheduleDateTime,
      });
      setDonorResponses(prev => prev.map(r => r.id === schedulingResponse.id ? {
        ...r,
        status: 'DONATION_SCHEDULED',
        scheduled_at: scheduleDateTime,
        hospital_notes: scheduleNotes || r.hospital_notes
      } : r));
      showToast(`Donation appointment scheduled for ${schedulingResponse.donor_name}.`, 'success');
      setSchedulingResponse(null);
      setScheduleDateTime('');
      setScheduleNotes('');
    } catch (err) {
      showToast(err.message || 'Failed to schedule donation.', 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Donor response triage: 3. COMPLETE
  const handleCompleteDonation = async (resp) => {
    if (!window.confirm(`Confirm donation completion for donor ${resp.donor_name}? This will fulfill 1 unit toward the requirement and record this donation in the donor's official history.`)) {
      return;
    }
    setActionLoadingId(resp.id);
    try {
      await respondToHospitalDonorResponse({
        responseId: resp.id,
        action: 'COMPLETE',
      });
      setDonorResponses(prev => prev.map(r => r.id === resp.id ? { ...r, status: 'DONATION_COMPLETED' } : r));
      // Refresh requirements to update fulfillment progress bar
      fetchMyRequirements();
      showToast(`Donation marked as COMPLETED! Credited to ${resp.donor_name}'s history.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to complete donation.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Donor response triage: 4. DECLINE
  const handleConfirmDecline = async (e) => {
    e.preventDefault();
    if (!decliningResponse) return;
    setIsSubmittingDecline(true);
    try {
      await respondToHospitalDonorResponse({
        responseId: decliningResponse.id,
        action: 'DECLINE',
        reason: declineReason || 'Requirement capacity reached.',
      });
      setDonorResponses(prev => prev.map(r => r.id === decliningResponse.id ? {
        ...r,
        status: 'DECLINED_BY_HOSPITAL',
        hospital_notes: declineReason
      } : r));
      showToast(`Response from ${decliningResponse.donor_name} declined.`, 'info');
      setDecliningResponse(null);
      setDeclineReason('Requirement already fulfilled');
    } catch (err) {
      showToast(err.message || 'Failed to decline response.', 'error');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Create legacy direct blood request
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
      showToast('Emergency broadcast request dispatched to regional registry.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to dispatch request.', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Change password
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
  const activeReqs = hospitalReqs.filter(r => r.status === 'ACTIVE');
  const pendingResponses = donorResponses.filter(r => r.status === 'PENDING_HOSPITAL_RESPONSE');

  // Filtered requirements list
  const filteredRequirements = hospitalReqs.filter(r => {
    if (reqStatusFilter === 'ALL') return true;
    return (r.status || '').toUpperCase() === reqStatusFilter;
  });

  // Filtered donor responses list
  const filteredResponses = donorResponses.filter(resp => {
    if (respStatusFilter !== 'ALL' && resp.status !== respStatusFilter) return false;
    if (respReqFilter !== 'ALL' && resp.requirement_id !== respReqFilter) return false;
    return true;
  });

  // Navigation tabs definition
  const navigationTabs = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Blood Requirements', label: 'Blood Requirements', badge: activeReqs.length },
    { id: 'Donor Responses', label: 'Donor Responses', badge: pendingResponses.length, isAlert: pendingResponses.length > 0 },
    { id: 'Nearby Donors', label: 'Nearby Donors', badge: matchingDonors.length },
    { id: 'Direct Requests Queue', label: 'Emergency Broadcast' }
  ];

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
                  <ShieldCheck className="w-3 h-3" /> VERIFIED HOSPITAL
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
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#1a080a] text-white border border-[#E50914]/40 shadow-[0_0_15px_rgba(229,9,20,0.2)]'
                    : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{tab.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      tab.isAlert
                        ? 'bg-[#E50914] text-white animate-pulse'
                        : 'bg-white/10 text-[#B0B0B0]'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-[#FF2B2B]' : 'text-[#555]'}`} />
                </div>
              </button>
            ))}

            {/* Bombay Rare Phenotype Gateway Link */}
            <Link
              to="/bombay-access"
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all mt-2"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Bombay Secure Access</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </Link>
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

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <Link
              to="/bombay-access"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Bombay Portal</span>
            </Link>

            <button
              onClick={() => setShowPublishModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-xs font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all transform hover:-translate-y-0.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>PUBLISH BLOOD REQUIREMENT</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW TAB */}
        {/* ========================================================================= */}
        {activeTab === 'Overview' && (
          <div className="space-y-8 mt-8">
            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Active Verified Requirements */}
              <div
                onClick={() => setActiveTab('Blood Requirements')}
                className="bg-[#111111] border border-[#222222] hover:border-[#FF2B2B]/50 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Active Requirements</span>
                  <Droplet className="w-4 h-4 text-[#FF2B2B]" />
                </div>
                <div className="text-3xl font-black text-[#FF2B2B] group-hover:translate-x-1 transition-transform">
                  {activeReqs.length}
                </div>
                <span className="text-[11px] text-emerald-400 mt-1 block font-medium">Published on public feed</span>
              </div>

              {/* Card 2: Pending Donor Responses */}
              <div
                onClick={() => setActiveTab('Donor Responses')}
                className="bg-[#111111] border border-[#222222] hover:border-amber-500/50 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Donor Responses</span>
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-white group-hover:translate-x-1 transition-transform flex items-center gap-2">
                  <span>{donorResponses.length}</span>
                  {pendingResponses.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                      {pendingResponses.length} pending
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-amber-400 mt-1 block font-medium">Click to review & triage</span>
              </div>

              {/* Card 3: Nearby Donors */}
              <div
                onClick={() => setActiveTab('Nearby Donors')}
                className="bg-[#111111] border border-[#222222] hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Nearby Donors</span>
                  <Compass className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-white group-hover:translate-x-1 transition-transform">
                  {matchingDonors.length}
                </div>
                <span className="text-[11px] text-emerald-400 mt-1 block font-medium">Within {selectedRadius} km</span>
              </div>

              {/* Card 4: Institutional Status */}
              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Institutional Status</span>
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-sm font-black text-emerald-400 font-mono mt-1.5">VERIFIED CREDENTIALS</div>
                <span className="text-[11px] text-[#737373] mt-1 block font-mono">{hospital.user_key}</span>
              </div>
            </div>

            {/* Overview Action Bar */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#222222] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white">Hospital Operations Console Active</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#E50914]/20 hover:bg-[#E50914]/30 text-[#FF2B2B] border border-[#E50914]/40 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publish Requirement</span>
                </button>
                <button
                  onClick={() => setActiveTab('Donor Responses')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Review Responses ({pendingResponses.length})</span>
                </button>
                <button
                  onClick={() => { fetchMyRequirements(); fetchResponses(); }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#B0B0B0] hover:text-white border border-white/10 transition-all"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Two-Column Overview Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Recent Verified Requirements */}
              <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-[#FF2B2B]" />
                    <span>Hospital Requirements</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('Blood Requirements')}
                    className="text-xs text-[#FF2B2B] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>View All ({hospitalReqs.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingHospitalReqs ? (
                  <div className="py-12 text-center text-xs text-[#737373]">Loading requirements...</div>
                ) : hospitalReqs.length > 0 ? (
                  <div className="space-y-3">
                    {hospitalReqs.slice(0, 3).map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-[#161616] border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-black text-white text-sm flex-shrink-0">
                            {req.blood_group}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-mono">{req.requirement_code}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                req.urgency === 'Emergency' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              }`}>
                                {req.urgency}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#B0B0B0] mt-0.5">
                              {req.units_fulfilled || 0} of {req.units_required} units fulfilled • {req.reason}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#737373]">
                    No blood requirements published yet. Click "Publish Requirement" to broadcast to voluntary donors.
                  </div>
                )}
              </div>

              {/* Right Column: Recent Donor Responses */}
              <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Recent Donor Responses</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('Donor Responses')}
                    className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Triage All ({donorResponses.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loadingResponses ? (
                  <div className="py-12 text-center text-xs text-[#737373]">Loading responses...</div>
                ) : donorResponses.length > 0 ? (
                  <div className="space-y-3">
                    {donorResponses.slice(0, 3).map((resp) => (
                      <div
                        key={resp.id}
                        className="p-3.5 rounded-xl bg-[#161616] border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center font-black text-white text-sm flex-shrink-0">
                            {resp.donor_blood_group}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{resp.donor_name}</span>
                              <span className="text-[10px] text-[#737373] font-mono">{resp.donor_district}</span>
                            </div>
                            <div className="text-[11px] text-[#B0B0B0] mt-0.5">
                              Offering for requirement <span className="font-mono text-white">{resp.requirement_code || 'HBR-REQ'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {resp.status === 'PENDING_HOSPITAL_RESPONSE' ? (
                            <button
                              onClick={() => handleAcceptResponse(resp)}
                              disabled={actionLoadingId === resp.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold transition-all"
                            >
                              {actionLoadingId === resp.id ? '...' : 'Accept'}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-[#B0B0B0]">
                              {resp.status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#737373]">
                    No donor responses recorded yet. Responses will appear here when voluntary donors respond.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: BLOOD REQUIREMENTS TAB (Manage & Publish) */}
        {/* ========================================================================= */}
        {activeTab === 'Blood Requirements' && (
          <div className="space-y-6 mt-8">
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-[#FF2B2B]" />
                    <span>Hospital Blood Requirements</span>
                  </h3>
                  <p className="text-xs text-[#B0B0B0] mt-1">
                    Official verified requirements visible to voluntary donors across Tamil Nadu on <Link to="/donate-blood" className="text-[#FF2B2B] underline">/donate-blood</Link>.
                  </p>
                </div>

                <button
                  onClick={() => setShowPublishModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish New Requirement</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {['ALL', 'ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setReqStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      reqStatusFilter === st
                        ? 'bg-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                        : 'bg-[#181818] text-[#B0B0B0] hover:text-white hover:bg-[#222]'
                    }`}
                  >
                    {st === 'ALL' ? 'All Requirements' : st}
                    {st === 'ALL' && ` (${hospitalReqs.length})`}
                    {st === 'ACTIVE' && ` (${activeReqs.length})`}
                  </button>
                ))}
              </div>

              {/* Requirements Cards */}
              {loadingHospitalReqs ? (
                <div className="py-16 text-center text-xs text-[#737373] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-[#FF2B2B] animate-spin" />
                  <span>Loading verified hospital blood requirements...</span>
                </div>
              ) : filteredRequirements.length > 0 ? (
                <div className="space-y-4">
                  {filteredRequirements.map((req) => {
                    const fulfilled = req.units_fulfilled || 0;
                    const required = req.units_required || 1;
                    const pct = Math.min(100, Math.round((fulfilled / required) * 100));

                    return (
                      <div
                        key={req.id}
                        className="bg-[#161616] border border-white/5 hover:border-[#E50914]/40 rounded-2xl p-5 transition-all space-y-4"
                      >
                        {/* Top Line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-black text-white text-lg flex-shrink-0 shadow-[0_0_15px_rgba(229,9,20,0.4)]">
                              {req.blood_group}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white font-mono tracking-wide">
                                  {req.requirement_code}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  req.urgency === 'Emergency'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                                    : req.urgency === 'Urgent'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                }`}>
                                  {req.urgency}
                                </span>
                              </div>
                              <div className="text-xs text-[#B0B0B0] mt-0.5">
                                Reason: <strong className="text-white">{req.reason}</strong>
                                {req.patient_identifier && <span className="text-[#888]"> • Ref: {req.patient_identifier}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              req.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : req.status === 'FULFILLED'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {req.status}
                            </span>
                          </div>
                        </div>

                        {/* Units Progress Bar */}
                        <div className="bg-[#121212] p-3.5 rounded-xl border border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#B0B0B0] font-semibold">
                              Fulfillment Progress: <strong className="text-white">{fulfilled} of {required} Units</strong>
                            </span>
                            <span className="font-mono font-bold text-[#FF2B2B]">{pct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#202020] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#FF2B2B] to-emerald-500 transition-all duration-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Info details & Instructions */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-[#B0B0B0]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#FF2B2B] flex-shrink-0" />
                            <span className="truncate">Needed: <strong className="text-white">{req.required_date} {req.required_time || ''}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">Phone: <strong className="text-white">{req.doctor_contact || hospital.contact_phone || 'Hospital Desk'}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                            <a
                              href={`mailto:${req.hospital_email || hospital.email || 'hospital@bloodbridge.org'}`}
                              className="truncate text-zinc-300 hover:text-white transition-colors"
                              title={req.hospital_email || hospital.email || 'hospital@bloodbridge.org'}
                            >
                              Email: <strong className="text-white">{req.hospital_email || hospital.email || 'hospital@bloodbridge.org'}</strong>
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span>Posted: {new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {req.additional_instructions && (
                          <div className="text-xs text-[#888] italic bg-black/20 p-2.5 rounded-lg border border-white/5">
                            "{req.additional_instructions}"
                          </div>
                        )}

                        {/* Bottom Actions */}
                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-[#B0B0B0]">
                            {req.totalResponses !== undefined ? (
                              <span>
                                <strong className="text-white">{req.totalResponses}</strong> donor responses ({req.pendingResponses || 0} pending)
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setRespReqFilter(req.id);
                                setActiveTab('Donor Responses');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                            >
                              <Users className="w-3.5 h-3.5 text-amber-400" />
                              <span>View Responses</span>
                              <ChevronRight className="w-3 h-3 text-[#B0B0B0]" />
                            </button>

                            {req.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleCancelRequirement(req.id)}
                                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 transition-all"
                              >
                                Cancel Requirement
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-[#737373] bg-[#141414] rounded-2xl border border-white/5 p-8">
                  <Droplet className="w-10 h-10 text-[#555] mx-auto mb-3" />
                  <p className="text-white font-bold text-sm mb-1">No requirements found in this view</p>
                  <p className="mb-4">Click "Publish New Requirement" to create a donor-facing blood requirement.</p>
                  <button
                    onClick={() => setShowPublishModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#E50914] text-xs font-bold text-white"
                  >
                    Publish Requirement
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DONOR RESPONSES TAB (Triage, Accept, Schedule, Complete) */}
        {/* ========================================================================= */}
        {activeTab === 'Donor Responses' && (
          <div className="space-y-6 mt-8">
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span>Voluntary Donor Responses Queue</span>
                  </h3>
                  <p className="text-xs text-[#B0B0B0] mt-1">
                    Voluntary donors who have responded to requirements published by <strong className="text-white">{hospName}</strong>.
                  </p>
                </div>

                <button
                  onClick={fetchResponses}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#FF2B2B]" />
                  <span>Refresh Responses</span>
                </button>
              </div>

              {/* Status Filters & Requirement Filter Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'ALL', label: 'All Responses' },
                    { id: 'PENDING_HOSPITAL_RESPONSE', label: 'Pending Review' },
                    { id: 'ACCEPTED_BY_HOSPITAL', label: 'Accepted' },
                    { id: 'DONATION_SCHEDULED', label: 'Scheduled' },
                    { id: 'DONATION_COMPLETED', label: 'Completed' },
                    { id: 'DECLINED_BY_HOSPITAL', label: 'Declined' }
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setRespStatusFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        respStatusFilter === filter.id
                          ? 'bg-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
                          : 'bg-[#181818] text-[#B0B0B0] hover:text-white hover:bg-[#222]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Requirement Filter Dropdown */}
                <div>
                  <select
                    value={respReqFilter}
                    onChange={(e) => setRespReqFilter(e.target.value)}
                    className="bg-[#161616] border border-[#333] text-white text-xs rounded-xl px-3 py-2 outline-none font-bold cursor-pointer"
                  >
                    <option value="ALL">All Linked Requirements</option>
                    {hospitalReqs.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.requirement_code} ({req.blood_group} • {req.reason})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Donor Responses List */}
              {loadingResponses ? (
                <div className="py-16 text-center text-xs text-[#737373] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  <span>Loading voluntary donor responses...</span>
                </div>
              ) : filteredResponses.length > 0 ? (
                <div className="space-y-4">
                  {filteredResponses.map((resp) => {
                    const isPending = resp.status === 'PENDING_HOSPITAL_RESPONSE';
                    const isAccepted = resp.status === 'ACCEPTED_BY_HOSPITAL';
                    const isScheduled = resp.status === 'DONATION_SCHEDULED';
                    const isCompleted = resp.status === 'DONATION_COMPLETED';
                    const isDeclined = resp.status === 'DECLINED_BY_HOSPITAL';
                    const isCancelled = resp.status === 'CANCELLED_BY_DONOR';

                    return (
                      <div
                        key={resp.id}
                        className={`bg-[#161616] border rounded-2xl p-5 transition-all space-y-4 ${
                          isPending
                            ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                            : isAccepted
                            ? 'border-emerald-500/30'
                            : isScheduled
                            ? 'border-sky-500/30'
                            : isCompleted
                            ? 'border-purple-500/30'
                            : 'border-white/5'
                        }`}
                      >
                        {/* Header: Code & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center font-black text-white text-lg flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                              {resp.donor_blood_group}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{resp.donor_name}</h4>
                                <span className="text-[10px] text-[#737373] font-mono">{resp.response_code}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[#B0B0B0] mt-0.5">
                                <MapPin className="w-3 h-3 text-[#FF2B2B]" />
                                <span>{resp.donor_district} District</span>
                                <span>•</span>
                                <span>Submitted: {new Date(resp.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase font-mono ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : isAccepted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isScheduled
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : isCompleted
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : isDeclined
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {resp.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Linked Requirement reference & Contact Details */}
                        <div className="p-3.5 rounded-xl bg-[#121212] border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#737373] block mb-1">
                              Linked Requirement
                            </span>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <Droplet className="w-3.5 h-3.5 text-[#FF2B2B]" />
                              <span>{resp.requirement_code || 'HBR-REQ'}</span>
                              <span className="text-[#888]">({resp.donor_blood_group} required)</span>
                            </div>
                            <div className="text-[11px] text-[#B0B0B0] mt-0.5">
                              Units Offered: <strong className="text-white">{resp.units_offered || 1} Unit</strong>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#737373] block mb-1">
                              Clinical Contact Information
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {resp.donor_phone && (
                                <a
                                  href={`tel:${resp.donor_phone}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{resp.donor_phone}</span>
                                </a>
                              )}
                              {(resp.donor_email || resp.email) && (
                                <a
                                  href={`mailto:${resp.donor_email || resp.email}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-lg break-all"
                                >
                                  <Mail className="w-3.5 h-3.5 text-[#E50914]" />
                                  <span>{resp.donor_email || resp.email}</span>
                                </a>
                              )}
                              <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                DIRECT LINE
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Donor Message / Availability */}
                        {resp.donor_message && (
                          <div className="text-xs text-[#B0B0B0] bg-black/20 p-2.5 rounded-lg border border-white/5">
                            <span className="text-[#737373] font-bold">Donor Message: </span>
                            <span className="italic">"{resp.donor_message}"</span>
                            {resp.available_time && (
                              <span className="ml-2 font-mono text-white">• Available: {resp.available_time}</span>
                            )}
                          </div>
                        )}

                        {/* Scheduled Appointment Display */}
                        {isScheduled && resp.scheduled_at && (
                          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center gap-2.5 text-xs text-sky-300">
                            <Calendar className="w-4 h-4 text-sky-400 flex-shrink-0" />
                            <div>
                              <strong>Donation Appointment Scheduled:</strong>{' '}
                              <span>{new Date(resp.scheduled_at).toLocaleString()}</span>
                              {resp.hospital_notes && <p className="text-[11px] text-sky-200/80 mt-0.5">Note: {resp.hospital_notes}</p>}
                            </div>
                          </div>
                        )}

                        {/* Completed Banner */}
                        {isCompleted && (
                          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2.5 text-xs text-purple-300">
                            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span>
                              <strong>Donation Completed:</strong> 1 unit credited to hospital requirement and logged in voluntary donor history.
                            </span>
                          </div>
                        )}

                        {/* Declined Banner */}
                        {isDeclined && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-300">
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>
                              <strong>Offer Declined:</strong> {resp.hospital_notes || 'Requirement capacity reached.'}
                            </span>
                          </div>
                        )}

                        {/* Triage Action Buttons */}
                        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-end gap-2.5">
                          {/* Case 1: PENDING -> Accept, Schedule, Decline */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleAcceptResponse(resp)}
                                disabled={actionLoadingId === resp.id}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{actionLoadingId === resp.id ? 'Accepting...' : 'Accept Response'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSchedulingResponse(resp);
                                  setScheduleDateTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                                }}
                                className="px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Schedule Date</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDecliningResponse(resp);
                                  setDeclineReason('Requirement already fulfilled');
                                }}
                                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {/* Case 2: ACCEPTED -> Schedule, Complete, Decline */}
                          {isAccepted && (
                            <>
                              <button
                                onClick={() => {
                                  setSchedulingResponse(resp);
                                  setScheduleDateTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                                }}
                                className="px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Schedule Appointment</span>
                              </button>

                              <button
                                onClick={() => handleCompleteDonation(resp)}
                                disabled={actionLoadingId === resp.id}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)] flex items-center gap-1.5 transition-all"
                              >
                                <Heart className="w-3.5 h-3.5" />
                                <span>{actionLoadingId === resp.id ? 'Recording...' : 'Mark Donation Complete'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDecliningResponse(resp);
                                  setDeclineReason('Scheduling conflict / unable to attend');
                                }}
                                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold transition-all"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {/* Case 3: SCHEDULED -> Reschedule, Complete, Decline */}
                          {isScheduled && (
                            <>
                              <button
                                onClick={() => {
                                  setSchedulingResponse(resp);
                                  setScheduleDateTime(resp.scheduled_at ? new Date(resp.scheduled_at).toISOString().slice(0, 16) : '');
                                }}
                                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all"
                              >
                                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                                <span>Reschedule</span>
                              </button>

                              <button
                                onClick={() => handleCompleteDonation(resp)}
                                disabled={actionLoadingId === resp.id}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)] flex items-center gap-1.5 transition-all"
                              >
                                <Heart className="w-3.5 h-3.5" />
                                <span>{actionLoadingId === resp.id ? 'Recording...' : 'Mark Donation Complete'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setDecliningResponse(resp);
                                  setDeclineReason('Donor did not appear for appointment');
                                }}
                                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold transition-all"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-[#737373] bg-[#141414] rounded-2xl border border-white/5 p-8">
                  <Users className="w-10 h-10 text-[#555] mx-auto mb-3" />
                  <p className="text-white font-bold text-sm mb-1">No donor responses matching this filter</p>
                  <p>When voluntary donors respond to your requirements, they will appear in this triage queue.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: NEARBY DONORS TAB (Haversine Distance Matching) */}
        {/* ========================================================================= */}
        {activeTab === 'Nearby Donors' && (
          <div className="space-y-6 mt-8">
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
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

                  {/* Radius Filter */}
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
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#1a080a] text-[#FF2B2B] border border-[#E50914]/30">
                          {donor.distanceFormatted}
                        </span>
                      </div>

                      <div className="text-xs text-[#B0B0B0] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E50914]" />
                        <span>{donor.city ? `${donor.city}, ${donor.district}` : donor.district}</span>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {donor.phone && (
                            <a
                              href={`tel:${donor.phone}`}
                              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>{donor.phone}</span>
                            </a>
                          )}
                          {(donor.displayEmail || donor.email) && (
                            <a
                              href={`mailto:${donor.email || donor.displayEmail}`}
                              className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white break-all"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#E50914]" />
                              <span>{donor.displayEmail || donor.email}</span>
                            </a>
                          )}
                        </div>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: DIRECT REQUESTS QUEUE TAB (Legacy Emergency Broadcast) */}
        {/* ========================================================================= */}
        {activeTab === 'Direct Requests Queue' && (
          <div className="space-y-6 mt-8">
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#FF2B2B]" />
                    <span>Emergency Direct Requests Broadcast</span>
                  </h3>
                  <p className="text-xs text-[#B0B0B0] mt-1">
                    Urgent clinical blood request tickets broadcast directly from <strong className="text-white">{hospName}</strong>.
                  </p>
                </div>

                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all self-start sm:self-auto"
                >
                  Create Emergency Broadcast
                </button>
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
                  <p className="text-white font-semibold mb-1">No active emergency broadcast requests dispatched yet</p>
                  <p>Click "Create Emergency Broadcast" to broadcast directly to the emergency queue.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: PUBLISH VERIFIED BLOOD REQUIREMENT (HBR-2026-XXXXXX) */}
        {/* ========================================================================= */}
        {showPublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-xl glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#FF2B2B]">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Publish Blood Requirement</h3>
                    <p className="text-xs text-[#B0B0B0]">{hospName} • {hospital.district}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#B0B0B0] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePublishRequirement} className="space-y-4">
                {/* Blood Group & Units */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Blood Group *</label>
                    <select
                      value={publishForm.bloodGroup}
                      onChange={(e) => setPublishForm({ ...publishForm, bloodGroup: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none cursor-pointer"
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
                      value={publishForm.unitsRequired}
                      onChange={(e) => setPublishForm({ ...publishForm, unitsRequired: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Urgency & Required Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Urgency Level *</label>
                    <select
                      value={publishForm.urgency}
                      onChange={(e) => setPublishForm({ ...publishForm, urgency: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Emergency">🔴 Emergency (Immediate Need)</option>
                      <option value="Urgent">🟠 Urgent (Within 24 Hours)</option>
                      <option value="Planned">🟢 Planned (Elective / Scheduled)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Required Date *</label>
                    <input
                      type="date"
                      required
                      value={publishForm.requiredDate}
                      onChange={(e) => setPublishForm({ ...publishForm, requiredDate: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Required Time & Clinical Reason */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Required Time</label>
                    <input
                      type="time"
                      value={publishForm.requiredTime}
                      onChange={(e) => setPublishForm({ ...publishForm, requiredTime: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Clinical Indication / Reason *</label>
                    <select
                      value={publishForm.reason}
                      onChange={(e) => setPublishForm({ ...publishForm, reason: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Surgery">Major Surgery</option>
                      <option value="Trauma / Emergency">Trauma / Accident Emergency</option>
                      <option value="ICU Patient Transfusion">ICU Patient Transfusion</option>
                      <option value="Thalassemia Care">Thalassemia / Dialysis Support</option>
                      <option value="Chemotherapy / Oncology">Oncology / Chemotherapy</option>
                      <option value="General Blood Reserve Shortage">General Reserve Shortage</option>
                    </select>
                  </div>
                </div>

                {/* Doctor Contact & Patient/Ward Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Doctor / Contact Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ramesh / +91 98421 00000"
                      value={publishForm.doctorContact}
                      onChange={(e) => setPublishForm({ ...publishForm, doctorContact: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Ward / Patient Ref (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ward 4B / IPD-8941"
                      value={publishForm.patientIdentifier}
                      onChange={(e) => setPublishForm({ ...publishForm, patientIdentifier: e.target.value })}
                      className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Additional Instructions */}
                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Instructions for Voluntary Donors</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Report directly to 2nd Floor Blood Bank reception. Mention code upon arrival."
                    value={publishForm.additionalInstructions}
                    onChange={(e) => setPublishForm({ ...publishForm, additionalInstructions: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Publishing as <strong className="text-white">{hospName}</strong>. This requirement will immediately appear on the public verified blood needs directory for voluntary donors.
                  </span>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishingReq}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isPublishingReq ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <span>Publish Requirement</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: SCHEDULE DONATION APPOINTMENT */}
        {/* ========================================================================= */}
        {schedulingResponse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-md glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Schedule Donation Appointment</h3>
                  <p className="text-xs text-[#B0B0B0]">Donor: {schedulingResponse.donor_name} ({schedulingResponse.donor_blood_group})</p>
                </div>
              </div>

              <form onSubmit={handleConfirmSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Appointment Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="w-full bg-[#161616] border border-[#333] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Clinical Instructions for Donor</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please arrive on 2nd Floor Blood Bank fasting/hydrated."
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    className="w-full bg-[#161616] border border-[#333] focus:border-sky-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => { setSchedulingResponse(null); setScheduleDateTime(''); setScheduleNotes(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSchedule}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-xs font-bold text-white shadow-[0_0_15px_rgba(56,189,248,0.4)] disabled:opacity-60"
                  >
                    {isSubmittingSchedule ? 'Scheduling...' : 'Confirm Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: DECLINE DONOR RESPONSE */}
        {/* ========================================================================= */}
        {decliningResponse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-md glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Decline Donation Offer</h3>
                  <p className="text-xs text-[#B0B0B0]">Donor: {decliningResponse.donor_name} ({decliningResponse.donor_blood_group})</p>
                </div>
              </div>

              <form onSubmit={handleConfirmDecline} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">Reason for Declining *</label>
                  <select
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="w-full bg-[#161616] border border-[#333] focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="Requirement already fulfilled">Requirement units already fulfilled</option>
                    <option value="Scheduling incompatibility">Scheduling / timing incompatibility</option>
                    <option value="Donor eligibility check failed">Eligibility check issue upon clinical review</option>
                    <option value="Blood Bank capacity reached">Blood Bank storage capacity reached</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => { setDecliningResponse(null); setDeclineReason(''); }}
                    className="flex-1 py-2.5 rounded-xl border border-white/20 text-xs font-semibold text-white hover:bg-white/10"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDecline}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-[#E50914] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.4)] disabled:opacity-60"
                  >
                    {isSubmittingDecline ? 'Declining...' : 'Confirm Decline'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: CREATE DIRECT EMERGENCY BLOOD BROADCAST (Legacy) */}
        {/* ========================================================================= */}
        {showNewRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-lg glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#FF2B2B]">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Emergency Blood Broadcast</h3>
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
                    {isSubmittingRequest ? 'Dispatching...' : 'Dispatch Broadcast'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: CHANGE HOSPITAL PASSWORD */}
        {/* ========================================================================= */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
            <div className="relative w-full max-w-md glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
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
