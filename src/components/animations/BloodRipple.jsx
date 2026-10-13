import React from 'react';
import './bloodAnimation.css';

/**
 * BloodRipple
 * Standalone expanding-ring effect.
 * Only animates transform and opacity.
 * pointer-events: none, aria-hidden: true.
 *
 * @param {Object} props
 * @param {number} [props.size=24] - Diameter in px
 * @param {number} [props.duration=1.5] - Animation duration in seconds (1.2–1.8s)
 * @param {number|string} [props.x='50%'] - Horizontal position (px or %)
 * @param {number|string} [props.y='50%'] - Vertical position (px or %)
 * @param {number} [props.delay=0] - Delay in seconds
 * @param {string} [props.className=''] - Optional extra class names
 */
export default function BloodRipple({
  size = 24,
  duration = 1.5,
  x = '50%',
  y = '50%',
  delay = 0,
  className = '',
}) {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    left: typeof x === 'number' ? `${x}px` : x,
    top: typeof y === 'number' ? `${y}px` : y,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
  };

  return (
    <div
      className={`blood-ripple-ring ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
