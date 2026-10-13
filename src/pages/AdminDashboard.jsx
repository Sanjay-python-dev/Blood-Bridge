import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Building,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
  Flame,
  Check,
  X,
  Eye,
  AlertCircle,
  Clock,
  Filter,
  CheckCircle2,
  Sliders,
  Droplet,
  Search,
  Key,
  Copy,
  FileText,
  RefreshCw,
  Lock,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_ACCOUNTS } from '../data/adminCredentials';
import EmailAutomationTestPanel from '../components/admin/EmailAutomationTestPanel';
import { getStoredDonors, updateDonorAdminStatus } from '../services/donorService';
import { getHospitalsList, updateHospitalAuthorization } from '../services/hospitalService';
import {
  getStoredRequests,
  saveStoredRequests,
  updateBloodRequestStatus,
  mapDatabaseRequest,
  REQUEST_STATUS,
} from '../services/requestService';
import RequestDetailsModal from '../components/RequestDetailsModal';
import { getSettings, saveSettings } from '../services/settingsService';
import { getDonorEligibility } from '../services/eligibilityService';
import { bloodGroups } from '../data/mockData';
import { showToast } from '../components/Toast';
import {
  getAdminBombayRequests,
  performAdminRequestAction,
  revokeBombayAccessToken,
  getBombayAuditLogs,
} from '../services/bombayService';

