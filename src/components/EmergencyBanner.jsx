import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Search, Flame, PhoneCall } from 'lucide-react';
import BloodEmergencyPulse from '../components/animations/BloodEmergencyPulse';

export default function EmergencyBanner() {
  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Container with Dark Red Gradient Glass */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[rgba(40,4,8,0.78)] via-[rgba(60,6,12,0.72)] to-[rgba(30,4,8,0.78)] backdrop-blur-3xl border border-white/20 p-8 sm:p-12 lg:p-16 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.7),0_0_40px_rgba(229,9,20,0.25)] transition-all">
        {/* Top edge glass reflection highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Subtle background red glow pulse */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#E50914]/25 blur-[90px] animate-pulse pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#FF2B2B]/20 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
          
          {/* Left Content */}
          <div className="max-w-2xl">
            
            {/* Urgent Badge with pulsing icon */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E50914]/20 border border-[#E50914] text-[#FF2B2B] text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF2B2B] animate-ping" />
              <BloodEmergencyPulse><AlertCircle className="w-4 h-4" /></BloodEmergencyPulse>
              <span>Priority Response Network</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Need Blood Urgently?
            </h2>

            <p className="mt-3 text-base sm:text-lg text-[#B0B0B0] max-w-xl leading-relaxed">
              Don't wait. Submit an emergency blood request and connect with available donors across nearby hospitals in real-time.
            </p>

            {/* Quick 24/7 Helpline indicator */}
            <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-[#B0B0B0]">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <PhoneCall className="w-3.5 h-3.5 text-[#FF2B2B]" /> 24/7 Emergency Line: 1800-BLOOD-HELP
              </span>
              <span className="hidden sm:inline text-white/20">•</span>
              <span>Fastest Average Match Time: &lt; 15 mins</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto flex-shrink-0">
            {/* Request Blood Button */}
            <Link
              to="/request-blood"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#FF4A4A] hover:to-[#FF2B2B] shadow-[0_0_30px_rgba(229,9,20,0.8)] hover:shadow-[0_0_45px_rgba(229,9,20,1)] transition-all duration-300 transform hover:-translate-y-1"
            >
              <Flame className="w-5 h-5 animate-bounce" />
              <span>REQUEST BLOOD</span>
            </Link>

            {/* Find Donors Button */}
            <Link
              to="/find-blood"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-base font-bold text-white bg-[#111111]/80 hover:bg-[#161616] border border-white/30 hover:border-[#E50914] hover:text-[#FF2B2B] backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1"
            >
              <Search className="w-5 h-5" />
              <span>FIND DONORS</span>
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
