import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Key,
  Building,
  User,
  CheckCircle2,
  AlertCircle,
  Phone,
  Send,
  Loader2,
  Clock,
  MapPin,
  Lock,
  HeartHandshake,
  ChevronLeft,
} from 'lucide-react';
import { verifyHospitalBombayAccess, requestBombayDonorContact } from '../services/bombayService';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';

export default function BombaySecureAccess() {
  const { user, role } = useAuth();

  const [requestCode, setRequestCode] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [hospitalName, setHospitalName] = useState(user?.hospitalName || '');
  const [physicianName, setPhysicianName] = useState(user?.name || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [accessResult, setAccessResult] = useState(null);

  // Donor contact state
  const [contactingDonorId, setContactingDonorId] = useState(null);
  const [contactSuccessIds, setContactSuccessIds] = useState([]);
  const [revealedPhones, setRevealedPhones] = useState({});

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!requestCode.trim() || !accessKey.trim()) {
      setErrorMsg('Please enter both Request ID and Access Key.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setAccessResult(null);

    try {
      const data = await verifyHospitalBombayAccess(requestCode, accessKey);
      setAccessResult(data);
      showToast('Hospital credentials and access token verified successfully.', 'success');
    } catch (err) {
      console.error('Access verification error:', err);
      setErrorMsg(err.message || 'Access verification failed. Check credentials and token expiry.');
      showToast(err.message || 'Access verification failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContactDonor = async (donor) => {
    setContactingDonorId(donor.id);
    try {
      await requestBombayDonorContact({
        donorId: donor.id,
        requestCode: accessResult?.scope?.requestCode || requestCode,
        hospitalName: hospitalName || 'Authorized Hospital',
        physicianName: physicianName || 'Attending Physician',
      });
      setContactSuccessIds((prev) => [...prev, donor.id]);
      setRevealedPhones((prev) => ({
        ...prev,
        [donor.id]: donor.rawPhone || donor.phone || '+91-98421-87654',
      }));
      showToast(`Emergency contact notification dispatched to ${donor.name}.`, 'success');
    } catch (err) {
      showToast(err.message || 'Could not notify donor.', 'error');
    } finally {
      setContactingDonorId(null);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Back navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/find-blood?group=Oh"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Find Blood</span>
        </Link>

        {role === 'AUTHORIZED_HOSPITAL' && (
          <Link
            to="/hospital-dashboard"
            className="text-xs font-bold text-red-400 hover:underline"
          >
            Hospital Dashboard →
          </Link>
        )}
      </div>

      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Lock className="w-4 h-4 text-[#FF2B2B]" />
          <span>Restricted Clinical Gateway • Verified Hospitals Only</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Bombay Blood Group <span className="text-[#FF2B2B]">(Oh / hh)</span> Secure Access
        </h1>
        <p className="text-sm text-neutral-400 max-w-2xl mx-auto mt-2 leading-relaxed">
          Authenticate emergency clinical credentials to access proximity-matched Bombay Blood Group donors. Access tokens are cryptographically hashed and expire automatically in 24 hours.
        </p>
      </div>

      {/* Verification Form Card */}
      {!accessResult && (
        <div className="bg-[#111111]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl max-w-xl mx-auto">
          <div className="flex items-center gap-3 pb-6 border-b border-white/10 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Enter Clinical Access Credentials</h2>
              <p className="text-xs text-neutral-400">Issued by BloodBridge Administration upon request approval</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                Request ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BBR-2026-A1B2C3"
                value={requestCode}
                onChange={(e) => setRequestCode(e.target.value)}
                className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                24-Hour Access Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BB-OH-XXXX-XXXX"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-red-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-neutral-500 outline-none transition-colors tracking-wider"
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Single-use emergency key provided to verified hospital officer.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Hospital Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Speciality Hospital"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  Attending Physician
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Anita Sharma"
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF2B2B] to-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Token & Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Verify Credentials & Unlock Donors</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center text-xs text-neutral-400">
            <span>Don't have an access key yet? </span>
            <Link to="/find-blood?group=Oh" className="text-red-400 font-bold hover:underline">
              Submit a Bombay Blood Request
            </Link>
          </div>
        </div>
      )}

      {/* Verified Donors Portal View */}
      {accessResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Verification Banner */}
          <div className="p-6 rounded-3xl bg-emerald-950/60 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Hospital Authorization Verified</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active Token
                  </span>
                </div>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Request ID: <strong className="text-white font-mono">{accessResult.scope?.requestCode}</strong> | Key expires at:{' '}
                  <strong className="text-emerald-300">
                    {accessResult.scope?.expiresAt ? new Date(accessResult.scope.expiresAt).toLocaleTimeString() : '24h'}
                  </strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setAccessResult(null);
                setAccessKey('');
              }}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-bold text-neutral-300 border border-white/10 self-start sm:self-auto"
            >
              Lock & Exit Session
            </button>
          </div>

          {/* Request Scope Details */}
          {accessResult.request && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-5 text-xs text-neutral-300 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Patient / Units</span>
                <span className="text-sm font-bold text-white block mt-0.5">{accessResult.request.patientName}</span>
                <span className="text-neutral-400">{accessResult.request.unitsRequired} Units Required</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Authorized Hospital</span>
                <span className="text-sm font-bold text-white block mt-0.5">{accessResult.request.hospitalName}</span>
                <span className="text-neutral-400">{accessResult.request.district}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Urgency Status</span>
                <span className="text-sm font-bold text-red-400 block mt-0.5">{accessResult.request.urgency}</span>
                <span className="text-neutral-400">Required by {accessResult.request.requiredDate}</span>
              </div>
            </div>
          )}

          {/* Matching Donors List */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/10 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Matched Bombay Blood Donors ({accessResult.donors?.length || 0})
                </h3>
                <p className="text-xs text-neutral-400">
                  Voluntary donors registered for Bombay Blood Group (Oh) in regional proximity.
                </p>
              </div>
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Donor privacy protected. Communications are audited.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(accessResult.donors || []).map((donor) => {
                const isContacted = contactSuccessIds.includes(donor.id);
                const isContacting = contactingDonorId === donor.id;
                const phoneToDisplay = revealedPhones[donor.id] || donor.phoneMasked || '+91 98421 •••••';

                return (
                  <div
                    key={donor.id}
                    className="p-5 rounded-2xl bg-[#161616] border border-white/5 hover:border-red-500/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
                          {donor.bloodGroup || 'Bombay (Oh)'}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {donor.availability || 'Available'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white mb-1">{donor.name}</h4>

                      <div className="text-xs text-neutral-400 space-y-1 mb-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{donor.district}, Tamil Nadu</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-neutral-500" />
                          <span className={isContacted ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                            {phoneToDisplay}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      {isContacted ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 text-center font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Contact Dispatched & Audited</span>
                        </div>
                      ) : (
                        <button
                          disabled={isContacting}
                          onClick={() => handleContactDonor(donor)}
                          className="w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isContacting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Request Immediate Contact</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {(!accessResult.donors || accessResult.donors.length === 0) && (
                <div className="col-span-3 text-center py-12 text-neutral-500 text-xs">
                  No active Bombay Blood donors currently matched in this immediate radius. Contact BloodBridge Emergency Desk at 1800-BLOOD-BRIDGE.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
