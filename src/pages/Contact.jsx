import React, { useState } from 'react';
import { Mail, MapPin, PhoneCall, Send, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-3">
            COMMUNITY & SUPPORT
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Get In <span className="text-[#E50914]">Touch</span>
          </h1>
          <p className="mt-3 text-base text-[#B0B0B0]">
            We are here to help connect lives. Whether you have questions about donor registration or hospital partnerships, reach out anytime.
          </p>
        </div>

        {/* 3 Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          
          {/* Email */}
          <div className="glass-lvl2 border border-white/15 hover:border-white/30 rounded-3xl p-8 text-center transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-[#1c0c0e] border border-[#E50914]/40 text-[#FF2B2B] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Email Support</h3>
            <p className="text-xs text-[#B0B0B0] mb-3">For inquiries and partnership queries</p>
            <a
              href="mailto:bloodbridgesupportweb@gmail.com"
              className="text-sm font-semibold text-[#FF2B2B] hover:underline"
            >
              bloodbridgesupportweb@gmail.com
            </a>
          </div>

          {/* Location */}
          <div className="glass-lvl2 border border-white/15 hover:border-white/30 rounded-3xl p-8 text-center transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-[#1c0c0e] border border-[#E50914]/40 text-[#FF2B2B] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Regional Location</h3>
            <p className="text-xs text-[#B0B0B0] mb-3">Serving hospitals statewide</p>
            <span className="text-sm font-semibold text-white">
              Tamil Nadu, India
            </span>
          </div>

          {/* Emergency Support */}
          <div className="glass-lvl2 border border-white/15 hover:border-white/30 rounded-3xl p-8 text-center transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-[#1c0c0e] border border-[#E50914]/40 text-[#FF2B2B] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)] animate-pulse">
              <PhoneCall className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Emergency Support</h3>
            <p className="text-xs text-[#B0B0B0] mb-3">Immediate hospital triage help</p>
            <span className="text-sm font-bold text-emerald-400">
              Available 24/7 (1800-BLOOD-HELP)
            </span>
          </div>

        </div>

        {/* Contact Form Section */}
        <div className="max-w-3xl mx-auto glass-lvl2 border border-white/15 rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white">Send Us a Direct Message</h3>
                <p className="text-xs text-[#B0B0B0] mt-1">
                  We usually respond to non-emergency messages within 2-4 hours.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="anand@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Volunteer Camp Partnership / General Query"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#B0B0B0] uppercase tracking-wider mb-2">
                  Message *
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="How can we assist you?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#161616] border border-[#2d2d2d] focus:border-[#E50914] rounded-xl p-4 text-sm text-white placeholder-[#555] outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] hover:shadow-[0_0_35px_rgba(229,9,20,0.8)] transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>SEND MESSAGE</span>
              </button>
            </form>
          ) : (
            <div className="text-center py-10 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">Message Dispatched!</h3>
              <p className="text-sm text-[#B0B0B0] max-w-sm mx-auto">
                Thank you for reaching out to Blood Bridge. Our community coordinator has received your message and will reply to <span className="text-white font-semibold">{formData.email}</span> shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 rounded-xl bg-[#1c1c1c] text-white text-xs font-semibold hover:bg-[#252525]"
              >
                Send Another Note
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
