import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  Copy,
  Clock,
  Loader2,
  Info,
} from 'lucide-react';
import { getDemoDistricts } from '../services/demoDonorService';
import { createBombayRequest } from '../services/bombayService';
import { showToast } from './Toast';

export default function BombayRequestModal({ isOpen, onClose, initialDistrict = 'Karur' }) {
  const districts = getDemoDistricts();

  const [formData, setFormData] = useState({
    patientName: '',
    requesterName: '',
    phone: '',
    email: '',
    hospitalName: '',
    hospitalLocation: '',
    district: initialDistrict && initialDistrict !== 'All Districts' ? initialDistrict : 'Karur',
    city: initialDistrict && initialDistrict !== 'All Districts' ? initialDistrict : 'Karur',
    urgency: 'Emergency',
    unitsRequired: 1,
    requiredDate: new Date().toISOString().split('T')[0],
    doctorContact: '',
    reason: '',
    documentName: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.patientName.trim() || !formData.requesterName.trim() || !formData.phone.trim()) {
      setError('Please provide patient name, requester name, and contact phone number.');
      return;
    }

    const cleanEmail = (formData.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      setError('Email address is mandatory for receiving verification notices and updates.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. requester@gmail.com).');
      return;
    }

    if (!formData.hospitalName.trim() || !formData.district) {
      setError('Hospital name and district are strictly required for verified coordination.');
      return;
    }

    if (!formData.reason.trim()) {
      setError('Please describe the clinical requirement and medical necessity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createBombayRequest({
        ...formData,
        bloodGroup: 'Bombay Blood Group (Oh)',
      });

      setSubmittedData(res.request);
      showToast('Bombay Blood Request submitted successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Could not submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (!submittedData?.requestCode) return;
    navigator.clipboard.writeText(submittedData.requestCode);
    setCopied(true);
    showToast('Request ID copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden my-8">
        {/* Top edge reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Confirmation Screen */}
        {submittedData ? (
          <div className="text-center py-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bombay Blood Request Submitted
            </h3>
            <p className="mt-2 text-sm text-[#B0B0B0] max-w-md mx-auto">
              Your request is now under verification. BloodBridge administrative officers and authorized regional coordinators are reviewing hospital credentials.
            </p>

            {/* Request Details Summary Card */}
            <div className="mt-6 text-left bg-[#121212] border border-white/10 rounded-2xl p-5 space-y-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs text-[#737373] uppercase font-bold tracking-wider">
                  Request ID
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-[#FF2B2B]">
                    {submittedData.requestCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded bg-white/5 hover:bg-white/15 text-[#B0B0B0] hover:text-white transition-colors"
                    title="Copy Request ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[#737373] block">Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-400 mt-0.5">
                    <Clock className="w-3 h-3 animate-spin" /> PENDING VERIFICATION
                  </span>
                </div>
                <div>
                  <span className="text-[#737373] block">Submitted Date:</span>
                  <span className="text-white font-medium mt-0.5 block">
                    {new Date(submittedData.submittedDate || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[#737373] block">Hospital:</span>
                  <span className="text-white font-medium mt-0.5 block truncate">
                    {submittedData.hospitalName}
                  </span>
                </div>
                <div>
                  <span className="text-[#737373] block">Required Units:</span>
                  <span className="text-white font-medium mt-0.5 block">
                    {submittedData.unitsRequired} Unit(s)
                  </span>
                </div>
                <div>
                  <span className="text-[#737373] block">Required Date:</span>
                  <span className="text-white font-medium mt-0.5 block">
                    {submittedData.requiredDate}
                  </span>
                </div>
                <div>
                  <span className="text-[#737373] block">Blood Group:</span>
                  <span className="text-[#FF2B2B] font-bold mt-0.5 block">
                    Bombay Blood Group (Oh)
                  </span>
                </div>
              </div>
            </div>

            {/* Next Steps Advisory */}
            <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 max-w-lg mx-auto text-left flex items-start gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <p className="leading-relaxed">
                Save your <strong>Request ID</strong> ({submittedData.requestCode}). Once verified, an expiring secure access key will be generated for your hospital medical team to unlock coordinated donor dispatch.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-white text-xs font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)] hover:shadow-[0_0_25px_rgba(229,9,20,0.7)] transition-all"
              >
                Close & Track Status
              </button>
            </div>
          </div>
        ) : (
          /* Request Form */
          <div>
            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#FF2B2B] flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#FF2B2B]">
                  PROTECTED RARE BLOOD PROTOCOL
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Bombay Blood Group (Oh) Request
                </h3>
              </div>
            </div>

            {/* Security Explanation Box */}
            <div className="p-3.5 rounded-2xl bg-[#180a0c] border border-[#E50914]/30 text-xs text-[#B0B0B0] mb-5 leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-white">Why verification is required:</strong> The Bombay phenotype is exceptionally rare (&lt; 0.0004% prevalence). To safeguard voluntary donors from uncoordinated contact and ensure clinical validity, all requests undergo administrative and hospital verification before single-use expiring access credentials are created.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Row 1: Patient Name & Requester Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Patient Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Full name of patient"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none transition-colors"
                    />
                    <User className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">Needed to verify hospital blood crossmatch.</span>
                </div>

                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Requester Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Your name / relation"
                      value={formData.requesterName}
                      onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none transition-colors"
                    />
                    <User className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">Name of person managing medical coordination.</span>
                </div>
              </div>

              {/* Row 2: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Requester Mobile Number *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="+91 98421 XXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none font-mono transition-colors"
                    />
                    <Phone className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">For BloodBridge verification calls and status SMS.</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-[#B0B0B0] uppercase text-xs">
                      Email Address <span className="text-[#FF2B2B]">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-wide bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
                      Mandatory
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="requester@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none transition-colors"
                    />
                    <Mail className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5 block">Mandatory: Digital verification notice and status updates will be sent here.</span>
                </div>
              </div>

              {/* Row 3: Hospital Name & Doctor Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Hospital Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Karur Govt Medical College Hospital"
                      value={formData.hospitalName}
                      onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none transition-colors"
                    />
                    <Building className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">Access credentials are bound directly to this hospital.</span>
                </div>

                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Treating Doctor / Blood Bank Contact
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Dr. Name / Ward / Hospital Phone"
                      value={formData.doctorContact}
                      onChange={(e) => setFormData({ ...formData, doctorContact: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none transition-colors"
                    />
                    <Phone className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">Used by BloodBridge verification team to confirm necessity.</span>
                </div>
              </div>

              {/* Row 4: District & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    District (Tamil Nadu) *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value, city: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-white outline-none cursor-pointer"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">Enables geographic proximity matching for donors.</span>
                </div>

                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Hospital Location / Area
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Gandhigramam Road"
                      value={formData.hospitalLocation}
                      onChange={(e) => setFormData({ ...formData, hospitalLocation: e.target.value })}
                      className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-[#555] outline-none transition-colors"
                    />
                    <MapPin className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-[#737373] mt-0.5 block">Specific branch or road address.</span>
                </div>
              </div>

              {/* Row 5: Urgency, Units, Required Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Urgency Level *
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2.5 font-bold outline-none cursor-pointer ${
                      formData.urgency === 'Emergency'
                        ? 'bg-[#220b0e] border-[#E50914] text-[#FF2B2B]'
                        : 'bg-[#161616] border-[#2d2d2d] text-white'
                    }`}
                  >
                    <option value="Emergency">EMERGENCY (Immediate)</option>
                    <option value="Urgent">URGENT (Within 24h)</option>
                    <option value="Planned">PLANNED (Upcoming Surgery)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Units Required *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.unitsRequired}
                    onChange={(e) => setFormData({ ...formData, unitsRequired: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                    Required By Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.requiredDate}
                    onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-white outline-none"
                  />
                </div>
              </div>

              {/* Reason / Clinical Requirement */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                  Reason / Clinical Requirement *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Major surgery / trauma / thalassemia care requiring rare Bombay Blood Group (Oh) red cell units..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-3.5 py-2.5 text-white placeholder-[#555] outline-none leading-relaxed transition-colors"
                />
                <span className="text-[10px] text-[#737373] mt-0.5 block">Summary of diagnosis and blood necessity for verification team.</span>
              </div>

              {/* Optional Medical Document Upload */}
              <div>
                <label className="block font-bold text-[#B0B0B0] uppercase mb-1">
                  Medical Requisition Document (Optional)
                </label>
                <div className="flex items-center gap-3 bg-[#161616] border border-[#2d2d2d] rounded-xl p-2.5">
                  <FileText className="w-5 h-5 text-[#737373] flex-shrink-0" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, documentName: file.name });
                        showToast(`Attached document: ${file.name}`, 'info');
                      }
                    }}
                    className="text-xs text-[#B0B0B0] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#252525] file:text-white hover:file:bg-[#333] cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-[#737373] mt-0.5 block">Hospital letterhead, doctor prescription, or lab crossmatch report.</span>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-white/20 text-[#B0B0B0] hover:text-white text-xs font-semibold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF2B2B] to-[#E50914] shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:shadow-[0_0_30px_rgba(229,9,20,0.8)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Verified Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
