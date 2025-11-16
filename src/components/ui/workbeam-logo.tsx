import React from 'react';

interface WorkBeamLogoProps {
  variant?: 'light' | 'dark';
  className?: string;
  width?: number;
  height?: number;
}

/**
 * WorkBeam Logo Component
 * 
 * Displays the WorkBeam logo with interweaving blue and green beams
 * 
 * @param variant - 'light' for light backgrounds (dark text), 'dark' for dark backgrounds (white text)
 * @param className - Additional CSS classes
 * @param width - Width in pixels (default: 160)
 * @param height - Height in pixels (default: auto)
 */
export function WorkBeamLogo({ 
  variant = 'light', 
  className = '',
  width = 160,
  height
}: WorkBeamLogoProps) {
  const textColor = variant === 'dark' ? '#FFFFFF' : '#111827';
  const primaryBlue = '#0A84FF';
  
  return (
    <svg 
      viewBox="0 0 200 50" 
      className={className}
      style={{ 
        width: `${width}px`, 
        height: height ? `${height}px` : 'auto',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Logo icon - Interwoven beams */}
      <g>
        {/* Blue beam */}
        <path
          d="M8 15 L22 15 L18 25 L32 25 L28 35 L14 35 L18 25 L4 25 Z"
          fill={primaryBlue}
          opacity="0.9"
        />
        {/* Green beam overlay */}
        <path
          d="M14 12 L28 12 L24 22 L38 22 L34 32 L20 32 L24 22 L10 22 Z"
          fill="#10B981"
          opacity="0.7"
        />
      </g>
      
      {/* Text "WorkBeam" */}
      <text
        x="45"
        y="32"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="24"
        fontWeight="700"
        fill={textColor}
        letterSpacing="-0.5"
      >
        WorkBeam
      </text>
    </svg>
  );
}
