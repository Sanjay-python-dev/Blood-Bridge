import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';

export default function Logo({ 
  size = 'default', 
  showTagline = false, 
  showText = false,
  className = '',
  linkTo = '/' 
}) {
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  const sizeClasses = {
    small: 'h-8 sm:h-9',
    default: 'h-11 sm:h-13',
    large: 'h-16 sm:h-20',
    xl: 'h-24 sm:h-28'
  };

  const imgHeight = sizeClasses[size] || sizeClasses.default;

  const content = (
    <div className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* 3D Blood Bridge Logo Image with Ambient Red Glow and Hover Scale */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <div className="absolute inset-0 bg-[#E50914]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <img
          src={logoImg}
          alt="Blood Bridge"
          className={`${imgHeight} w-auto object-contain drop-shadow-[0_0_12px_rgba(229,9,20,0.5)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_22px_rgba(229,9,20,0.8)]`}
          loading="eager"
        />
      </div>

      {/* Optional Tagline or Brand Text */}
      {(showText || showTagline) && (
        <div className="flex flex-col text-left justify-center">
          {showText && (
            <div className="flex items-center tracking-wider font-extrabold leading-tight">
              <span className={`text-[#E50914] ${isLarge ? 'text-2xl tracking-widest' : isSmall ? 'text-lg' : 'text-xl'}`}>
                BLOOD
              </span>
              <span className={`text-white ml-1.5 ${isLarge ? 'text-2xl tracking-widest' : isSmall ? 'text-lg' : 'text-xl'}`}>
                BRIDGE
              </span>
            </div>
          )}
          {showTagline && (
            <span className="text-[9px] sm:text-[10px] tracking-[0.22em] font-bold text-[#B0B0B0] group-hover:text-white uppercase transition-colors">
              CONNECTING LIVES
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!linkTo) {
    return content;
  }

  return (
    <Link 
      to={linkTo} 
      className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[#E50914]/50 rounded-xl"
      title="Blood Bridge - Connecting Lives"
    >
      {content}
    </Link>
  );
}

