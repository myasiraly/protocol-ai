
import React from 'react';

export const ProtocolLogo: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Outer Diamond Shell - Precision Stroke */}
      <path 
        d="M12 3L3 12L12 21L21 12L12 3Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Inner Geometric Field - Subtle Opacity */}
      <path 
        d="M12 7L7 12L12 17L17 12L12 7Z" 
        fill="currentColor" 
        fillOpacity="0.15"
      />
      
      {/* Core Unit - Solid Anchor */}
      <path 
        d="M12 10L10 12L12 14L14 12L12 10Z" 
        fill="currentColor"
      />
    </svg>
  );
};
