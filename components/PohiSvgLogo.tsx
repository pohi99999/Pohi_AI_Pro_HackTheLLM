import React from 'react';

interface PohiSvgLogoProps {
  className?: string;
  size?: number; // Primary dimension (e.g., width or height for square SVGs)
}

const PohiSvgLogo: React.FC<PohiSvgLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-label="Pohi AI Pro Logo"
    >
      <defs>
        <linearGradient id="pohiIconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#22d3ee', stopOpacity: 1}} /> {/* cyan-400 */}
          <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 1}} /> {/* cyan-500 */}
        </linearGradient>
      </defs>
      
      {/* Background fill if the SVG is used in a context where its own background is needed, e.g. not on a Card.
          For LoginPage, the rounded-full and ring will be on the div wrapping this SVG.
      <rect width="100" height="100" rx="20" ry="20" fill="#0f172a" />
      */}

      {/* Stylized "P" */}
      <path 
        d="M30 20 H55 C65 20, 65 25, 65 30 V45 C65 55, 58 55, 50 55 H40 V70 H30 V20 Z M40 30 V45 H50 C53 45, 55 43, 55 40 V30 C55 27, 53 25, 50 25 H40" 
        fill="white" 
      />

      {/* Abstract "AI" dots/connections - right side */}
      <circle cx="76" cy="28" r="4.5" fill="url(#pohiIconGradient)" />
      <circle cx="72" cy="43" r="3.5" fill="url(#pohiIconGradient)" />
      <circle cx="79" cy="53" r="3" fill="url(#pohiIconGradient)" />
      
      {/* Connecting lines for AI motif */}
      <path d="M60 47 Q65 40 72 43" stroke="url(#pohiIconGradient)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M60 47 Q70 33 76 28" stroke="url(#pohiIconGradient)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M60 47 Q75 49 79 53" stroke="url(#pohiIconGradient)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      
       {/* Small "Pro" highlight - optional, subtle dot */}
       <circle cx="58" cy="25" r="3" fill="#a5f3fc" /> {/* light cyan */}


    </svg>
  );
};

export default PohiSvgLogo;