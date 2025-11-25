import React, { useEffect, useRef, useState } from 'react';

interface A4FitWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A4FitWrapper - Scale-to-fit wrapper that automatically fits the entire A4 page 
 * inside the container like object-fit: contain.
 * Behaviour: scale entire sheet to be visible, centered, no cropping, no side gutters.
 */
export function A4FitWrapper({ children, className = '' }: A4FitWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      
      // A4 dimensions (portrait)
      const a4Width = 595;
      const a4Height = 842;
      
      // Add some padding to prevent touching the edges
      const padding = 16;
      const availableWidth = containerWidth - padding * 2;
      const availableHeight = containerHeight - padding * 2;
      
      // Calculate scale to fit both width and height (like object-fit: contain)
      const scaleX = availableWidth / a4Width;
      const scaleY = availableHeight / a4Height;
      const finalScale = Math.min(scaleX, scaleY, 1); // Never scale above 100%
      
      setScale(finalScale);
    };

    // Initial calculation
    updateScale();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex items-center justify-center p-4 ${className}`}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}