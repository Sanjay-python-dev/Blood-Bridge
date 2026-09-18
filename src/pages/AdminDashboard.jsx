import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { getStoredDonors, updateDonorAdminStatus } from '../services/donorService';
import { getHospitalsList, updateHospitalAuthorization } from '../services/hospitalService';
import { getStoredRequests, saveStoredRequests, REQUEST_STATUS } from '../services/requestService';
import { getSettings, saveSettings } from '../services/settingsService';
import { getDonorEligibility } from '../services/eligibilityService';
import { bloodGroups } from '../data/mockData';
import { showToast } from '../components/Toast';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [donorsList, setDonorsList] = useState([]);
  const [hospitalsList, setHospitalsList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [settings, setAdminSettings] = useState(getSettings());
  const [donorSearch, setDonorSearch] = useState('');

  // Load admin data
  const refreshData = () => {
    setDonorsList(getStoredDonors());
    setHospitalsList(getHospitalsList());
    setRequestsList(getStoredRequests());
    setAdminSettings(getSettings());
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

  const handleRequestAction = (reqId, newStatus) => {
    const updated = requestsList.map((r) =>
      r.id === reqId ? { ...r, status: newStatus } : r
    );
    setRequestsList(updated);
    saveStoredRequests(updated);
    showToast(`Emergency request status updated to: ${newStatus}`, 'success');
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

  // Compute Blood Group distribution
  const bloodGroupDistribution = bloodGroups.map((bg) => {
    const count = donorsList.filter((d) => d.bloodGroup === bg).length;
    const pct = totalDonors > 0 ? Math.round((count / totalDonors) * 100) : 0;
    return { group: bg, count, percentage: pct };
  });

  const sidebarLinks = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Donors', icon: Users, badge: donorsList.length },
    { name: 'Hospitals', icon: Building, badge: pendingHospitals ? `${pendingHospitals} New` : null },
    { name: 'Blood Requests', icon: FileSpreadsheet, badge: activeEmergencyRequests || null },
    { name: 'Eligibility & Privacy', icon: Sliders },
    { name: 'System Analytics', icon: BarChart3 },
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
            <div>
              <h4 className="text-sm font-bold text-white leading-tight">Admin Console</h4>
              <p className="text-[11px] text-[#FF2B2B] font-mono">Super Administrator</p>
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
          <Link
            to="/login"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#737373] hover:text-[#FF2B2B] hover:bg-[#18080a] transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Admin</span>
          </Link>
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
        {activeTab === 'Blood Requests' && (
          <div className="space-y-6 mt-8">
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Emergency Blood Request Triage</h3>
              <p className="text-xs text-[#B0B0B0] mt-0.5">Direct hospital emergency alerts and dispatch tickets.</p>
            </div>

            <div className="bg-[#111111] border border-[#222222] rounded-3xl p-6 shadow-md overflow-x-auto">
              <table className="w-full text-left text-xs text-[#B0B0B0]">
                <thead className="text-[11px] uppercase tracking-wider bg-[#161616] text-white border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 rounded-l-xl">Ticket & Patient</th>
                    <th className="py-3.5 px-4">Blood Needed</th>
                    <th className="py-3.5 px-4">Hospital & City</th>
                    <th className="py-3.5 px-4">Urgency</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requestsList.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="text-[10px] text-[#737373] font-mono block">{req.id}</span>
                        {req.patient}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[#1e0a0d] border border-[#E50914]/40 text-[#FF2B2B] font-black">
                          {req.units} Units • {req.bloodGroup}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-white block">{req.hospital}</span>
                        <span className="text-[10px] text-[#737373]">{req.city}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.emergencyLevel === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {req.emergencyLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.status === 'FULFILLED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={req.status}
                          onChange={(e) => handleRequestAction(req.id, e.target.value)}
                          className="bg-[#161616] border border-[#333] text-white text-[10px] rounded-lg px-2 py-1 outline-none font-bold"
                        >
                          <option value={REQUEST_STATUS.PENDING}>Pending</option>
                          <option value="DISPATCHED">Dispatched</option>
                          <option value={REQUEST_STATUS.COMPLETED}>Fulfilled</option>
                          <option value={REQUEST_STATUS.CANCELLED}>Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
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

      </main>
    </div>
  );
}
