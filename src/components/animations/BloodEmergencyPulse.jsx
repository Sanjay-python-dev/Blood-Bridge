import React from 'react';
import './bloodAnimation.css';

/**
 * BloodEmergencyPulse
 * Restrained supplementary pulse wrapper for the emergency alert drop icon.
 * scale(1) -> scale(1.08) -> scale(1), 2.3s ease-in-out infinite, glow opacity 0.1->0.3.
 * No flashing or blinking.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Icon or element to wrap
 * @param {string} [props.className='']
 */
export default function BloodEmergencyPulse({ children, className = '' }) {
  return (
    <span className={`blood-emergency-pulse ${className}`} aria-hidden="true">
      {children}
    </span>
  );
}
