import React from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Heart, Sparkles, Shield, ArrowRight } from 'lucide-react';
import HeroVisual from '../components/HeroVisual';
import StatisticsSection from '../components/StatisticsSection';
import HowItWorksSection from '../components/HowItWorksSection';
import BloodGroupCard from '../components/BloodGroupCard';
import EmergencyBanner from '../components/EmergencyBanner';
import HospitalSearchSection from '../components/HospitalSearchSection';
import { bloodGroups } from '../data/mockData';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      
      {/* ====================================================
          HERO SECTION
          ==================================================== */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E50914]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-[#FF2B2B]/8 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Hero Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-[#FF2B2B] text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
                <span>🩸 Donate Blood • Save Lives</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
                Connecting Lives <br />
                <span className="text-[#E50914] drop-shadow-[0_0_35px_rgba(229,9,20,0.7)]">
                  Through Blood
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg lg:text-xl text-[#B0B0B0] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Blood Bridge is a platform that connects generous blood donors with people in need. Your small act of kindness can make a big difference.
              </p>

              {/* Two CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                {/* 1. FIND BLOOD (Red Gradient) */}
                <Link
                  to="/find-blood"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-[#FF2B2B] via-[#E50914] to-[#990000] hover:from-[#FF4A4A] hover:to-[#FF2B2B] shadow-[0_0_25px_rgba(229,9,20,0.6)] hover:shadow-[0_0_35px_rgba(229,9,20,0.9)] transition-all duration-300 transform hover:-translate-y-1"
                >
                  <Search className="w-5 h-5" />
                  <span>FIND BLOOD</span>
                </Link>

                {/* 2. BECOME A DONOR (Dark Transparent with White Border) */}
                <Link
                  to="/donate-blood"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold text-white bg-[#111111]/70 hover:bg-[#181818] border border-white/40 hover:border-[#E50914] hover:text-[#FF2B2B] backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(229,9,20,0.3)]"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>BECOME A DONOR</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-white/5 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#B0B0B0]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#FF2B2B]" />
                  <span>100% Privacy Protected</span>
                </div>
                <span className="text-white/20">•</span>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#E50914]" />
                  <span>No Commercial Fees</span>
                </div>
                <span className="text-white/20">•</span>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF2B2B]" />
                  <span>Tamil Nadu Wide Coverage</span>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Visual Graphic */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <HeroVisual />
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================
          HOSPITAL SEARCH & NEARBY DONORS SECTION
          ==================================================== */}
      <HospitalSearchSection />

      {/* ====================================================
          STATISTICS SECTION
          ==================================================== */}
      <StatisticsSection />

      {/* ====================================================
          HOW IT WORKS SECTION
          ==================================================== */}
      <HowItWorksSection />

      {/* ====================================================
          BLOOD GROUP SECTION ("Find Your Blood Type")
          ==================================================== */}
      <section className="py-24 bg-transparent border-y border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-white/[0.06] border border-white/15 px-3.5 py-1 rounded-full mb-4 backdrop-blur-md shadow-sm">
              COMPATIBILITY MATRIX
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Find Your <span className="text-[#E50914]">Blood Type</span>
            </h2>
            <p className="mt-3 text-base text-[#B0B0B0]">
              Select your group to browse available donors across Tamil Nadu or understand recipient compatibility.
            </p>
          </div>

          {/* 8 Blood Group Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {bloodGroups.map((group) => (
              <BloodGroupCard key={group} bloodGroup={group} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/find-blood"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#B0B0B0] hover:text-[#FF2B2B] transition-colors"
            >
              <span>Explore all blood groups and donor listings</span>
              <ArrowRight className="w-4 h-4 text-[#E50914]" />
            </Link>
          </div>

        </div>
      </section>

      {/* ====================================================
          EMERGENCY SECTION
          ==================================================== */}
      <EmergencyBanner />

    </div>
  );
}