export default function AdminDashboard() {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'email' || tabParam === 'email-automation') return 'Email Automation';
    if (tabParam === 'roster' || tabParam === 'admin-roster') return 'Admin Roster';
    return 'Dashboard';
  });
  const [donorsList, setDonorsList] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [settings, setAdminSettings] = useState(getSettings());
  const [donorSearch, setDonorSearch] = useState('');

  // Bombay Blood Group Protocol State
  const [bombayRequests, setBombayRequests] = useState([]);
  const [bombayAuditLogs, setBombayAuditLogs] = useState([]);
  const [selectedBombayReq, setSelectedBombayReq] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [generatedKeyInfo, setGeneratedKeyInfo] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [bombayStatusFilter, setBombayStatusFilter] = useState('ALL');
  const [loadingBombayAction, setLoadingBombayAction] = useState(false);

  // Blood Requests Triage State
  const [selectedBloodRequest, setSelectedBloodRequest] = useState(null);
  const [bloodRequestSearch, setBloodRequestSearch] = useState('');
  const [bloodRequestStatusFilter, setBloodRequestStatusFilter] = useState('ALL');
  const [bloodRequestUrgencyFilter, setBloodRequestUrgencyFilter] = useState('ALL');

  // Load admin data
  const refreshData = async () => {
    setDonorsList(getStoredDonors());
    setHospitalsList(getHospitalsList());
    setAdminSettings(getSettings());

    // Fetch live requests from backend API
    try {
      const res = await fetch('/api/blood-requests');
      if (res.ok) {
        const data = await res.json();
        if (data.requests && data.requests.length > 0) {
          setRequestsList(data.requests.map(mapDatabaseRequest));
        } else {
          setRequestsList(getStoredRequests());
        }
      } else {
        setRequestsList(getStoredRequests());
      }
    } catch (e) {
      setRequestsList(getStoredRequests());
    }

    try {
      const bReqs = await getAdminBombayRequests();
      setBombayRequests(bReqs || []);
      const bLogs = await getBombayAuditLogs();
      setBombayAuditLogs(bLogs || []);
    } catch (err) {
      console.warn('Bombay data load error:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleDonorAction = (id, newStatus) => {
    updateDonorAdminStatus(id, newStatus);
    setDonorsList(getStoredDonors());
    showToast(`Donor verification updated to: ${newStatus}`, 'success');
  };

  const handleHospitalAction = (hospitalId, newStatus) => {
    updateHospitalAuthorization(hospitalId, newStatus);
    setHospitalsList(getHospitalsList());
    showToast(`Hospital authorization updated to: ${newStatus}`, 'success');
  };

  const handleRequestAction = async (reqId, newStatus) => {
    try {
      await updateBloodRequestStatus(reqId, newStatus, 'admin');
      showToast(`Request status updated to: ${newStatus}`, 'success');
      await refreshData();
    } catch (err) {
      const updated = requestsList.map((r) =>
        r.id === reqId ? { ...r, status: newStatus } : r
      );
      setRequestsList(updated);
      saveStoredRequests(updated);
      showToast(`Status updated to: ${newStatus}`, 'info');
    }
  };

  const handleBombayAction = async (id, action) => {
    setLoadingBombayAction(true);
    try {
      const res = await performAdminRequestAction(id, action, adminNoteInput);
      if (res.success) {
        showToast(res.message || `Action ${action} executed successfully`, 'success');
        if (action === 'APPROVE' && res.accessKey) {
          setGeneratedKeyInfo({
            accessKey: res.accessKey,
            expiresAt: res.expiresAt,
            requestCode: res.request?.request_code || res.request?.requestCode || selectedBombayReq?.request_code,
          });
        }
        await refreshData();
        if (selectedBombayReq && (selectedBombayReq.id === id || selectedBombayReq.request_code === res.request?.request_code)) {
          setSelectedBombayReq((prev) => ({
            ...prev,
            status: action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action === 'VERIFY' ? 'VERIFIED' : 'UNDER_REVIEW',
            admin_note: adminNoteInput || prev?.admin_note,
          }));
        }
      } else {
        showToast(res.message || 'Action failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setLoadingBombayAction(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    saveSettings(settings);
    showToast('Eligibility rules and rare blood privacy configuration saved.', 'success');
  };

  // Compute live statistics
  const totalDonors = donorsList.length;
  const availableDonors = donorsList.filter((d) => d.availability === 'Available Now').length;
  const eligibleDonors = donorsList.filter((d) => getDonorEligibility(d, settings.eligibilityIntervalDays).isEligible).length;
  const authorizedHospitals = hospitalsList.filter((h) => h.authorizationStatus === 'AUTHORIZED').length;
  const pendingHospitals = hospitalsList.filter((h) => h.authorizationStatus === 'PENDING').length;
  const activeEmergencyRequests = requestsList.filter((r) => r.status === REQUEST_STATUS.PENDING).length;

  // Bombay Protocol pending requests count
  const pendingBombayCount = bombayRequests.filter(
    (r) => r.status === 'PENDING_VERIFICATION' || r.status === 'UNDER_REVIEW'
  ).length;

  // Compute Blood Group distribution
  const bloodGroupDistribution = bloodGroups.map((bg) => {
    const count = donorsList.filter((d) => d.bloodGroup === bg).length;
    const pct = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
    return { group: bg, count, percentage: pct };
  });

  const sidebarLinks = [
    { name: 'Dashboard', icon: LayoutDashboard },
    {
      name: 'Bombay Protocol',
      icon: ShieldAlert,
      badge: pendingBombayCount ? `${pendingBombayCount} New` : null,
      highlight: true,
    },
    { name: 'Donors', icon: Users, badge: donorsList.length },
    { name: 'Hospitals', icon: Building, badge: pendingHospitals ? `${pendingHospitals} New` : null },
    { name: 'Blood Requests', icon: FileSpreadsheet, badge: activeEmergencyRequests || null },
    { name: 'Eligibility & Privacy', icon: Sliders },
    { name: 'System Analytics', icon: BarChart3 },
    { name: 'Email Automation', icon: Mail, badge: 'Resend' },
    { name: 'Admin Roster', icon: Key, badge: '10 Authorized' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-[#0a0a0a] border-r border-[#1e1e1e] p-5 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#141414] border border-[#222222]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] flex items-center justify-center font-bold text-white shadow-[0_0_12px_rgba(229,9,20,0.5)] flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white leading-tight truncate">
                {profile?.full_name || user?.name || 'Admin Console'}
              </h4>
              <p className="text-[11px] text-[#FF2B2B] font-mono truncate">
                {user?.username ? `@${user.username}` : 'Super Administrator'}
                {profile?.sNo ? ` • #0${profile.sNo}` : ''}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarLinks.map((item) => {
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
                    <span className="px-2 py-0.5 rounded-full bg-[#1e1e1e] border border-white/10 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-white/5 mt-6">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              showToast('Admin session signed out successfully.', 'info');
              window.location.href = '/login?type=admin';
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#737373] hover:text-[#FF2B2B] hover:bg-[#18080a] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out ({profile?.full_name?.split(' ')[0] || 'Admin'})</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 p-6 sm:p-10 max-w-7xl overflow-x-hidden">
        
        {/* Header */}
        <div className="pb-8 border-b border-[#1c1c1c]">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            System Operations & Administration
          </h1>
          <p className="text-sm text-[#B0B0B0] mt-1">
            Real-time donor verification, hospital authorization oversight, emergency triage, and clinical privacy controls.
          </p>
        </div>

        {/* ====================================================
            TAB 1: DASHBOARD OVERVIEW
            ==================================================== */}
        {activeTab === 'Dashboard' && (
          <div className="space-y-10 mt-8">
            {/* 4 Dashboard Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm hover:border-[#E50914]/50 transition-all">
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Total Donors</span>
                  <Users className="w-4 h-4 text-[#E50914]" />
                </div>
                <div className="text-3xl font-black text-white">{totalDonors}</div>
                <span className="text-[11px] text-emerald-400 mt-1 block font-medium">100+ fictional profiles loaded</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm hover:border-[#E50914]/50 transition-all">
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Available Donors</span>
                  <Droplet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-400">{availableDonors}</div>
                <span className="text-[11px] text-[#B0B0B0] mt-1 block font-medium">Ready for immediate dispatch</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm hover:border-[#E50914]/50 transition-all">
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Authorized Hospitals</span>
                  <Building className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-3xl font-black text-white">{authorizedHospitals}</div>
                <span className="text-[11px] text-amber-400 mt-1 block font-medium">
                  {pendingHospitals} applications pending review
                </span>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5 shadow-sm hover:border-[#E50914]/50 transition-all">
                <div className="flex items-center justify-between text-xs text-[#B0B0B0] font-bold uppercase tracking-wider mb-2">
                  <span>Emergency Requests</span>
                  <Flame className="w-4 h-4 text-[#FF2B2B]" />
                </div>
                <div className="text-3xl font-black text-[#FF2B2B]">{activeEmergencyRequests}</div>
                <span className="text-[11px] text-[#FF2B2B] mt-1 block font-medium">Needs immediate hospital triage</span>
              </div>
            </div>

            {/* Blood Group Distribution Bar Chart */}
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md">
              <h3 className="text-lg font-bold text-white mb-1">Regional Blood Group Distribution</h3>
              <p className="text-xs text-[#B0B0B0] mb-6">Aggregate donor density across active regional registry</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {bloodGroupDistribution.map((item) => (
                  <div key={item.group} className="bg-[#161616] p-3.5 rounded-2xl border border-white/5 text-center">
                    <span className="text-xs font-mono font-bold text-[#FF2B2B]">{item.group}</span>
                    <div className="text-2xl font-black text-white mt-1">{item.count}</div>
                    <span className="text-[10px] text-[#737373] mt-0.5 block">{item.percentage}% of pool</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Overview Table: Recent Donors */}
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-white">Recent Donor Registrations</h3>
                  <p className="text-xs text-[#B0B0B0]">Review and verify volunteer identity credentials</p>
                </div>
                <button
                  onClick={() => setActiveTab('Donors')}
                  className="text-xs font-bold text-[#FF2B2B] hover:underline"
                >
                  View All ({totalDonors}) →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#B0B0B0]">
                  <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Name</th>
                      <th className="py-3 px-4">Blood Group</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {donorsList.slice(0, 5).map((donor) => (
                      <tr key={donor.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {donor.name}
                          <span className="block text-[10px] text-[#737373] font-normal">{donor.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#1e0a0d] border border-[#E50914]/40 text-[#FF2B2B] font-black">
                            {donor.bloodGroup}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-white font-medium">{donor.district || donor.city}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            donor.adminStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {donor.adminStatus || 'Approved'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDonorAction(donor.id, donor.adminStatus === 'Approved' ? 'Pending' : 'Approved')}
                            className="px-2.5 py-1 rounded-lg bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white text-[10px] font-bold"
                          >
                            Toggle Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB: BOMBAY BLOOD PROTOCOL (Oh / hh)
            ==================================================== */}
        {activeTab === 'Bombay Protocol' && (
          <div className="space-y-8 mt-8 animate-fadeIn">
            {/* Header & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#FF2B2B]" />
                  <span>Restricted Phenotype Management</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Bombay Blood Group (Oh) Protocol Console
                </h3>
                <p className="text-xs text-[#B0B0B0] mt-0.5">
                  Verify acute clinical needs, authenticate hospital credentials, and securely issue 24-hour single-use access keys.
                </p>
              </div>

              <button
                onClick={refreshData}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-300 bg-[#141414] hover:bg-[#1f1f1f] border border-white/10 transition-all self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                <span>Refresh Protocol Data</span>
              </button>
            </div>

            {/* Generated Key Modal / Banner */}
            {generatedKeyInfo && (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-neutral-900/90 to-emerald-950/70 border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)] relative animate-fadeIn">
                <button
                  onClick={() => setGeneratedKeyInfo(null)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Key className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-white">
                        Access Key Issued for Request #{generatedKeyInfo.requestCode}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        24-Hour Expiration
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 max-w-2xl leading-relaxed">
                      This one-time access key has been generated and stored as a SHA-256 hash. Transmit this key directly to the verified hospital administrator. The key will automatically expire at{' '}
                      <strong className="text-white">
                        {new Date(generatedKeyInfo.expiresAt).toLocaleString()}
                      </strong>.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="px-5 py-3 rounded-xl bg-black/80 border border-emerald-500/40 font-mono text-xl font-black text-emerald-400 tracking-wider select-all shadow-inner">
                        {generatedKeyInfo.accessKey}
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedKeyInfo.accessKey);
                          setKeyCopied(true);
                          setTimeout(() => setKeyCopied(false), 3000);
                        }}
                        className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg"
                      >
                        {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{keyCopied ? 'Copied to Clipboard!' : 'Copy Access Key'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Protocol Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">
                  Pending Verification
                </div>
                <div className="text-3xl font-black text-amber-400">
                  {bombayRequests.filter((r) => r.status === 'PENDING_VERIFICATION' || r.status === 'UNDER_REVIEW').length}
                </div>
                <span className="text-[11px] text-amber-400/80 mt-1 block">Awaiting medical & identity validation</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">
                  Approved & Keys Active
                </div>
                <div className="text-3xl font-black text-emerald-400">
                  {bombayRequests.filter((r) => r.status === 'APPROVED').length}
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 block">Active hospital authorization tokens</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">
                  Total Tracked Requests
                </div>
                <div className="text-3xl font-black text-white">{bombayRequests.length}</div>
                <span className="text-[11px] text-neutral-400 mt-1 block">All-time rare requests recorded</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] rounded-2xl p-5">
                <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-1">
                  Security Audit Logs
                </div>
                <div className="text-3xl font-black text-[#FF2B2B]">{bombayAuditLogs.length}</div>
                <span className="text-[11px] text-neutral-400 mt-1 block">Logged administrative events</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-2">Filter:</span>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((filterVal) => (
                <button
                  key={filterVal}
                  onClick={() => setBombayStatusFilter(filterVal)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    bombayStatusFilter === filterVal
                      ? 'bg-[#E50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.4)]'
                      : 'bg-[#141414] text-neutral-400 hover:text-white border border-white/5'
                  }`}
                >
                  {filterVal}
                </button>
              ))}
            </div>

            {/* Requests Table */}
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B0B0B0]">
                <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Request ID & Patient</th>
                    <th className="py-3.5 px-4">Hospital & District</th>
                    <th className="py-3.5 px-4">Units / Urgency</th>
                    <th className="py-3.5 px-4">Requester Contact</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bombayRequests
                    .filter((r) => {
                      if (bombayStatusFilter === 'PENDING') {
                        return r.status === 'PENDING_VERIFICATION' || r.status === 'UNDER_REVIEW';
                      }
                      if (bombayStatusFilter === 'APPROVED') {
                        return r.status === 'APPROVED' || r.status === 'FULFILLED';
                      }
                      if (bombayStatusFilter === 'REJECTED') {
                        return r.status === 'REJECTED';
                      }
                      return true;
                    })
                    .map((req) => {
                      const isPending = req.status === 'PENDING_VERIFICATION' || req.status === 'UNDER_REVIEW';
                      const isApproved = req.status === 'APPROVED';
                      const isRejected = req.status === 'REJECTED';

                      return (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <span className="text-[10px] text-red-400 font-mono block">
                              {req.request_code || req.requestCode}
                            </span>
                            {req.patient_name || req.patientName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-white font-medium block">
                              {req.hospital_name || req.hospitalName}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {req.district}, {req.city || req.hospital_location || req.hospitalLocation || 'TN'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-white font-bold block">
                              {req.units_required || req.unitsRequired} Unit(s)
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                (req.urgency || '').toLowerCase().includes('critical') ||
                                (req.urgency || '').toLowerCase().includes('immediate')
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {req.urgency || 'Urgent'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#B0B0B0]">
                            <span className="text-white block font-sans font-medium">
                              {req.requester_name || req.requesterName}
                            </span>
                            {req.phone}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isApproved
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : isRejected
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedBombayReq(req);
                                setAdminNoteInput(req.admin_note || '');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[11px] border border-white/10 transition-all inline-flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-neutral-300" />
                              <span>Review & Action</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {bombayRequests.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-neutral-500 text-xs">
                        No Bombay Blood requests recorded in the protocol registry yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Audit Log Stream Section */}
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-bold text-white">Bombay Protocol Audit Trail</h4>
                  <p className="text-xs text-[#737373]">
                    Immutable log of all Bombay request reviews, token generations, and hospital accesses.
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  {bombayAuditLogs.length} Events Logged
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#B0B0B0]">
                  <thead className="text-[10px] uppercase tracking-wider bg-[#161616] text-neutral-400 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Actor / Performer</th>
                      <th className="py-2.5 px-3">Request Code</th>
                      <th className="py-2.5 px-3 rounded-r-xl">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {bombayAuditLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-neutral-400">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-300 font-sans">{log.actor}</td>
                        <td className="py-2.5 px-3 text-red-400">{log.request_code || '—'}</td>
                        <td className="py-2.5 px-3 text-neutral-400 font-sans max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    ))}
                    {bombayAuditLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-neutral-600 text-xs">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Review & Action Modal for Selected Bombay Request */}
        {selectedBombayReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#111111] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Review Bombay Request #{selectedBombayReq.request_code || selectedBombayReq.requestCode}
                    </h3>
                    <p className="text-xs text-neutral-400">Clinical Verification & Key Generation</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBombayReq(null)}
                  className="p-2 rounded-xl bg-neutral-900 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Details */}
              <div className="space-y-4 py-5 text-xs text-neutral-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Patient & Requirement</span>
                    <div className="text-sm font-bold text-white">
                      {selectedBombayReq.patient_name || selectedBombayReq.patientName}
                    </div>
                    <div className="text-neutral-400">
                      Units: <strong className="text-white">{selectedBombayReq.units_required || selectedBombayReq.unitsRequired}</strong> | Urgency: <strong className="text-red-400">{selectedBombayReq.urgency}</strong>
                    </div>
                    <div className="text-neutral-400">
                      Required by: <strong className="text-white">{selectedBombayReq.required_date || selectedBombayReq.requiredDate}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Hospital & District</span>
                    <div className="text-sm font-bold text-white">
                      {selectedBombayReq.hospital_name || selectedBombayReq.hospitalName}
                    </div>
                    <div className="text-neutral-400">
                      District: <strong className="text-white">{selectedBombayReq.district}</strong>
                    </div>
                    <div className="text-neutral-400">
                      Doctor/Nodal: <strong className="text-white">{selectedBombayReq.doctor_contact || selectedBombayReq.doctorContact || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Requester Credentials</span>
                  <div className="flex flex-wrap items-center gap-4 text-neutral-200">
                    <div>Name: <strong className="text-white">{selectedBombayReq.requester_name || selectedBombayReq.requesterName}</strong></div>
                    <div>Phone: <strong className="text-white">{selectedBombayReq.phone}</strong></div>
                    <div>Email: <strong className="text-white">{selectedBombayReq.email || 'N/A'}</strong></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Clinical Reason / Diagnosis</span>
                  <p className="text-neutral-200 leading-relaxed">
                    {selectedBombayReq.reason || 'Urgent transfusion requirement.'}
                  </p>
                </div>

                {/* Admin Verification Note */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Administrative Verification Notes & Logs:
                  </label>
                  <textarea
                    rows="3"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Enter clinical check details, doctor verification verification notes, hospital ID confirm, etc..."
                    className="w-full bg-[#161616] border border-[#2e2e2e] focus:border-red-500 rounded-xl p-3 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Current Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white">
                    {selectedBombayReq.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    disabled={loadingBombayAction}
                    onClick={() => handleBombayAction(selectedBombayReq.id, 'REJECT')}
                    className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 font-bold text-xs transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    disabled={loadingBombayAction}
                    onClick={() => handleBombayAction(selectedBombayReq.id, 'REQUEST_INFO')}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-all disabled:opacity-50"
                  >
                    Request Info
                  </button>

                  <button
                    disabled={loadingBombayAction}
                    onClick={() => handleBombayAction(selectedBombayReq.id, 'VERIFY')}
                    className="px-3.5 py-2 rounded-xl bg-sky-950/60 hover:bg-sky-900 border border-sky-500/30 text-sky-300 font-bold text-xs transition-all disabled:opacity-50"
                  >
                    Mark Verified
                  </button>

                  <button
                    disabled={loadingBombayAction}
                    onClick={() => handleBombayAction(selectedBombayReq.id, 'APPROVE')}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Approve & Generate Key</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 2: DONOR MANAGEMENT
            ==================================================== */}
        {activeTab === 'Donors' && (
          <div className="space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Donor Directory Management</h3>
                <p className="text-xs text-[#B0B0B0] mt-0.5">Manage voluntary registrations, verify credentials, and view consent levels.</p>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Filter donor name or district..."
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                  className="w-full bg-[#161616] border border-[#333] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
                />
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B0B0B0]">
                <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">ID & Name</th>
                    <th className="py-3.5 px-4">Blood Group</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Contact (Consent)</th>
                    <th className="py-3.5 px-4">Eligibility</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {donorsList
                    .filter((d) =>
                      d.name.toLowerCase().includes(donorSearch.toLowerCase()) ||
                      (d.district || d.city || '').toLowerCase().includes(donorSearch.toLowerCase())
                    )
                    .slice(0, 15)
                    .map((donor) => {
                      const elig = getDonorEligibility(donor, settings.eligibilityIntervalDays);
                      return (
                        <tr key={donor.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <span className="text-[10px] text-[#737373] font-mono block">{donor.id}</span>
                            {donor.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-[#1e0a0d] border border-[#E50914]/40 text-[#FF2B2B] font-black">
                              {donor.bloodGroup}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-white font-medium block">{donor.district || donor.city}</span>
                            <span className="text-[10px] text-[#737373]">{donor.state || 'Tamil Nadu'}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[#B0B0B0]">
                            {donor.fullPhone || donor.phone}
                            <span className="text-[9px] block text-emerald-400 font-sans">
                              {donor.consentSettings?.shareWithHospitals ? '✓ Hospital Sharing ON' : '✗ Private'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold ${elig.isEligible ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {elig.isEligible ? 'Eligible' : 'Cooling'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              donor.adminStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {donor.adminStatus || 'Approved'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleDonorAction(donor.id, 'Approved')}
                                className="p-1 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors"
                                title="Approve"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDonorAction(donor.id, 'Rejected')}
                                className="p-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white transition-colors"
                                title="Reject / Revoke"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 3: HOSPITAL AUTHORIZATION MANAGEMENT
            ==================================================== */}
        {activeTab === 'Hospitals' && (
          <div className="space-y-6 mt-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Hospital Authorization Console</h3>
              <p className="text-xs text-[#B0B0B0] mt-0.5">
                Review clinical accreditations, grant or revoke Hospital Access Keys.
              </p>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B0B0B0]">
                <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Hospital & ID</th>
                    <th className="py-3.5 px-4">License No</th>
                    <th className="py-3.5 px-4">District</th>
                    <th className="py-3.5 px-4">Nodal Officer</th>
                    <th className="py-3.5 px-4">Authorization</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {hospitalsList.map((hosp) => (
                    <tr key={hosp.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="text-[10px] text-[#737373] font-mono block">{hosp.hospitalId}</span>
                        {hosp.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-white">{hosp.licenseNumber}</td>
                      <td className="py-3.5 px-4 text-white font-medium">{hosp.district}, {hosp.state}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-white block">{hosp.nodalOfficer}</span>
                        <span className="text-[10px] text-[#737373] font-mono">{hosp.contactPhone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          hosp.authorizationStatus === 'AUTHORIZED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {hosp.authorizationStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {hosp.authorizationStatus !== 'AUTHORIZED' ? (
                            <button
                              onClick={() => handleHospitalAction(hosp.id, 'AUTHORIZED')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all"
                            >
                              Grant Authorization
                            </button>
                          ) : (
                            <button
                              onClick={() => handleHospitalAction(hosp.id, 'REJECTED')}
                              className="px-3 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-[11px] font-bold transition-all"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 4: BLOOD REQUESTS TRIAGE
            ==================================================== */}
        {/* ====================================================
            TAB 4: BLOOD REQUESTS TRIAGE & MONITORING
            ==================================================== */}
        {activeTab === 'Blood Requests' && (
          <div className="space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Blood Request Triage & Dispatch</h3>
                <p className="text-xs text-[#B0B0B0] mt-0.5">Live emergency alerts, automated donor matching lifecycle, and hospital tickets.</p>
              </div>
              <button
                onClick={refreshData}
                className="px-4 py-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 self-start"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#FF2B2B]" />
                <span>Refresh Live Requests</span>
              </button>
            </div>

            {/* Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#111111] border border-[#222222]">
                <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider block">Total Requests</span>
                <span className="text-2xl font-black text-white mt-1 block">{requestsList.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#111111] border border-[#222222]">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Active Triage</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block">
                  {requestsList.filter(r => ['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'Open'].includes(r.status)).length}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#111111] border border-[#222222]">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">Emergency / Critical</span>
                <span className="text-2xl font-black text-[#FF2B2B] mt-1 block">
                  {requestsList.filter(r => r.urgency === 'Emergency' || r.emergencyLevel === 'Critical').length}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#111111] border border-[#222222]">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Fulfilled</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  {requestsList.filter(r => ['FULFILLED', 'Fulfilled'].includes(r.status)).length}
                </span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111111] border border-[#222222]">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Filter by ticket code (BR-2026-...), patient, hospital, district..."
                  value={bloodRequestSearch}
                  onChange={(e) => setBloodRequestSearch(e.target.value)}
                  className="w-full bg-[#161616] border border-[#333] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-[#E50914]"
                />
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Status Filter */}
                <select
                  value={bloodRequestStatusFilter}
                  onChange={(e) => setBloodRequestStatusFilter(e.target.value)}
                  className="bg-[#161616] border border-[#333] text-white rounded-xl px-3 py-2 outline-none font-bold text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="MATCHING">Matching</option>
                  <option value="DONOR_CONTACTED">Donor Contacted</option>
                  <option value="DONOR_ACCEPTED">Donor Accepted</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                </select>

                {/* Urgency Filter */}
                <select
                  value={bloodRequestUrgencyFilter}
                  onChange={(e) => setBloodRequestUrgencyFilter(e.target.value)}
                  className="bg-[#161616] border border-[#333] text-white rounded-xl px-3 py-2 outline-none font-bold text-xs"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B0B0B0]">
                <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Ticket & Patient</th>
                    <th className="py-3.5 px-4">Blood Needed</th>
                    <th className="py-3.5 px-4">Hospital & District</th>
                    <th className="py-3.5 px-4">Urgency</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Action & Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requestsList
                    .filter((req) => {
                      const q = bloodRequestSearch.toLowerCase().trim();
                      const matchesSearch = !q || (
                        (req.patientName || req.patient || '').toLowerCase().includes(q) ||
                        (req.requestCode || req.code || req.id || '').toLowerCase().includes(q) ||
                        (req.hospitalName || req.hospital || '').toLowerCase().includes(q) ||
                        (req.district || req.city || '').toLowerCase().includes(q) ||
                        (req.bloodGroup || '').toLowerCase().includes(q)
                      );
                      const currentStatus = (req.status || 'PENDING').toUpperCase();
                      const matchesStatus = bloodRequestStatusFilter === 'ALL' || currentStatus === bloodRequestStatusFilter.toUpperCase();
                      const currentUrgency = (req.urgency || (req.emergencyLevel === 'Critical' ? 'Emergency' : 'Urgent')).toUpperCase();
                      const matchesUrgency = bloodRequestUrgencyFilter === 'ALL' || currentUrgency === bloodRequestUrgencyFilter.toUpperCase();
                      return matchesSearch && matchesStatus && matchesUrgency;
                    })
                    .map((req) => {
                      const displayStatus = (req.status || 'PENDING').toUpperCase();
                      const isEmergency = req.urgency === 'Emergency' || req.emergencyLevel === 'Critical';

                      return (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <span className="text-[10px] text-red-400 font-mono block">
                              {req.requestCode || req.code || req.id}
                            </span>
                            {req.patientName || req.patient}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-[#1e0a0d] border border-[#E50914]/40 text-[#FF2B2B] font-black inline-block">
                              {req.unitsRequired || req.units} Units • {req.bloodGroup}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-white block font-medium">{req.hospitalName || req.hospital}</span>
                            <span className="text-[10px] text-[#737373]">{req.district || req.city}, TN</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isEmergency ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            }`}>
                              {req.urgency || req.emergencyLevel || 'Urgent'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ['FULFILLED', 'Fulfilled'].includes(req.status)
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : req.status === 'DONOR_ACCEPTED'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : req.status === 'DONOR_CONTACTED'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                                : req.status === 'MATCHING'
                                ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30'
                                : ['CANCELLED', 'Cancelled', 'EXPIRED'].includes(req.status)
                                ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => setSelectedBloodRequest(req)}
                                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[11px] border border-white/10 transition-all inline-flex items-center gap-1.5"
                                title="Review visual timeline and donor matches"
                              >
                                <Eye className="w-3.5 h-3.5 text-red-400" />
                                <span>Track & Matches</span>
                              </button>
                              <select
                                value={req.status}
                                onChange={(e) => handleRequestAction(req.id, e.target.value)}
                                className="bg-[#161616] border border-[#333] text-white text-[10px] rounded-xl px-2 py-1.5 outline-none font-bold"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="MATCHING">MATCHING</option>
                                <option value="DONOR_CONTACTED">DONOR_CONTACTED</option>
                                <option value="DONOR_ACCEPTED">DONOR_ACCEPTED</option>
                                <option value="FULFILLED">FULFILLED</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="EXPIRED">EXPIRED</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {requestsList.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-neutral-500 text-xs">
                        No blood requests found in registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 5: ELIGIBILITY RULES & RARE BLOOD SETTINGS
            ==================================================== */}
        {activeTab === 'Eligibility & Privacy' && (
          <div className="space-y-6 mt-8 max-w-2xl">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Clinical Eligibility & Rare Blood Rules</h3>
              <p className="text-xs text-[#B0B0B0] mt-0.5">Configure voluntary cooling periods and confidential rare group protections.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-[#111111] border border-[#222222] rounded-3xl p-6 sm:p-8 space-y-6">
              {/* Donation Interval */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1.5">
                  Minimum Donation Interval (Days) *
                </label>
                <input
                  type="number"
                  min="30"
                  max="180"
                  value={settings.eligibilityIntervalDays}
                  onChange={(e) => setAdminSettings({ ...settings, eligibilityIntervalDays: parseInt(e.target.value) || 90 })}
                  className="w-full bg-[#161616] border border-[#333] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white outline-none font-mono"
                />
                <span className="text-[11px] text-[#737373] mt-1 block">
                  Standard national guideline is 90 days (3 months) for voluntary donors.
                </span>
              </div>

              {/* Rare Blood Privacy Toggle */}
              <div className="pt-4 border-t border-white/5 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Rare Blood Group Privacy Protocol</h4>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">
                    Automatically mask identities and personal phone numbers for rare blood donors in public searches.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.rareBloodPrivacyEnabled}
                  onChange={(e) => setAdminSettings({ ...settings, rareBloodPrivacyEnabled: e.target.checked })}
                  className="w-5 h-5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer mt-0.5"
                />
              </div>

              {/* Masked Contact Enforcement */}
              <div className="pt-4 border-t border-white/5 flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Enforce Public Contact Masking</h4>
                  <p className="text-xs text-[#B0B0B0] mt-0.5">
                    Require consent-based donation request workflow before unlocking direct phone access.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.maskedContactEnforced}
                  onChange={(e) => setAdminSettings({ ...settings, maskedContactEnforced: e.target.checked })}
                  className="w-5 h-5 rounded border-[#333] text-[#E50914] focus:ring-[#E50914] bg-[#161616] cursor-pointer mt-0.5"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-xs font-bold text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all"
              >
                Save Configuration Changes
              </button>
            </form>
          </div>
        )}

        {/* ====================================================
            TAB 6: SYSTEM ANALYTICS
            ==================================================== */}
        {activeTab === 'System Analytics' && (
          <div className="space-y-6 mt-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">System Performance Analytics</h3>
              <p className="text-xs text-[#B0B0B0] mt-0.5">Platform engagement and voluntary donation resolution metrics.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-[#111111] border border-[#222222] p-5 rounded-2xl">
                <span className="text-xs text-[#737373] uppercase block font-bold">Eligibility Rate</span>
                <div className="text-3xl font-black text-emerald-400 mt-2">
                  {totalDonors > 0 ? Math.round((eligibleDonors / totalDonors) * 100) : 0}%
                </div>
                <span className="text-[11px] text-[#B0B0B0] mt-1 block">Active donors eligible to donate immediately</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] p-5 rounded-2xl">
                <span className="text-xs text-[#737373] uppercase block font-bold">Tamil Nadu Regional Density</span>
                <div className="text-3xl font-black text-white mt-2">82%</div>
                <span className="text-[11px] text-[#B0B0B0] mt-1 block">Concentration in Karur, Chennai, Coimbatore</span>
              </div>

              <div className="bg-[#111111] border border-[#222222] p-5 rounded-2xl">
                <span className="text-xs text-[#737373] uppercase block font-bold">Resolution Success Rate</span>
                <div className="text-3xl font-black text-[#FF2B2B] mt-2">94%</div>
                <span className="text-[11px] text-[#B0B0B0] mt-1 block">Emergency requests matched within 2 hours</span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 7: EMAIL AUTOMATION (RESEND TEST)
            ==================================================== */}
        {activeTab === 'Email Automation' && (
          <div className="mt-8">
            <EmailAutomationTestPanel />
          </div>
        )}

        {/* ====================================================
            TAB 8: AUTHORIZED ADMINISTRATOR ROSTER
            ==================================================== */}
        {activeTab === 'Admin Roster' && (
          <div className="space-y-6 mt-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Official Specification Roster</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Authorized Administrator Directory
                </h3>
                <p className="text-xs text-[#B0B0B0] mt-0.5">
                  The 10 designated project administrators authorized for system management and clinical triage.
                </p>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#141414] border border-white/10 text-xs text-zinc-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Session: <strong className="text-white">{profile?.full_name || 'Admin'}</strong></span>
              </div>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#B0B0B0]">
                  <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4 font-mono">S.No</th>
                      <th className="py-3.5 px-4">Admin Name</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Designation</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Role Clearance</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ADMIN_ACCOUNTS.map((acc) => {
                      const isCurrent = user?.username === acc.username || profile?.username === acc.username;
                      return (
                        <tr
                          key={acc.id}
                          className={`transition-colors ${
                            isCurrent
                              ? 'bg-amber-500/[0.08] border-l-2 border-l-amber-500'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            #{acc.sNo < 10 ? `0${acc.sNo}` : acc.sNo}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{acc.name}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                  CURRENT USER
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 block font-mono font-normal">
                              {acc.email}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-zinc-300">
                            @{acc.username}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            {acc.designation}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400">
                            {acc.department}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[#FF2B2B] font-mono text-[10px] font-bold">
                              {acc.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Authorized
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Blood Request Lifecycle Details Modal */}
      {selectedBloodRequest && (
        <RequestDetailsModal
          isOpen={Boolean(selectedBloodRequest)}
          onClose={() => setSelectedBloodRequest(null)}
          requestCode={selectedBloodRequest.requestCode || selectedBloodRequest.code}
          requestId={selectedBloodRequest.id}
          onStatusChanged={refreshData}
        />
      )}
    </div>
  );
}
