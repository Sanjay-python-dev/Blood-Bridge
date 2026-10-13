import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HeartHandshake, Search } from 'lucide-react';
import AboutHero from '../components/about/AboutHero';
import TamilNaduDonorMap from '../components/about/TamilNaduDonorMap';
import DistrictDetailsPanel from '../components/about/DistrictDetailsPanel';
import DistrictGrid from '../components/about/DistrictGrid';
import HowItWorks from '../components/about/HowItWorks';
import MissionVision from '../components/about/MissionVision';
import NetworkStats from '../components/about/NetworkStats';
import { getTamilNaduNetworkData } from '../services/tamilNaduNetworkService';

export default function About() {
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const data = await getTamilNaduNetworkData();
        if (isMounted) {
          setNetworkData(data);
        }
      } catch (err) {
        console.error('Failed to load Tamil Nadu network data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectDistrict = (district) => {
    setSelectedDistrict(district);
  };

  const handleClosePanel = () => {
    setSelectedDistrict(null);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-[#ff1e2d] selection:text-white">
      
      {/* SECTION 1 — HERO */}
      <AboutHero
        summary={networkData?.summary}
        loading={loading}
      />

      {/* SECTION 2 — MAIN INTERACTIVE TAMIL NADU MAP */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <TamilNaduDonorMap
          networkData={networkData}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
        />
      </section>

      {/* DISTRICT DETAILS SLIDE-OUT PANEL / BOTTOM SHEET */}
      {selectedDistrict && (
        <>
          {/* Backdrop overlay */}
          <div
            onClick={handleClosePanel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
            aria-hidden="true"
          />
          <DistrictDetailsPanel
            district={selectedDistrict}
            onClose={handleClosePanel}
          />
        </>
      )}

      {/* SECTION 3 — DISTRICT DETAILS GRID */}
      <DistrictGrid
        districtsList={networkData?.districtList || []}
        selectedDistrict={selectedDistrict}
        onSelectDistrict={(dist) => {
          handleSelectDistrict(dist);
          // Scroll up towards map on mobile/desktop smoothly
          window.scrollTo({ top: 380, behavior: 'smooth' });
        }}
      />

      {/* SECTION 4 — HOW BLOOD BRIDGE CONNECTS PEOPLE */}
      <HowItWorks />

      {/* SECTION 5 & 6 — MISSION & VISION */}
      <MissionVision />

      {/* SECTION 7 — LIVE NETWORK SUMMARY */}
      <NetworkStats
        summary={networkData?.summary}
        loading={loading}
      />

      {/* CALL TO ACTION BANNER */}
      <section className="py-20 max-w-5xl mx-auto px-4 text-center">
        <div className="bg-gradient-to-b from-[#111118] to-[#0a0a0f] border border-white/10 hover:border-[#ff1e2d]/40 rounded-3xl p-8 sm:p-14 relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all">
          {/* Ambient red highlight orb */}
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#ff1e2d]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <span className="inline-block text-xs uppercase tracking-[0.25em] font-extrabold text-[#ff1e2d] bg-[#1a080a] border border-[#ff1e2d]/30 px-3.5 py-1 rounded-full mb-1">
              TAKE ACTION TODAY
            </span>

            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Be Part of the Solution?
            </h3>

            <p className="text-sm sm:text-base text-[#a0a0a0] max-w-xl mx-auto leading-relaxed">
              Join thousands of donors across Tamil Nadu. Register your blood group and stand ready to answer emergency requests.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/donate-blood"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#ff1e2d] hover:bg-[#ff424f] shadow-[0_0_25px_rgba(255,30,45,0.5)] transition-all transform hover:-translate-y-0.5"
              >
                <span>Register as a Donor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/find-blood"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#14141e] border border-white/15 hover:border-white/30 transition-all transform hover:-translate-y-0.5"
              >
                <Search className="w-4 h-4 text-[#ff1e2d]" />
                <span>Search Donors</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
