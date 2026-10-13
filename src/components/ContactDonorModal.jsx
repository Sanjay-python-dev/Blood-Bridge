import React, { useState } from 'react';
import { X, Send, ShieldAlert, CheckCircle2, Phone, Mail, Building, User, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createDirectDonationRequest } from '../services/requestService';
import { showToast } from './Toast';

export default function ContactDonorModal({ donor, onClose }) {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');

  const [formData, setFormData] = useState({
    patientName: '',
    hospital: '',
    city: donor?.district || donor?.city || 'Karur',
    phone: profile?.phone || '',
    email: user?.email || profile?.email || '',
    urgency: 'Immediate',
    note: ''
  });

  if (!donor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const created = await createDirectDonationRequest({
        donorId: donor.id,
        donorName: donor.name,
        donorBloodGroup: donor.bloodGroup,
        patientName: formData.patientName,
        hospital: formData.hospital,
        city: formData.city,
        phone: formData.phone,
        email: formData.email,
        urgency: formData.urgency,
        note: formData.note,
      });

      setTicketId(created.id);
      setSubmitted(true);
      showToast(`Secure donation request dispatched to ${donor.name}.`, 'success');
    } catch (err) {
      setError(err.message || 'Could not dispatch connection request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-lg glass-lvl4 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.85)] text-white overflow-hidden">
        {/* Top edge glass reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#B0B0B0] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center text-[#FF2B2B]">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Request Connection with {donor.name}</h3>
                <p className="text-xs text-[#B0B0B0]">
                  Blood Group: <span className="text-[#FF2B2B] font-bold">{donor.bloodGroup}</span> • District: {donor.district || donor.city}
                </p>
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="p-3.5 rounded-xl bg-[#170a0c] border border-[#E50914]/30 text-xs text-[#B0B0B0] mb-5 leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#FF2B2B] flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-white">Secure Connection Workflow:</strong> To prevent donor harassment, contact details are protected. Sending this request notifies the voluntary donor directly on their portal. Once they accept, medical coordination is unlocked.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo / GMCH"
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                    City / District *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                    Your Callback Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                    Your Email / Gmail
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. requester@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                  Urgency Level *
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="Immediate">Critical (Within 2 hrs)</option>
                  <option value="Today">Urgent (Today)</option>
                  <option value="Tomorrow">Standard (24-48 hrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#B0B0B0] uppercase mb-1">
                  Urgent Note for Donor
                </label>
                <textarea
                  rows="2"
                  placeholder="Units required, ICU ward details, surgery requirements..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-[#161616] border border-[#333333] focus:border-[#E50914] rounded-xl px-4 py-2 text-sm text-white placeholder-[#555] outline-none resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/20 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] text-sm font-bold text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] hover:shadow-[0_0_30px_rgba(229,9,20,0.8)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Request Dispatched Successfully!
            </h3>
            <p className="text-sm text-[#B0B0B0] mb-6 max-w-sm mx-auto leading-relaxed">
              Connection request ticket <strong className="text-white font-mono">{ticketId}</strong> has been sent to <strong className="text-white">{donor.name}</strong> ({donor.district || donor.city}). You will receive immediate status updates as soon as the donor confirms availability.
            </p>
            <div className="bg-[#1a080a] border border-[#E50914]/30 rounded-xl p-3 text-xs text-[#FF2B2B] mb-6 flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              <span>For emergency trauma dispatch call 108 or hospital desk</span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#161616] hover:bg-[#202020] border border-white/20 text-sm font-bold text-white transition-all"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
