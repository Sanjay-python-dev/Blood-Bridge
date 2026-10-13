import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Building,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Send,
  Loader2,
  ShieldCheck,
  Search,
  Flame,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { getBloodRequestDetails, requestDonorContact, cancelBloodRequest, updateBloodRequestStatus } from '../services/requestService';
import { showToast } from './Toast';

export default function RequestDetailsModal({ isOpen, onClose, requestCode, requestId, onStatusChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [contactingDonorId, setContactingDonorId] = useState(null);

  const identifier = requestCode || requestId;

  useEffect(() => {
    if (!isOpen || !identifier) return;

    let isMounted = true;
    setLoading(true);

    const loadDetails = async () => {
      try {
        const res = await getBloodRequestDetails(identifier);
        if (isMounted && res) {
          setData(res);
        }
      } catch (err) {
        console.error('Error fetching request details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();
    return () => { isMounted = false; };
  }, [isOpen, identifier]);

  if (!isOpen) return null;

  const req = data?.request;
  const matches = data?.matches || [];
  const timeline = data?.timeline || [];

  const isEmergency = req?.urgency === 'Emergency' || req?.emergencyLevel === 'Critical';
  const isCancelled = req?.status === 'CANCELLED';
  const isExpired = req?.status === 'EXPIRED';
  const isFulfilled = req?.status === 'FULFILLED' || req?.status === 'Fulfilled';
  const isActive = !isCancelled && !isExpired && !isFulfilled;

  const handleContactDonor = async (donorId, matchId) => {
    setContactingDonorId(donorId);
    try {
      await requestDonorContact(req.id, donorId, matchId);
      showToast('Donation contact alert sent to voluntary donor.', 'success');
      // Refresh details
      const res = await getBloodRequestDetails(identifier);
      if (res) setData(res);
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      showToast('Could not send contact request. Please try again.', 'error');
    } finally {
      setContactingDonorId(null);
    }
  };

  const handleCancelRequest = async () => {
    setActionLoading(true);
    try {
      await cancelBloodRequest(req.id);
      showToast('Blood request has been cancelled.', 'info');
      setShowCancelConfirm(false);
      const res = await getBloodRequestDetails(identifier);
      if (res) setData(res);
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      showToast('Could not cancel request. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkFulfilled = async () => {
    setActionLoading(true);
    try {
      await updateBloodRequestStatus(req.id, 'FULFILLED');
      showToast('Blood request marked as FULFILLED! Thank you for updating.', 'success');
      const res = await getBloodRequestDetails(identifier);
      if (res) setData(res);
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      showToast('Could not update status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0f0f14] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative max-h-[92vh] overflow-y-auto text-white">
        
        {/* Top edge reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-5 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg flex-shrink-0 ${
              isEmergency
                ? 'bg-gradient-to-br from-[#FF2B2B] to-[#990000] text-white shadow-[0_0_20px_rgba(229,9,20,0.6)] animate-pulse'
                : 'bg-white/10 border border-white/15 text-[#FF2B2B]'
            }`}>
              {req?.bloodGroup || '—'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Request #{req?.requestCode || req?.id || identifier}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isEmergency
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : req?.urgency === 'Urgent'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {req?.urgency || 'Urgent'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isFulfilled
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : isCancelled
                    ? 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30'
                    : isExpired
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                }`}>
                  {req?.status || 'PENDING'}
                </span>
              </div>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Patient: <strong className="text-white">{req?.patientName || req?.patient}</strong> • {req?.unitsRequired || req?.units} Unit(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8E8E93] hover:text-white border border-white/10 transition-colors"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[#8E8E93] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
            <span className="text-xs uppercase tracking-wider font-semibold">Loading Request Lifecycle...</span>
          </div>
        ) : !req ? (
          <div className="py-16 text-center text-[#8E8E93]">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <p className="text-sm">Could not find details for request {identifier}.</p>
          </div>
        ) : (
          <div className="space-y-8 py-6">

            {/* VISUAL STATUS TIMELINE */}
            <div>
              <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#E50914]" />
                <span>Request Progress Timeline</span>
              </h4>

              <div className="grid grid-cols-5 gap-2 relative">
                {/* Connecting track line */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 -z-0" />

                {timeline.map((step, idx) => {
                  const isDone = step.status === 'COMPLETED';
                  const isCurrent = step.status === 'CURRENT';
                  const isFail = step.status === 'CANCELLED' || step.status === 'EXPIRED';

                  return (
                    <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                        isDone
                          ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                          : isCurrent
                          ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.7)] animate-pulse'
                          : isFail
                          ? 'bg-zinc-700 text-zinc-300'
                          : 'bg-[#1a1a22] border border-white/15 text-[#737373]'
                      }`}>
                        {isDone ? '✓' : isCurrent ? '●' : isFail ? '✕' : step.step}
                      </div>
                      <span className={`text-[11px] font-semibold mt-2 leading-tight ${
                        isCurrent ? 'text-[#FF2B2B] font-bold' : isDone ? 'text-white' : 'text-[#737373]'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REQUEST SPECIFICATIONS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Requester Contact Information */}
              <div className="bg-[#15151c] border border-white/10 rounded-2xl p-4 space-y-2.5">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Requester Contact
                </span>
                <div className="flex items-start gap-2.5 text-xs">
                  <User className="w-4 h-4 text-[#E50914] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <strong className="text-white block text-sm truncate">
                      {req.requesterName || req.patientName || 'Blood Requester'}
                    </strong>
                    <span className="text-[#8E8E93] block text-[11px]">
                      {req.district ? `${req.district}, ${req.state || 'Tamil Nadu'}` : 'Verified Requester'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                  {(req.requesterPhone || req.contactPhone || req.phone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <a
                        href={`tel:${(req.requesterPhone || req.contactPhone || req.phone).replace(/\s+/g, '')}`}
                        className="text-white hover:text-emerald-400 transition-colors font-medium text-xs truncate"
                      >
                        {req.requesterPhone || req.contactPhone || req.phone}
                      </a>
                    </div>
                  )}

                  {(req.requesterEmail || req.email || req.contactEmail) && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                      <a
                        href={`mailto:${req.requesterEmail || req.email || req.contactEmail}`}
                        className="text-zinc-300 hover:text-white transition-colors text-xs break-all truncate"
                        title={req.requesterEmail || req.email || req.contactEmail}
                      >
                        {req.requesterEmail || req.email || req.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Hospital & Location */}
              <div className="bg-[#15151c] border border-white/10 rounded-2xl p-4 space-y-2.5">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Hospital & Location
                </span>
                <div className="flex items-start gap-2.5 text-xs">
                  <Building className="w-4 h-4 text-[#E50914] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">{req.hospitalName || req.hospital}</strong>
                    <span className="text-[#8E8E93]">{req.hospitalLocation || req.hospitalAddress || 'Hospital Ward / ICU'}</span>
                    <span className="block text-white mt-1">
                      {req.city}, {req.district} ({req.state || 'Tamil Nadu'})
                    </span>
                  </div>
                </div>

                {req.hospitalContact && (
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-[#8E8E93]">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Hospital: <strong className="text-white">{req.hospitalContact}</strong></span>
                  </div>
                )}
                {req.hospitalEmail && (
                  <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                    <Mail className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                    <a href={`mailto:${req.hospitalEmail}`} className="text-zinc-300 hover:text-white truncate break-all">
                      {req.hospitalEmail}
                    </a>
                  </div>
                )}
              </div>

              {/* Requirement & Clinical Context */}
              <div className="bg-[#15151c] border border-white/10 rounded-2xl p-4 space-y-2.5">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider block">
                  Clinical Details & Timing
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#737373] block">Blood Group</span>
                    <strong className="text-[#FF2B2B] text-base">{req.bloodGroup}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#737373] block">Units Required</span>
                    <strong className="text-white text-base">{req.unitsRequired || req.units} Unit(s)</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#737373] block">Required Date</span>
                    <strong className="text-white">{req.requiredDate || 'Immediate'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#737373] block">Created On</span>
                    <span className="text-[#8E8E93] font-mono text-[11px]">
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {req.reason && (
                  <div className="pt-2 border-t border-white/5 text-xs text-[#B0B0B0]">
                    <span className="text-[10px] text-[#737373] block">Reason / Diagnosis:</span>
                    <p className="italic mt-0.5 text-white line-clamp-2">"{req.reason}"</p>
                  </div>
                )}
              </div>

            </div>

            {/* MATCHED ELIGIBLE DONORS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Eligible Regional Donors Matched ({matches.length})</span>
                </h4>
                <span className="text-[11px] text-[#737373]">
                  District: {req.district}
                </span>
              </div>

              {matches.length > 0 ? (
                <div className="space-y-2.5">
                  {matches.map((m) => {
                    const isAccepted = m.matchStatus === 'ACCEPTED';
                    const isDeclined = m.matchStatus === 'DECLINED';
                    const isContacted = m.matchStatus === 'CONTACT_REQUESTED';
                    const isContacting = contactingDonorId === m.donorId;

                    return (
                      <div
                        key={m.id}
                        className="bg-[#15151c] border border-white/10 hover:border-white/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#1e0a0d] border border-[#E50914]/40 flex items-center justify-center font-black text-[#FF2B2B] text-sm flex-shrink-0">
                            {m.donorBloodGroup || req.bloodGroup}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white">{m.donorName}</h5>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isAccepted
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : isDeclined
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : isContacted
                                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                  : 'bg-white/10 text-white'
                              }`}>
                                {isAccepted ? 'Accepted' : isDeclined ? 'Unavailable' : isContacted ? 'Contact Sent' : 'Matched'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#8E8E93]">
                              <span>{m.donorCity || m.donorDistrict || req.district}</span>
                              {m.donorPhone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-[#E50914]" />
                                  {isAccepted ? (
                                    <strong className="text-emerald-400">{m.donorPhone}</strong>
                                  ) : (
                                    <span className="font-mono text-[11px] text-[#737373]">{m.donorPhone}</span>
                                  )}
                                </span>
                              )}
                              {(m.donorEmail || m.email) && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#E50914]" />
                                  {isAccepted ? (
                                    <strong className="text-emerald-400 text-[11px] break-all">{m.donorEmail || m.email}</strong>
                                  ) : (
                                    <span className="font-mono text-[11px] text-[#737373] break-all">{m.donorEmail || m.email}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAccepted ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {m.donorPhone && (
                                <a
                                  href={`tel:${m.donorPhone.replace(/\s+/g, '')}`}
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>Call</span>
                                </a>
                              )}
                              {(m.donorEmail || m.email) && (
                                <a
                                  href={`mailto:${m.donorEmail || m.email}`}
                                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Email</span>
                                </a>
                              )}
                            </div>
                          ) : isDeclined ? (
                            <span className="text-xs text-[#737373] italic">Unavailable</span>
                          ) : isContacted ? (
                            <span className="text-xs text-sky-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Awaiting response</span>
                            </span>
                          ) : (
                            <button
                              disabled={isContacting || !isActive}
                              onClick={() => handleContactDonor(m.donorId, m.id)}
                              className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(229,9,20,0.4)] disabled:opacity-50 transition-all"
                            >
                              {isContacting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              <span>Request Contact</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-[#15151c] border border-white/10 rounded-2xl text-xs text-[#8E8E93]">
                  No matching donors found yet. Our algorithm continues searching in {req.district}.
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                {isActive && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-semibold text-xs transition-all"
                  >
                    Cancel Request
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {isActive && (
                  <button
                    disabled={actionLoading}
                    onClick={handleMarkFulfilled}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Mark Fulfilled</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Cancel Confirmation Dialog Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#161620] border border-red-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500 text-[#FF2B2B] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-white">Cancel Blood Request?</h4>
              <p className="text-xs text-[#B0B0B0] leading-relaxed">
                Are you sure you want to cancel this blood request? Matched donors will no longer be notified, and matching for this ticket will cease immediately.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-all"
                >
                  No, Keep Active
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleCancelRequest}
                  className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#FF2B2B] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Yes, Cancel Request</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
