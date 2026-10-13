import React from 'react';
import BloodRipple from './BloodRipple';
import './bloodAnimation.css';

/**
 * BloodDrop
 * Single falling blood drop with subtle mid-fall vertical elongation and landing ripple.
 * Animates ONLY transform and opacity.
 *
 * @param {Object} props
 * @param {number} [props.size=14] - Width in px (8–24px)
 * @param {number} [props.delay=0] - Delay in seconds
 * @param {number} [props.duration=14] - Duration in seconds (10–18s)
 * @param {number|string} [props.left='50%'] - Left position % or px
 * @param {number} [props.opacity=0.22] - Opacity (0.15–0.35)
 * @param {boolean} [props.withRipple=true] - Whether to show ripple on landing
 */
export default function BloodDrop({
  size = 14,
  delay = 0,
  duration = 14,
  left = '50%',
  opacity = 0.22,
  withRipple = true,
}) {
  const height = Math.round(size * 1.25);
  const clampedOpacity = Math.max(0.15, Math.min(0.35, opacity));
  const leftPosition = typeof left === 'number' ? `${left}%` : left;

  const dropStyle = {
    left: leftPosition,
    width: `${size}px`,
    height: `${height}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    '--drop-opacity': clampedOpacity,
  };

  // Ripple triggers at the bottom landing phase of the drop cycle
  // Duration: 1.4s, delay timed with landing (around 95% of fall duration)
  const rippleDelay = delay + (duration * 0.94);

  return (
    <div className="blood-drop-wrapper" style={{ left: leftPosition }} aria-hidden="true">
      {/* Falling droplet */}
      <div className="blood-drop-anim" style={dropStyle}>
        <svg
          viewBox="0 0 20 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 4px rgba(229, 9, 20, 0.4))' }}
        >
          <path
            d="M 10 2 C 10 2, 3 11, 3 16 C 3 20.4 6.1 23 10 23 C 13.9 23, 17 20.4, 17 16 C 17 11, 10 2, 10 2 Z"
            fill="var(--color-brand-red, #E50914)"
          />
        </svg>
      </div>

      {/* Landing ripple at bottom */}
      {withRipple && (
        <BloodRipple
          size={size * 2}
          duration={1.5}
          x="0"
          y="95vh"
          delay={rippleDelay}
        />
      )}
    </div>
  );
}
