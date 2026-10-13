import React, { useState, useEffect, useRef } from 'react';
import './bloodAnimation.css';

/**
 * BloodDonationInteractiveDrop
 * Single drop falling into container graphic; on contact -> ripple + expanding ring.
 * Triggered via IntersectionObserver when visible, on a relaxed 3.6s cycle.
 * Reduced motion: disabled.
 */
export default function BloodDonationInteractiveDrop({ className = '' }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e) => setIsReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (isReducedMotion) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {isVisible && (
        <>
          {/* Falling Drop */}
          <div className="blood-donation-drop">
            <svg viewBox="0 0 16 20" width="12" height="15" fill="none">
              <path
                d="M 8 1 C 8 1, 2 8, 2 12 C 2 15.3 4.7 18 8 18 C 11.3 18 14 15.3 14 12 C 14 8, 8 1, 8 1 Z"
                fill="var(--color-brand-red, #E50914)"
                style={{ filter: 'drop-shadow(0 0 3px rgba(229, 9, 20, 0.5))' }}
              />
            </svg>
          </div>

          {/* Contact Ripple & Expanding Ring */}
          <div
            className="blood-donation-ripple"
            style={{ width: '32px', height: '32px' }}
          />
        </>
      )}
    </div>
  );
}
