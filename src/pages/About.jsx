import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Eye, ShieldCheck, Heart, Users, Sparkles, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import StatisticsSection from '../components/StatisticsSection';
import Logo from '../components/Logo';

export default function About() {
  const values = [
    {
      title: 'Humanity',
      desc: 'Treating every request with compassion, empathy, and urgency, prioritizing human lives above all.',
      icon: Heart,
    },
    {
      title: 'Connection',
      desc: 'Building reliable links between willing donors and critical care hospitals in local communities.',
      icon: Users,
    },
    {
      title: 'Trust',
      desc: 'Verifying every donor record and maintaining utmost privacy so that both donors and patients are secure.',
      icon: ShieldCheck,
    },
    {
      title: 'Hope',
      desc: 'Offering reassurance and immediate answers during critical hospital emergencies when every minute counts.',
      icon: Sparkles,
    },
    {
      title: 'Saving Lives',
      desc: 'Our fundamental benchmark: ensuring that no individual loses a life because a compatible unit was missing.',
      icon: Target,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      
      {/* Hero Header */}
      <section className="relative pt-16 pb-24 overflow-hidden border-b border-[#181818]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#E50914]/10 rounded-full blur-[130px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-4">
            ABOUT BLOOD BRIDGE
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Bridging the Gap Between{' '}
            <span className="text-[#E50914] drop-shadow-[0_0_30px_rgba(229,9,20,0.6)]">
              Donors and Lives
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-[#B0B0B0] max-w-2xl mx-auto leading-relaxed">
            Blood Bridge was created to make finding blood donors easier, transparent, and faster during emergencies across Tamil Nadu and beyond.
          </p>
        </div>
      </section>

      {/* Mission & Vision Split */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Mission Card */}
          <div className="glass-lvl2 border border-white/15 hover:border-white/30 rounded-3xl p-8 sm:p-10 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between relative overflow-hidden">
            {/* Top edge glass reflection highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#1c0c0e] border border-[#E50914]/30 text-[#E50914] flex items-center justify-center mb-6">
                <Target className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#E50914] uppercase">
                Purpose Driven
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-4">
                OUR MISSION
              </h2>
              <p className="text-base text-[#B0B0B0] leading-relaxed">
                To connect voluntary blood donors with patients and hospitals who urgently need blood. We eliminate bureaucratic delays by offering instant, location-aware matching and secure communication channels.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2 text-xs text-[#737373]">
              <CheckCircle2 className="w-4 h-4 text-[#FF2B2B]" />
              <span>100% Non-Profit Community Initiative</span>
            </div>
          </div>

          {/* Vision Card */}
          <div className="glass-lvl2 border border-white/15 hover:border-white/30 rounded-3xl p-8 sm:p-10 transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col justify-between relative overflow-hidden">
            {/* Top edge glass reflection highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#1c0c0e] border border-[#E50914]/30 text-[#FF2B2B] flex items-center justify-center mb-6">
                <Eye className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#FF2B2B] uppercase">
                The Future
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-4">
                OUR VISION
              </h2>
              <p className="text-base text-[#B0B0B0] leading-relaxed">
                A world where no life is lost because blood was unavailable. We envision a digital healthcare ecosystem where every hospital bed is backed by thousands of ready, altruistic donors at a moment's notice.
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2 text-xs text-[#737373]">
              <CheckCircle2 className="w-4 h-4 text-[#FF2B2B]" />
              <span>Real-Time Regional Response Network</span>
            </div>
          </div>

        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 bg-transparent border-y border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#E50914] bg-[#1a080a] border border-[#E50914]/30 px-3.5 py-1 rounded-full mb-3">
              WHAT GUIDES US
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              OUR VALUES
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#B0B0B0]">
              The principles and ethical pillars that govern our community and technological choices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={i}
                  className="group bg-[#111111] hover:bg-[#161616] border border-[#222222] hover:border-[#E50914] rounded-2xl p-6 transition-all duration-300 transform hover:-translate-y-2 flex flex-col items-center text-center shadow-lg"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#1a0c0e] border border-[#E50914]/30 flex items-center justify-center text-[#FF2B2B] group-hover:bg-[#E50914] group-hover:text-white transition-all duration-300 mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#FF2B2B] transition-colors mb-2">
                    {v.title}
                  </h3>
                  <p className="text-xs text-[#B0B0B0] leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-20 max-w-5xl mx-auto px-4 text-center">
        <div className="bg-[#111111] border border-[#222222] rounded-3xl p-10 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4">
            <h3 className="text-3xl font-bold text-white">
              Ready to Be Part of the Solution?
            </h3>
            <p className="text-sm text-[#B0B0B0] max-w-lg mx-auto">
              Join thousands of donors across Tamil Nadu. Register your blood group and stand ready to answer emergency requests.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/donate-blood"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#E50914] hover:bg-[#FF2B2B] shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all"
              >
                <span>Register as a Donor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/find-blood"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-[#1a1a1a] border border-white/20 hover:border-white transition-all"
              >
                <span>Search Donors</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
