import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface ZoomPanAPI {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  zoomToFit: () => void;
  zoomTo100: () => void;
}

interface ZoomPanLayerProps {
  children: React.ReactNode;
  onZoomChange?: (zoom: number) => void;
  fitToContainer?: boolean;
  resetTrigger?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const FIT_PADDING = 32; // Padding around content when fitting

/**
 * ZoomPanLayer - Handles zoom and pan functionality for A4 pages
 * Features:
 * - Initial state: Fit to Page (entire content visible, centered)
 * - Zoom: 25%-300% with smooth scaling
 * - Pan: drag to pan when zoomed, constrain bounds
 * - Double-tap: zoom in by +50% to max, then back to fit
 * - Pinch gestures for mobile
 */
export const ZoomPanLayer = React.forwardRef<ZoomPanAPI, ZoomPanLayerProps>(({ 
  children, 
  onZoomChange, 
  fitToContainer = true,
  resetTrigger = false
}, ref) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [fitZoom, setFitZoom] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate fit-to-page zoom level
  const calculateFitZoom = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return 1;

    const container = containerRef.current;
    const content = contentRef.current;

    const containerWidth = container.clientWidth - FIT_PADDING * 2;
    const containerHeight = container.clientHeight - FIT_PADDING * 2;
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;

    return Math.min(scaleX, scaleY, 1); // Never zoom above 100% for fit
  }, []);

  // Fit to page
  const fitToPage = useCallback(() => {
    const newFitZoom = calculateFitZoom();
    setFitZoom(newFitZoom);
    setZoom(newFitZoom);
    setPosition({ x: 0, y: 0 });
    onZoomChange?.(newFitZoom);
  }, [calculateFitZoom, onZoomChange]);

  // Calculate bounds to prevent content from going off-screen
  const calculateBounds = useCallback((currentZoom: number): Bounds => {
    if (!containerRef.current || !contentRef.current) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const container = containerRef.current;
    const content = contentRef.current;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scaledContentWidth = content.scrollWidth * currentZoom;
    const scaledContentHeight = content.scrollHeight * currentZoom;

    const maxX = Math.max(0, (scaledContentWidth - containerWidth) / 2);
    const maxY = Math.max(0, (scaledContentHeight - containerHeight) / 2);

    return {
      minX: -maxX,
      maxX: maxX,
      minY: -maxY,
      maxY: maxY
    };
  }, []);

  // Constrain position within bounds
  const constrainPosition = useCallback((pos: Position, currentZoom: number): Position => {
    const bounds = calculateBounds(currentZoom);
    return {
      x: Math.min(Math.max(pos.x, bounds.minX), bounds.maxX),
      y: Math.min(Math.max(pos.y, bounds.minY), bounds.maxY)
    };
  }, [calculateBounds]);

  // Handle zoom change with position adjustment
  const handleZoomChange = useCallback((newZoom: number, centerPoint?: Position) => {
    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    
    if (centerPoint && containerRef.current) {
      // Zoom around the center point
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const zoomPoint = {
        x: centerPoint.x - rect.left - rect.width / 2,
        y: centerPoint.y - rect.top - rect.height / 2
      };

      const zoomRatio = clampedZoom / zoom;
      const newPosition = {
        x: position.x - zoomPoint.x * (zoomRatio - 1),
        y: position.y - zoomPoint.y * (zoomRatio - 1)
      };

      setPosition(constrainPosition(newPosition, clampedZoom));
    } else {
      setPosition(constrainPosition(position, clampedZoom));
    }

    setZoom(clampedZoom);
    onZoomChange?.(clampedZoom);
  }, [zoom, position, constrainPosition, onZoomChange]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    const newZoom = zoom + delta;
    handleZoomChange(newZoom, { x: e.clientX, y: e.clientY });
  }, [zoom, handleZoomChange]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= fitZoom) return; // Only allow panning when zoomed in
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [zoom, fitZoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };
    setPosition(constrainPosition(newPosition, zoom));
  }, [isDragging, dragStart, zoom, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Double-tap detection
      const now = Date.now();
      const timeDiff = now - lastTap;
      setLastTap(now);

      if (timeDiff < 300 && timeDiff > 0) {
        // Double-tap to zoom
        e.preventDefault();
        if (zoom > fitZoom) {
          fitToPage();
        } else {
          const targetZoom = Math.min(zoom + 0.5, MAX_ZOOM);
          handleZoomChange(targetZoom, { x: touch.clientX, y: touch.clientY });
        }
        return;
      }

      if (zoom > fitZoom) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      }
    }
  }, [zoom, fitZoom, position, lastTap, fitToPage, handleZoomChange]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const newPosition = {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      };
      setPosition(constrainPosition(newPosition, zoom));
    }
    // TODO: Add pinch zoom for two-finger gestures
  }, [isDragging, dragStart, zoom, constrainPosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger) {
      fitToPage();
    }
  }, [resetTrigger, fitToPage]);

  // Initial fit to page
  useEffect(() => {
    if (fitToContainer) {
      const timer = setTimeout(fitToPage, 100); // Small delay to ensure DOM is ready
      return () => clearTimeout(timer);
    }
  }, [fitToContainer, fitToPage]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (zoom === fitZoom) {
        fitToPage();
      } else {
        setPosition(constrainPosition(position, zoom));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom, fitZoom, position, constrainPosition, fitToPage]);

  // Expose API via ref
  React.useImperativeHandle(ref, () => ({
    zoomIn: () => handleZoomChange(zoom + 0.2),
    zoomOut: () => handleZoomChange(zoom - 0.2),
    zoomTo: (targetZoom: number) => handleZoomChange(targetZoom),
    zoomToFit: fitToPage,
    zoomTo100: () => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      onZoomChange?.(1);
    }
  }), [zoom, handleZoomChange, fitToPage, onZoomChange]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        cursor: isDragging ? 'grabbing' : (zoom > fitZoom ? 'grab' : 'default'),
        touchAction: 'none' // Prevent default touch behaviors
      }}
    >
      <div
        ref={contentRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
});