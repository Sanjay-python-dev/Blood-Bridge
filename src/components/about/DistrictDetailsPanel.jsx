import React from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  MapPin,
  Users,
  Activity,
  Building2,
  Phone,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Droplet,
  HeartHandshake
} from 'lucide-react';
import { HEATMAP_TIERS } from '../../services/tamilNaduNetworkService';

export default function DistrictDetailsPanel({ district, onClose }) {
  if (!district) return null;

  const tierMeta = HEATMAP_TIERS[district.tier] || HEATMAP_TIERS.medium;
  const bloodGroupList = [
    'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] lg:w-[490px] bg-[#0d0d14]/95 backdrop-blur-2xl border-l border-white/15 z-50 shadow-[-20px_0_60px_rgba(0,0,0,0.85)] flex flex-col justify-between transition-transform duration-300 ease-out animate-in slide-in-from-right">
      
      {/* Top Header */}
      <div className="p-6 border-b border-white/10 relative overflow-hidden flex-shrink-0">
        <div
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: tierMeta.fill }}
        />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-[#ff424f] font-bold">
                <MapPin className="w-3.5 h-3.5" />
                TAMIL NADU DISTRICT
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                style={{
                  backgroundColor: tierMeta.badgeBg,
                  borderColor: tierMeta.stroke,
                  color: tierMeta.badgeText,
                }}
              >
                {tierMeta.label} Availability
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {district.name}
            </h2>
            <p className="text-xs text-[#a0a0a0] mt-0.5">
              Blood donor availability and healthcare network profile
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close district panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Donor Statistics Overview Card */}
        <div className="rounded-2xl bg-[#13131b] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#a0a0a0]">
            <span>Donor Density & Readiness</span>
            <span className="text-white font-bold">{district.availabilityRatio}% Active</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${district.availabilityRatio}%`,
                backgroundColor: tierMeta.fill,
                boxShadow: `0 0 10px ${tierMeta.fill}`,
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] uppercase font-mono text-[#a0a0a0] block">Registered</span>
              <span className="text-xl font-black text-white block mt-0.5">
                {district.totalDonors}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block">Available</span>
              <span className="text-xl font-black text-white block mt-0.5">
                {district.availableDonors}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] uppercase font-mono text-[#ff424f] block">Requests</span>
              <span className="text-xl font-black text-white block mt-0.5">
                {district.activeRequests}
              </span>
            </div>
          </div>
        </div>

        {/* Blood Groups Availability Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Droplet className="w-4 h-4 text-[#ff1e2d]" />
              Blood Group Inventory
            </h3>
            <span className="text-[11px] text-[#a0a0a0]">
              Most Available: <strong className="text-[#ff424f] font-mono">{district.topBloodGroup}</strong>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {bloodGroupList.map((bg) => {
              const count = district.bloodGroups[bg] || 0;
              const hasUnits = count > 0;
              return (
                <div
                  key={bg}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    hasUnits
                      ? 'bg-[#181822] border-white/15 hover:border-[#ff1e2d]/60 hover:shadow-[0_0_15px_rgba(255,30,45,0.2)]'
                      : 'bg-[#111116]/60 border-white/5 opacity-50'
                  }`}
                >
                  <span className="text-xs font-black block text-white font-mono">{bg}</span>
                  <span className="text-[11px] font-semibold text-[#a0a0a0] block mt-0.5">
                    {count} {count === 1 ? 'donor' : 'donors'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Emergency Requests Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ff1e2d]" />
              Active Blood Requests ({district.activeRequests})
            </h3>
          </div>

          {district.requestsList.length > 0 ? (
            <div className="space-y-2.5">
              {district.requestsList.map((req, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-[#14141e] border border-[#ff1e2d]/30 hover:border-[#ff1e2d] transition-all flex items-start justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#ff1e2d]/20 text-[#ff4d5a] border border-[#ff1e2d]/40">
                        {req.bloodGroup} • {req.units} {req.units === 1 ? 'Unit' : 'Units'}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                        {req.urgency}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1.5">
                      {req.hospital}
                    </div>
                    <div className="text-[11px] text-[#a0a0a0]">
                      Patient: {req.patientName} • Required: {req.requiredDate}
                    </div>
                  </div>

                  <Link
                    to="/find-blood"
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-[#ff1e2d] text-white text-[11px] font-bold hover:bg-[#ff424f] transition-all shadow-[0_0_12px_rgba(255,30,45,0.4)]"
                  >
                    Respond
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#111116] border border-white/5 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-[#a0a0a0]">
                No pending blood emergency requests in {district.name} at this moment.
              </p>
            </div>
          )}
        </div>

        {/* Connected Hospitals Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#ff1e2d]" />
              Connected Hospitals ({district.hospitalsCount})
            </h3>
          </div>

          {district.hospitalsList.length > 0 ? (
            <div className="space-y-2.5">
              {district.hospitalsList.map((hosp, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-[#14141e] border border-white/10 hover:border-white/25 transition-all"
                >
                  <div className="text-xs font-bold text-white">
                    {hosp.name}
                  </div>
                  <div className="text-[11px] text-[#a0a0a0] mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#ff424f]" />
                    {hosp.address}
                  </div>
                  {hosp.nodalOfficer && (
                    <div className="text-[10px] text-[#737380] mt-1">
                      Nodal Officer: {hosp.nodalOfficer}
                    </div>
                  )}
                  {hosp.phone && (
                    <div className="text-[11px] text-[#ff424f] font-mono mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {hosp.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#111116] border border-white/5 text-left">
              <p className="text-xs text-[#a0a0a0] leading-relaxed">
                Hospital portal integration is active across regional medical hubs. Local clinics in {district.name} can register through our Hospital Authorization Gateway.
              </p>
              <Link
                to="/hospital-portal"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff424f] hover:underline mt-2"
              >
                <span>Register Hospital in {district.name}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-6 border-t border-white/10 bg-[#0d0d14] flex-shrink-0 flex items-center gap-3">
        <Link
          to={`/find-blood?district=${encodeURIComponent(district.name)}`}
          className="flex-1 py-3 px-4 rounded-xl bg-[#ff1e2d] hover:bg-[#ff424f] text-white text-xs font-bold text-center shadow-[0_0_20px_rgba(255,30,45,0.45)] transition-all flex items-center justify-center gap-2"
        >
          <span>Find Donors in {district.name}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/request-blood"
          className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition-all text-center"
        >
          Request Blood
        </Link>
      </div>

    </div>
  );
}
