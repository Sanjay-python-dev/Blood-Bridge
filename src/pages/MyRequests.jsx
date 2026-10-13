import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Flame,
  User,
  Loader2,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserBloodRequests, REQUEST_STATUS } from '../services/requestService';
import RequestDetailsModal from '../components/RequestDetailsModal';
import { bloodGroups } from '../data/mockData';

export default function MyRequests() {
  const { user, profile } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedUrgency, setSelectedUrgency] = useState('All');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected request for details modal
  const [selectedRequestCode, setSelectedRequestCode] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserBloodRequests(user?.id);
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching my blood requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Statistics calculation
  const totalCount = requests.length;
  const activeCount = requests.filter(r =>
    ['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'Open'].includes(r.status)
  ).length;
  const acceptedCount = requests.filter(r =>
    ['DONOR_ACCEPTED', 'FULFILLED', 'Fulfilled'].includes(r.status)
  ).length;
  const emergencyCount = requests.filter(r =>
    r.urgency === 'Emergency' || r.emergencyLevel === 'Critical'
  ).length;

  // Filter requests
  const filteredRequests = requests.filter(req => {
    // Status Filter
    if (selectedStatus !== 'All') {
      const s = (req.status || '').toUpperCase();
      const target = selectedStatus.toUpperCase();
      if (target === 'ACTIVE') {
        if (!['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'OPEN'].includes(s)) return false;
      } else if (target === 'PENDING' || target === 'MATCHING') {
        if (s !== 'PENDING' && s !== 'MATCHING' && s !== 'OPEN') return false;
      } else if (target === 'ACCEPTED') {
        if (s !== 'DONOR_ACCEPTED') return false;
      } else if (target === 'FULFILLED') {
        if (s !== 'FULFILLED') return false;
      } else if (target === 'CANCELLED') {
        if (s !== 'CANCELLED') return false;
      } else if (target === 'EXPIRED') {
        if (s !== 'EXPIRED') return false;
      }
    }

    // Urgency Filter
    if (selectedUrgency !== 'All') {
      const u = (req.urgency || '').toLowerCase();
      if (u !== selectedUrgency.toLowerCase()) return false;
    }

    // Blood Group Filter
    if (selectedGroup !== 'All Groups') {
      if (req.bloodGroup !== selectedGroup) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = (req.requestCode || req.id || '').toLowerCase().includes(q);
      const matchPatient = (req.patientName || req.patient || '').toLowerCase().includes(q);
      const matchHospital = (req.hospitalName || req.hospital || '').toLowerCase().includes(q);
      const matchDistrict = (req.district || req.city || '').toLowerCase().includes(q);
      if (!matchCode && !matchPatient && !matchHospital && !matchDistrict) return false;
    }

    return true;
  });

  const handleOpenDetails = (code) => {
    setSelectedRequestCode(code);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a080a] border border-[#E50914]/30 text-[#E50914] text-xs font-bold uppercase tracking-wider mb-3">
              <Heart className="w-3.5 h-3.5" />
              <span>Blood Seekers Portal</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              My Blood <span className="text-[#E50914]">Requests</span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#8E8E93] max-w-2xl">
              Track live donor matching, hospital coordination status, and contact voluntary blood lifesavers in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/request-blood"
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#FF2B2B]" />
              <span>Request Blood</span>
            </Link>

            <Link
              to="/request-blood?urgency=Emergency"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] text-white font-black text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(229,9,20,0.6)] hover:shadow-[0_0_40px_rgba(229,9,20,0.9)] transition-all transform hover:-translate-y-0.5"
            >
              <Flame className="w-4 h-4 animate-pulse" />
              <span>Emergency Blood Request</span>
            </Link>
          </div>
        </div>

        {/* Dashboard Statistics Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <div className="glass-lvl2 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
              Total Requests
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalCount}
            </div>
            <span className="text-[10px] text-[#737373] mt-1 block">Lifetime tickets submitted</span>
          </div>

          <div className="glass-lvl2 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
              Active / Matching
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#FF2B2B] mt-1">
              {activeCount}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 block">Live in regional queues</span>
          </div>

          <div className="glass-lvl2 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
              Donors Accepted
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {acceptedCount}
            </div>
            <span className="text-[10px] text-[#737373] mt-1 block">Connections approved</span>
          </div>

          <div className="glass-lvl2 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block">
              Emergency Priority
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#FF2B2B] mt-1">
              {emergencyCount}
            </div>
            <span className="text-[10px] text-[#737373] mt-1 block">Critical urgency status</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="glass-lvl2 border border-white/15 rounded-3xl p-5 sm:p-6 mb-8 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div>
              <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                Search Requests
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ticket code, patient, hospital..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-[#555] outline-none transition-colors"
                />
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                Lifecycle Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-xs text-white font-medium outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active (Matching & In-Progress)</option>
                <option value="Pending">Matching Donors</option>
                <option value="Accepted">Donor Accepted</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div>
              <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                Urgency Level
              </label>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-xs text-white font-medium outline-none cursor-pointer"
              >
                <option value="All">All Urgencies</option>
                <option value="Emergency">🚨 Emergency</option>
                <option value="Urgent">🟠 Urgent</option>
                <option value="Planned">🟢 Planned / Scheduled</option>
              </select>
            </div>

            {/* Blood Group Filter */}
            <div>
              <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">
                Blood Group
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-[#14141a] border border-[#2e2e38] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none cursor-pointer"
              >
                <option value="All Groups">All Groups</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#8E8E93]">
            <span>
              Showing <strong className="text-white">{filteredRequests.length}</strong> of {totalCount} request(s)
            </span>
            {(selectedStatus !== 'All' || selectedUrgency !== 'All' || selectedGroup !== 'All Groups' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStatus('All');
                  setSelectedUrgency('All');
                  setSelectedGroup('All Groups');
                  setSearchQuery('');
                }}
                className="text-[#FF2B2B] hover:underline font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Requests Cards List */}
        {loading ? (
          <div className="py-24 text-center text-[#8E8E93]">
            <Loader2 className="w-10 h-10 animate-spin text-[#E50914] mx-auto mb-3" />
            <p className="text-xs uppercase tracking-wider font-semibold">Loading your blood requests...</p>
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => {
              const isEmergency = req.urgency === 'Emergency' || req.emergencyLevel === 'Critical';
              const isFulfilled = req.status === 'FULFILLED' || req.status === 'Fulfilled';
              const isCancelled = req.status === 'CANCELLED';
              const isExpired = req.status === 'EXPIRED';

              return (
                <div
                  key={req.id}
                  className={`glass-lvl2 border rounded-3xl p-6 transition-all duration-300 relative flex flex-col justify-between hover:border-[#E50914]/50 shadow-[0_10px_30px_rgba(0,0,0,0.6)] ${
                    isEmergency
                      ? 'border-[#E50914]/40 bg-gradient-to-b from-[#19080a] to-[#0c0c10]'
                      : 'border-white/10'
                  }`}
                >
                  {/* Top Highlight Line */}
                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-3xl ${
                    isEmergency
                      ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse'
                      : isFulfilled
                      ? 'bg-emerald-500'
                      : isCancelled
                      ? 'bg-zinc-600'
                      : 'bg-white/20'
                  }`} />

                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-[#8E8E93] block">
                          {req.requestCode || req.id}
                        </span>
                        <h4 className="text-base font-bold text-white mt-0.5 leading-tight">
                          {req.patientName || req.patient}
                        </h4>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isEmergency
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                            : req.urgency === 'Urgent'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {req.urgency || 'Urgent'}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isFulfilled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : isCancelled
                            ? 'bg-zinc-700/40 text-zinc-400 border border-zinc-600/30'
                            : isExpired
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                        }`}>
                          {req.status || 'MATCHING'}
                        </span>
                      </div>
                    </div>

                    {/* Blood Requirement Feature Box */}
                    <div className="bg-[#14141c] border border-white/5 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF2B2B] to-[#990000] text-white font-black text-lg flex items-center justify-center shadow-md">
                          {req.bloodGroup}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">Units Needed</span>
                          <strong className="text-white text-base">{req.unitsRequired || req.units} Unit(s)</strong>
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <span className="text-[10px] text-[#737373] block">Required Date</span>
                        <strong className="text-white block font-medium mt-0.5">{req.requiredDate || 'Immediate'}</strong>
                      </div>
                    </div>

                    {/* Hospital & Location */}
                    <div className="space-y-1.5 text-xs text-[#8E8E93] mb-5">
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Building className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                        <span className="truncate">{req.hospitalName || req.hospital}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#737373] flex-shrink-0" />
                        <span>{req.city}, {req.district}</span>
                      </div>
                      {req.createdAt && (
                        <div className="flex items-center gap-2 text-[11px] text-[#737373]">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Created {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}

                      {/* Requester Contact (Phone & Email) */}
                      {(req.requesterPhone || req.phone || req.contactPhone || req.contactNumber || req.requesterEmail || req.email) && (
                        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-3 text-[11px]">
                          {(req.requesterPhone || req.phone || req.contactPhone || req.contactNumber) && (
                            <a
                              href={`tel:${String(req.requesterPhone || req.phone || req.contactPhone || req.contactNumber).replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
                              title="Call Requester"
                            >
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span>{req.requesterPhone || req.phone || req.contactPhone || req.contactNumber}</span>
                            </a>
                          )}
                          {(req.requesterEmail || req.email) && (
                            <a
                              href={`mailto:${req.requesterEmail || req.email}`}
                              className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white truncate max-w-[190px] transition-colors"
                              title={req.requesterEmail || req.email}
                            >
                              <Mail className="w-3 h-3 text-[#E50914] flex-shrink-0" />
                              <span className="truncate">{req.requesterEmail || req.email}</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenDetails(req.requestCode || req.id)}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                    >
                      <span>Track Lifecycle & Donors</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20 bg-[#111114] border border-white/10 rounded-3xl p-8 max-w-xl mx-auto shadow-2xl animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center text-[#FF2B2B] mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No blood requests yet.</h3>
            <p className="text-sm text-[#8E8E93] max-w-md mx-auto mb-6 leading-relaxed">
              Create a request when you or a loved one needs blood assistance. BloodBridge will immediately notify verified voluntary donors in your district.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/request-blood"
                className="px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white font-bold text-xs shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
              >
                Create Blood Request
              </Link>
              <Link
                to="/find-blood"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-all"
              >
                Browse Available Donors
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Request Details Modal */}
      {showModal && (
        <RequestDetailsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          requestCode={selectedRequestCode}
          onStatusChanged={loadRequests}
        />
      )}
    </div>
  );
}
