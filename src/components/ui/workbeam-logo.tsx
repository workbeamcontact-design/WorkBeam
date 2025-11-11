import React from 'react';
import logoLight from 'figma:asset/6d8b98d6d95c31af14288607e5a23d75ebcc7021.png';
import logoDark from 'figma:asset/28c15585e542781a73e6154aa2905f36dbf4da14.png';

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
  const src = variant === 'dark' ? logoDark : logoLight;
  
  return (
    <img 
      src={src} 
      alt="WorkBeam" 
      className={className}
      style={{ 
        width: `${width}px`, 
        height: height ? `${height}px` : 'auto',
        objectFit: 'contain'
      }}
    />
  );
}
