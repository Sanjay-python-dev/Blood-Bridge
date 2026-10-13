import React, { useState } from 'react';
import {
  X,
  Search,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  MapPin,
  Loader2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { getBombayRequestStatus } from '../services/bombayService';

export default function BombayTrackModal({ isOpen, onClose, initialCode = '' }) {
  const [requestCode, setRequestCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    if (!requestCode.trim()) {
      setError('Please enter your Request ID (e.g. BBR-2026-XXXXXX)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await getBombayRequestStatus(requestCode.trim());
      setResult(data.request);
    } catch (err) {
      setError(err.message || 'Could not find a request with this ID. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED (Access Key Issued)
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">
            <ShieldCheck className="w-3.5 h-3.5" /> CLINICALLY VERIFIED
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">
            <HelpCircle className="w-3.5 h-3.5" /> UNDER REVIEW / INFO REQUESTED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">
            <XCircle className="w-3.5 h-3.5" /> REJECTED
          </span>
        );
      case 'PENDING_VERIFICATION':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Clock className="w-3.5 h-3.5 animate-spin" /> PENDING VERIFICATION
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h3 className="text-2xl font-black text-white">Track Bombay Blood Request</h3>
          <p className="text-xs text-[#B0B0B0] mt-1">
            Check live administrative verification and hospital coordination status.
          </p>
        </div>

        <form onSubmit={handleTrack} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Enter Request ID (e.g. BBR-2026-XXXXXX)"
            value={requestCode}
            onChange={(e) => setRequestCode(e.target.value)}
            className="flex-1 bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-xs text-white uppercase font-mono placeholder-[#666] outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Track</span>
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[#737373] text-[10px] block font-mono">REQUEST ID</span>
                <span className="font-mono text-base font-black text-[#FF2B2B]">
                  {result.requestCode}
                </span>
              </div>
              <div>{getStatusBadge(result.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[#737373] block">Patient:</span>
                <span className="font-bold text-white mt-0.5 block">{result.patientName}</span>
              </div>
              <div>
                <span className="text-[#737373] block">Hospital:</span>
                <span className="font-bold text-white mt-0.5 block truncate">{result.hospitalName}</span>
              </div>
              <div>
                <span className="text-[#737373] block">District:</span>
                <span className="text-white mt-0.5 block">{result.district}</span>
              </div>
              <div>
                <span className="text-[#737373] block">Urgency:</span>
                <span className={`mt-0.5 block font-bold ${
                  result.urgency === 'Emergency' ? 'text-[#FF2B2B]' : 'text-amber-400'
                }`}>
                  {result.urgency}
                </span>
              </div>
              <div>
                <span className="text-[#737373] block">Units Required:</span>
                <span className="text-white mt-0.5 block">{result.unitsRequired} Unit(s)</span>
              </div>
              <div>
                <span className="text-[#737373] block">Required Date:</span>
                <span className="text-white mt-0.5 block">{result.requiredDate}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-[11px] text-[#8E8E93] leading-relaxed">
              {result.status === 'APPROVED' ? (
                <p className="text-emerald-400 font-semibold">
                  ✓ Request approved. A short-lived secure access credential has been issued to the authorized hospital blood bank.
                </p>
              ) : result.status === 'REJECTED' ? (
                <p className="text-red-400">
                  Your Bombay Blood request could not be approved. Please review the provided information or contact BloodBridge emergency support.
                </p>
              ) : (
                <p>
                  BloodBridge medical coordination officers are currently reviewing hospital verification credentials and voluntary donor proximity.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
