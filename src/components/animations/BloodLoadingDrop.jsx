import React, { useState, useEffect } from 'react';
import './bloodAnimation.css';

/**
 * BloodLoadingDrop
 * Replaces generic loading spinners with a restrained blood-drop fall -> ripple -> reset cycle (1.9s).
 * Zero changes to loading logic, auth, or states.
 * Respects prefers-reduced-motion: falls back to a gentle static drop with no motion.
 *
 * @param {Object} props
 * @param {string} [props.className='']
 */
export default function BloodLoadingDrop({ className = '' }) {
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

  return (
    <div className={`blood-loading-container ${className}`} aria-hidden="true">
      {isReducedMotion ? (
        <div className="blood-loading-static">
          <svg viewBox="0 0 20 24" width="22" height="26" fill="none">
            <path
              d="M 10 2 C 10 2, 3 11, 3 16 C 3 20.4 6.1 23 10 23 C 13.9 23, 17 20.4, 17 16 C 17 11, 10 2, 10 2 Z"
              fill="var(--color-brand-red, #E50914)"
            />
          </svg>
        </div>
      ) : (
        <>
          {/* Falling Droplet */}
          <div className="blood-loading-drop">
            <svg viewBox="0 0 20 24" width="18" height="22" fill="none">
              <path
                d="M 10 2 C 10 2, 3 11, 3 16 C 3 20.4 6.1 23 10 23 C 13.9 23, 17 20.4, 17 16 C 17 11, 10 2, 10 2 Z"
                fill="var(--color-brand-red, #E50914)"
                style={{ filter: 'drop-shadow(0 0 5px rgba(229, 9, 20, 0.6))' }}
              />
            </svg>
          </div>

          {/* Landing Ripple */}
          <div className="blood-loading-ripple" />
        </>
      )}
    </div>
  );
}
