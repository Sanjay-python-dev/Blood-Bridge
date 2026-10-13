import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Droplet, Activity, Users, ShieldAlert } from 'lucide-react';
import { HEATMAP_TIERS } from '../../services/tamilNaduNetworkService';
import MapLegend from './MapLegend';

export default function TamilNaduDonorMap({
  networkData,
  selectedDistrict,
  onSelectDistrict,
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const svgMeta = networkData?.svgMeta;
  const districtsData = networkData?.districts || {};
  const districtList = svgMeta?.districts || [];

  // Handle Zoom In
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.35, 3.2));
  };

  // Handle Zoom Out
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.35, 0.8));
  };

  // Handle Reset View
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse drag handlers for Pan
  const handleMouseDown = (e) => {
    // Only pan on left click
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    // Track tooltip position relative to container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.8), 3.2));
  };

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // When selected district changes from outside (e.g. card clicked), focus/zoom slightly
  useEffect(() => {
    if (!selectedDistrict || !svgMeta) return;
    const target = districtList.find(
      (d) => d.name.toLowerCase() === selectedDistrict.name.toLowerCase()
    );
    if (target && target.center) {
      // Smooth center towards district
      const viewBoxW = svgMeta.width || 700;
      const viewBoxH = svgMeta.height || 860;
      const cx = target.center.x;
      const cy = target.center.y;
      
      // Calculate target pan to place district near center
      const targetZoom = Math.max(zoom, 1.4);
      const newPanX = (viewBoxW / 2 - cx) * (targetZoom / 1.5);
      const newPanY = (viewBoxH / 2 - cy) * (targetZoom / 1.5);

      setZoom(targetZoom);
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    }
  }, [selectedDistrict]);

  return (
    <div className="relative w-full rounded-3xl bg-[#08080c] border border-white/10 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
      
      {/* Top Section Header */}
      <div className="p-6 sm:p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10 bg-gradient-to-b from-[#0e0e16]/80 to-transparent">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#ff1e2d] animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#ff424f] font-bold">
              TAMIL NADU DONOR VISUALIZER
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Blood Donor Network Across Tamil Nadu
          </h2>
          <p className="text-xs sm:text-sm text-[#a0a0a0] mt-1 max-w-2xl">
            Explore donor availability across districts and discover where the blood donor network is strongest.
          </p>
        </div>

        {/* Floating Quick Action / Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#a0a0a0]">
            <MapPin className="w-3.5 h-3.5 text-[#ff1e2d]" />
            <span>38 Active Regions</span>
          </div>
        </div>
      </div>

      {/* Map Canvas Area */}
      <div
        ref={containerRef}
        className={`relative w-full h-[520px] sm:h-[620px] lg:h-[720px] overflow-hidden select-none bg-[radial-gradient(ellipse_at_center,rgba(25,25,35,0.7)_0%,#050508_100%)] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredDistrict(null);
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle Background Grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Red Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#ff1e2d]/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Zoom & Pan Controls Overlay */}
        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-xl bg-[#0e0e16]/80 backdrop-blur-md border border-white/15 hover:border-[#ff1e2d]/60 text-white flex items-center justify-center transition-all shadow-lg hover:bg-[#161622] hover:scale-105 active:scale-95 cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-xl bg-[#0e0e16]/80 backdrop-blur-md border border-white/15 hover:border-[#ff1e2d]/60 text-white flex items-center justify-center transition-all shadow-lg hover:bg-[#161622] hover:scale-105 active:scale-95 cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleReset}
            className="w-10 h-10 rounded-xl bg-[#0e0e16]/80 backdrop-blur-md border border-white/15 hover:border-[#ff1e2d]/60 text-white flex items-center justify-center transition-all shadow-lg hover:bg-[#161622] hover:scale-105 active:scale-95 cursor-pointer"
            title="Reset Map View"
            aria-label="Reset Map View"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Interactive SVG Map */}
        <svg
          viewBox={svgMeta?.viewBox || '0 0 700 860'}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <defs>
            {/* Soft Glow Filter for Highlighted District */}
            <filter id="red-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Pulsing selected district filter */}
            <filter id="selected-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#ff1e2d" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* District Vector Paths */}
          <g>
            {districtList.map((item) => {
              const stat = districtsData[item.name] || {};
              const tier = stat.tier || 'medium';
              const tierConfig = HEATMAP_TIERS[tier] || HEATMAP_TIERS.medium;
              
              const isHovered = hoveredDistrict?.name === item.name;
              const isSelected = selectedDistrict?.name === item.name;
              const isAnyHovered = Boolean(hoveredDistrict);

              // Calculate fill and stroke
              let fill = tierConfig.fill;
              let stroke = tierConfig.stroke;
              let strokeWidth = 1.2;
              let filter = 'none';
              let opacity = 1;

              if (isSelected) {
                fill = '#ff1e2d';
                stroke = '#ffffff';
                strokeWidth = 2.8;
                filter = 'url(#selected-glow)';
                opacity = 1;
              } else if (isHovered) {
                fill = tierConfig.fillHover;
                stroke = '#ff4d5a';
                strokeWidth = 2.4;
                filter = 'url(#red-glow)';
                opacity = 1;
              } else if (isAnyHovered) {
                // Dim other districts slightly when hovering
                opacity = 0.65;
              }

              return (
                <path
                  key={item.id}
                  id={`district-${item.id}`}
                  d={item.path}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  filter={filter}
                  opacity={opacity}
                  tabIndex={0}
                  role="button"
                  aria-label={`District of ${item.name}, ${stat.totalDonors || 0} donors, ${stat.availableDonors || 0} available`}
                  className="transition-all duration-200 cursor-pointer focus:outline-none focus:stroke-white"
                  onMouseEnter={() => {
                    setHoveredDistrict(stat);
                  }}
                  onMouseLeave={() => {
                    if (hoveredDistrict?.name === item.name) {
                      setHoveredDistrict(null);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDistrict(stat);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectDistrict(stat);
                    }
                  }}
                />
              );
            })}

            {/* Centroid District Labels for High Availability Districts */}
            {districtList.map((item) => {
              const stat = districtsData[item.name];
              if (!stat || !item.center) return null;
              const isHigh = stat.tier === 'very_high' || stat.tier === 'high';
              const isSelected = selectedDistrict?.name === item.name;
              const isHovered = hoveredDistrict?.name === item.name;

              // Always show label on hover, selection, or major hubs
              if (!isHigh && !isSelected && !isHovered && zoom < 1.3) return null;

              return (
                <g
                  key={`label-${item.id}`}
                  className="pointer-events-none"
                  transform={`translate(${item.center.x}, ${item.center.y})`}
                >
                  <circle
                    r={isSelected || isHovered ? 4.5 : 2.5}
                    fill={isSelected ? '#ffffff' : '#ff4d5a'}
                    className="drop-shadow-[0_0_6px_rgba(255,30,45,0.8)]"
                  />
                  <text
                    y={-7}
                    textAnchor="middle"
                    className="text-[9px] font-extrabold uppercase tracking-wider fill-white select-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                    style={{
                      fontSize: isSelected || isHovered ? '11px' : '9px',
                      fontWeight: isSelected ? '900' : '700',
                      fill: isSelected ? '#ff4d5a' : '#ffffff',
                    }}
                  >
                    {item.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip following cursor */}
        {hoveredDistrict && (
          <div
            className="absolute pointer-events-none z-40 transition-transform duration-75 ease-out"
            style={{
              left: `${Math.min(Math.max(tooltipPos.x + 18, 16), (containerRef.current?.clientWidth || 600) - 270)}px`,
              top: `${Math.min(Math.max(tooltipPos.y - 40, 16), (containerRef.current?.clientHeight || 600) - 230)}px`,
            }}
          >
            <div className="w-64 rounded-2xl bg-[#0d0d14]/95 backdrop-blur-xl border border-[#ff1e2d]/40 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] text-left animate-in fade-in zoom-in-95">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff424f] font-bold block">
                    TAMIL NADU
                  </span>
                  <h4 className="text-base font-black text-white tracking-tight">
                    {hoveredDistrict.name}
                  </h4>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border"
                  style={{
                    backgroundColor: HEATMAP_TIERS[hoveredDistrict.tier]?.badgeBg,
                    borderColor: HEATMAP_TIERS[hoveredDistrict.tier]?.stroke,
                    color: HEATMAP_TIERS[hoveredDistrict.tier]?.badgeText,
                  }}
                >
                  {HEATMAP_TIERS[hoveredDistrict.tier]?.label}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#a0a0a0]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#ff1e2d]" />
                    Registered Donors:
                  </span>
                  <span className="font-bold text-white font-mono">
                    {hoveredDistrict.totalDonors?.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#a0a0a0]">
                  <span className="flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-emerald-400" />
                    Available Donors:
                  </span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {hoveredDistrict.availableDonors?.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[#a0a0a0]">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" />
                    Active Requests:
                  </span>
                  <span className="font-bold text-amber-400 font-mono">
                    {hoveredDistrict.activeRequests || 0}
                  </span>
                </div>
              </div>

              {/* Blood Groups Available Pill Row */}
              <div className="mt-3 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono text-[#a0a0a0] block mb-1">
                  Blood Groups Available:
                </span>
                <div className="flex flex-wrap gap-1">
                  {hoveredDistrict.availableBloodGroupsList?.length > 0 ? (
                    hoveredDistrict.availableBloodGroupsList.slice(0, 5).map((bg) => (
                      <span
                        key={bg}
                        className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white font-semibold"
                      >
                        {bg}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-[#737380]">All standard groups</span>
                  )}
                  {hoveredDistrict.availableBloodGroupsList?.length > 5 && (
                    <span className="text-[10px] text-[#ff424f] font-mono">
                      +{hoveredDistrict.availableBloodGroupsList.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 text-[10px] text-[#ff424f] font-semibold text-center bg-[#ff1e2d]/10 py-1 rounded-lg border border-[#ff1e2d]/20">
                Click district for full healthcare dossier
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Bottom Map Legend & Live Bar */}
      <div className="p-4 sm:p-6 border-t border-white/10 bg-[#08080c]">
        <MapLegend dataSource={networkData?.summary?.dataSource} />
      </div>

    </div>
  );
}
