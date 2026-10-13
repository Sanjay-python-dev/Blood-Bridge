import React from 'react';
import './livingBloodDrop.css';

/**
 * LivingBloodDrop
 * High-quality, continuous animated blood-drop liquid visualization.
 * Replaces static hero illustrations with a living, breathing liquid centerpiece.
 *
 * Features:
 * - Multi-layered internal fluid motion (dual sine waves with phase offset)
 * - Internal bioluminescent light dispersion
 * - Realistic glossy surface sheen and traveling specular reflection sweep
 * - Atmospheric soft radial backing glow
 * - Subtle organic breathing pulse (1.00 -> 1.018 -> 1.00)
 * - 2 orbiting micro-satellite droplets
 * - Full prefers-reduced-motion accessibility support
 */
export default function LivingBloodDrop({ className = '' }) {
  return (
    <div className={`living-blood-drop-root ${className}`} aria-hidden="true">
      {/* 1. Atmospheric Backing Glow Layers */}
      <div className="living-drop-glow-layer living-drop-glow-outer" />
      <div className="living-drop-glow-layer living-drop-glow-core" />

      {/* 2. Main Teardrop Vessel Wrapper with subtle breathing pulse */}
      <div className="living-drop-vessel">
        <svg
          viewBox="0 0 320 380"
          className="living-drop-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Master Teardrop Clip Silhouette */}
            <clipPath id="livingDropClip">
              <path d="M 160 26 C 160 26, 42 160, 42 248 C 42 316, 95 354, 160 354 C 225 354, 278 316, 278 248 C 278 160, 160 26, 160 26 Z" />
            </clipPath>

            {/* Base Viscous Fluid Radial Gradient */}
            <radialGradient id="baseFluidGrad" cx="42%" cy="36%" r="68%">
              <stop offset="0%" stopColor="#FF383E" />
              <stop offset="28%" stopColor="#E50914" />
              <stop offset="62%" stopColor="#8A0005" />
              <stop offset="90%" stopColor="#4A0003" />
              <stop offset="100%" stopColor="#220001" />
            </radialGradient>

            {/* Wave 1 Arterial Fluid Gradient */}
            <linearGradient id="wave1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF2B2B" stopOpacity="0.82" />
              <stop offset="42%" stopColor="#E50914" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#5E0004" stopOpacity="1" />
            </linearGradient>

            {/* Wave 2 Oxygenated Fluid Gradient */}
            <linearGradient id="wave2Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF5C5C" stopOpacity="0.65" />
              <stop offset="48%" stopColor="#E50914" stopOpacity="0.82" />
              <stop offset="100%" stopColor="#420002" stopOpacity="0.95" />
            </linearGradient>

            {/* Internal Core Bioluminescent Caustic Glow */}
            <radialGradient id="coreLightGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFA6A6" stopOpacity="0.6" />
              <stop offset="38%" stopColor="#FF2B2B" stopOpacity="0.38" />
              <stop offset="75%" stopColor="#E50914" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#E50914" stopOpacity="0" />
            </radialGradient>

            {/* Primary Shoulder Curved Specular Sheen */}
            <linearGradient id="sheenCurveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#FFC7C7" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#FF4A4A" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#FF4A4A" stopOpacity="0" />
            </linearGradient>

            {/* Traveling Specular Surface Sweep */}
            <linearGradient id="sweepLightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.16" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="65%" stopColor="#FFB0B0" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#FFB0B0" stopOpacity="0" />
            </linearGradient>

            {/* Soft Blur Filter for Caustics and Sweeps */}
            <filter id="softGlowBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="12" />
            </filter>

            <filter id="sweepBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* ====================================================
              INTERNAL LIQUID LAYERS (Masked within teardrop)
              ==================================================== */}
          <g clipPath="url(#livingDropClip)">
            {/* Base Viscous Body */}
            <rect x="0" y="0" width="320" height="380" fill="url(#baseFluidGrad)" />

            {/* Internal Flowing Wave 1 */}
            <g className="living-wave-1">
              <path
                d="M -160 215 Q -80 195, 0 215 T 160 215 T 320 215 T 480 215 L 480 380 L -160 380 Z"
                fill="url(#wave1Grad)"
              />
            </g>

            {/* Internal Flowing Wave 2 */}
            <g className="living-wave-2">
              <path
                d="M -160 235 Q -70 255, 20 235 T 200 235 T 380 235 T 560 235 L 560 380 L -160 380 Z"
                fill="url(#wave2Grad)"
              />
            </g>

            {/* Caustic Core Glow Drifting Inside */}
            <g className="living-core-glow">
              <ellipse
                cx="160"
                cy="190"
                rx="75"
                ry="62"
                fill="url(#coreLightGrad)"
                filter="url(#softGlowBlur)"
              />
            </g>

            {/* Slow Moving Diagonal Surface Reflection Sweep */}
            <g className="living-gloss-sweep">
              <rect
                x="-80"
                y="50"
                width="110"
                height="280"
                fill="url(#sweepLightGrad)"
                filter="url(#sweepBlur)"
              />
            </g>

            {/* Subtle Meniscus Depth Shading at apex */}
            <path
              d="M 160 26 C 160 26, 120 70, 110 110 C 125 90, 160 80, 160 80 C 160 80, 195 90, 210 110 C 200 70, 160 26, 160 26 Z"
              fill="#420003"
              opacity="0.38"
            />
          </g>

          {/* ====================================================
              SURFACE OPTICS (On top of mask for crisp glassy look)
              ==================================================== */}

          {/* Primary Left Shoulder Gloss Highlight */}
          <path
            d="M 158 45 C 158 45, 78 150, 72 225 C 68 250, 76 268, 80 270 C 76 256, 74 235, 78 215 C 86 160, 146 62, 158 45 Z"
            fill="url(#sheenCurveGrad)"
          />

          {/* Secondary Rim Bounce Specular Glint (Bottom-Right) */}
          <path
            d="M 235 285 C 248 268, 258 245, 262 222 C 260 240, 252 260, 238 276 Z"
            fill="#FFA4A4"
            opacity="0.32"
          />

          {/* Fresnel Inset Rim Glow */}
          <path
            d="M 160 26 C 160 26, 42 160, 42 248 C 42 316, 95 354, 160 354 C 225 354, 278 316, 278 248 C 278 160, 160 26, 160 26 Z"
            fill="none"
            stroke="rgba(255, 140, 140, 0.28)"
            strokeWidth="2.2"
          />
        </svg>
      </div>

      {/* 3. Subtle Orbiting / Hovering Satellite Micro-Droplets (Detail #8) */}
      <div className="living-satellite-drop living-satellite-1" />
      <div className="living-satellite-drop living-satellite-2" />
    </div>
  );
}
