import React from 'react';
import { HEATMAP_TIERS } from '../../services/tamilNaduNetworkService';

export default function MapLegend({ dataSource = 'Live Network' }) {
  const tiers = [
    HEATMAP_TIERS.low,
    HEATMAP_TIERS.medium,
    HEATMAP_TIERS.high,
    HEATMAP_TIERS.very_high,
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0d0d12]/90 backdrop-blur-xl border border-white/10 text-xs">
      
      {/* Legend items */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#a0a0a0] font-semibold">
          DONOR AVAILABILITY
        </span>
        <div className="flex items-center gap-2">
          {tiers.map((t) => (
            <div key={t.key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-md border border-white/20 transition-transform hover:scale-125"
                style={{ backgroundColor: t.fill }}
              />
              <span className="text-[11px] text-[#a0a0a0] font-medium">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-2 self-end sm:self-auto px-3 py-1 rounded-full bg-[#18080a] border border-[#ff1e2d]/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff1e2d] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff1e2d]" />
        </span>
        <span className="font-mono text-[11px] tracking-wider uppercase font-bold text-[#ff4d5a]">
          LIVE DONOR NETWORK
        </span>
      </div>

    </div>
  );
}
