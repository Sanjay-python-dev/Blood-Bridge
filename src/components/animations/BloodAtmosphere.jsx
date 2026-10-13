import React, { useState, useEffect, useRef, useMemo } from 'react';
import BloodDrop from './BloodDrop';
import './bloodAnimation.css';

/**
 * Deterministic pseudo-random helper to prevent hydration/render jitter
 */
function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * BloodAtmosphere
 * Background layer (slow floating particles + optional breathing hero glow + falling drops)
 * Restrained Apple-level aesthetics.
 *
 * @param {Object} props
 * @param {number} [props.intensity=0.2] - 0.1 to 0.3
 * @param {number} [props.dropCount] - Custom override for drop count
 * @param {number} [props.particleCount] - Custom override for particle count
 * @param {boolean} [props.heroMode=false] - If true, adds centered breathing radial glow
 * @param {string} [props.className=''] - Extra classes
 */
export default function BloodAtmosphere({
  intensity = 0.2,
  dropCount,
  particleCount,
  heroMode = false,
  className = '',
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [screenTier, setScreenTier] = useState('desktop'); // 'mobile' | 'tablet' | 'desktop'

  // 1. Accessibility: Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setIsReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // 2. Responsive breakpoint tier detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenTier('mobile');
      } else if (width < 1024) {
        setScreenTier('tablet');
      } else {
        setScreenTier('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3. Performance: IntersectionObserver pauses rendering when off-screen
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 4. Compute clamped particle & drop counts based on breakpoint
  const clampedIntensity = Math.max(0.1, Math.min(0.3, intensity));

  const resolvedDropCount = useMemo(() => {
    if (isReducedMotion) return 0;
    if (dropCount !== undefined) {
      // Respect explicit count clamped by tier
      const maxByTier = screenTier === 'mobile' ? 2 : screenTier === 'tablet' ? 3 : 4;
      return Math.min(dropCount, maxByTier);
    }
    if (heroMode) {
      return screenTier === 'mobile' ? 1 : screenTier === 'tablet' ? 2 : 3;
    }
    return 0;
  }, [isReducedMotion, dropCount, heroMode, screenTier]);

  const resolvedParticleCount = useMemo(() => {
    if (isReducedMotion) return 0;
    if (particleCount !== undefined) {
      const maxByTier = screenTier === 'mobile' ? 5 : screenTier === 'tablet' ? 8 : 12;
      return Math.min(particleCount, maxByTier);
    }
    if (heroMode) {
      return screenTier === 'mobile' ? 4 : screenTier === 'tablet' ? 7 : 10;
    }
    // Default ambient mode (e.g. login/dashboard)
    return screenTier === 'mobile' ? 2 : screenTier === 'tablet' ? 3 : 4;
  }, [isReducedMotion, particleCount, heroMode, screenTier]);

  // 5. Generate stable particle configuration
  const particles = useMemo(() => {
    return Array.from({ length: resolvedParticleCount }, (_, i) => {
      const r1 = pseudoRandom(i * 13 + 7);
      const r2 = pseudoRandom(i * 29 + 11);
      const r3 = pseudoRandom(i * 47 + 19);
      const r4 = pseudoRandom(i * 71 + 23);

      const size = Math.round(2 + r1 * 3); // 2–5px
      const left = Math.round(4 + r2 * 92); // 4%–96%
      const top = Math.round(15 + r3 * 75); // 15%–90%
      const duration = (15 + r4 * 10).toFixed(1); // 15–25s
      const delay = (r1 * 8).toFixed(1); // 0–8s stagger
      const opacity = (clampedIntensity * (0.35 + r2 * 0.45)).toFixed(3); // 0.05–0.15

      return {
        id: `p-${i}`,
        size,
        left: `${left}%`,
        top: `${top}%`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        opacity,
      };
    });
  }, [resolvedParticleCount, clampedIntensity]);

  // 6. Generate stable drops configuration
  const drops = useMemo(() => {
    return Array.from({ length: resolvedDropCount }, (_, i) => {
      const r1 = pseudoRandom(i * 53 + 31);
      const r2 = pseudoRandom(i * 89 + 67);
      const r3 = pseudoRandom(i * 103 + 83);

      const size = Math.round(10 + r1 * 12); // 10–22px
      // Distribute across viewport (avoiding dense clusters)
      const slice = 85 / Math.max(1, resolvedDropCount);
      const left = Math.round(8 + i * slice + r2 * (slice * 0.6));
      const duration = (11 + r3 * 6).toFixed(1); // 11–17s
      const delay = (i * 3.8 + r1 * 2.5).toFixed(1); // staggered delays
      const opacity = (clampedIntensity + 0.05).toFixed(2); // ~0.15–0.35

      return {
        id: `d-${i}`,
        size,
        left: `${left}%`,
        duration: Number(duration),
        delay: Number(delay),
        opacity: Number(opacity),
      };
    });
  }, [resolvedDropCount, clampedIntensity]);

  return (
    <div
      ref={containerRef}
      className={`blood-anim-layer ${className}`}
      aria-hidden="true"
    >
      {/* If off-screen, completely halt nodes for 60fps & Lighthouse preservation */}
      {isVisible && (
        <>
          {/* Hero breathing background glow (restrained 0.05–0.15 opacity) */}
          {heroMode && (
            <div
              className="blood-hero-glow"
              style={{
                opacity: isReducedMotion ? 0.08 : undefined,
                animation: isReducedMotion ? 'none' : undefined,
              }}
            />
          )}

          {/* Falling blood drops */}
          {!isReducedMotion &&
            drops.map((drop) => (
              <BloodDrop
                key={drop.id}
                size={drop.size}
                delay={drop.delay}
                duration={drop.duration}
                left={drop.left}
                opacity={drop.opacity}
              />
            ))}

          {/* Small floating particles with hover micro-interaction */}
          {!isReducedMotion &&
            particles.map((p) => (
              <div
                key={p.id}
                className="blood-particle"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  left: p.left,
                  top: p.top,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                  '--particle-opacity': p.opacity,
                  opacity: p.opacity,
                }}
              />
            ))}
        </>
      )}
    </div>
  );
}
