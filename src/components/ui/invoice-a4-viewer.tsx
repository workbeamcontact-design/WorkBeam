import React, { useState, useRef, useCallback } from 'react';
import { X, Download, Share2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { ZoomPanLayer, ZoomPanAPI } from './zoom-pan-layer';
import { InvoiceA4Page } from './invoice-a4-page';

interface InvoiceA4ViewerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode | React.ReactNode[];
  title?: string;
  onExport?: () => void;
  onShare?: () => void;
}

/**
 * InvoiceA4Viewer - Full-screen A4 viewer modal with proper fit, zoom, and pan
 * 
 * Features:
 * - Opens "Fit to Page" (entire A4 visible, centered, no cropping)
 * - Supports pinch/scroll zoom (25%-300%), double-tap to zoom, pan with bounds
 * - Controls off the page (no overlay on content)
 * - Multi-page support with pagination
 * - Fixed top app bar and bottom controls
 */
export function InvoiceA4Viewer({ 
  isOpen, 
  onClose, 
  children, 
  title = 'Invoice Preview',
  onExport,
  onShare 
}: InvoiceA4ViewerProps) {
  const [currentZoom, setCurrentZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
  
  const zoomPanRef = useRef<ZoomPanAPI>(null);

  // Convert children to array for multi-page support
  const pages = React.Children.toArray(children);
  const hasMultiplePages = pages.length > 1;

  // Reset view when modal opens or page changes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
      setResetTrigger(prev => prev + 1);
    }
  }, [isOpen]);

  // Handle page navigation
  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      setResetTrigger(prev => prev + 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(prev => prev + 1);
      setResetTrigger(prev => prev + 1);
    }
  }, [currentPage, pages.length]);

  const handlePageSelect = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
    setResetTrigger(prev => prev + 1);
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    zoomPanRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    zoomPanRef.current?.zoomOut();
  }, []);

  const handleFitToPage = useCallback(() => {
    zoomPanRef.current?.zoomToFit();
  }, []);

  const handleZoomTo100 = useCallback(() => {
    zoomPanRef.current?.zoomTo100();
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultiplePages) handlePrevPage();
          break;
        case 'ArrowRight':
          if (hasMultiplePages) handleNextPage();
          break;
        case '0':
          handleFitToPage();
          break;
        case '1':
          handleZoomTo100();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasMultiplePages, handlePrevPage, handleNextPage, handleFitToPage, handleZoomTo100, handleZoomIn, handleZoomOut]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900" style={{ backgroundColor: '#0B0F14' }}>
      {/* Top App Bar - Fixed, never overlays page */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="trades-h2 text-gray-900">{title}</h1>
          {hasMultiplePages && (
            <span className="trades-caption text-gray-600 bg-gray-100 px-2 py-1 rounded">
              Page {currentPage + 1} of {pages.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Share Button */}
          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors trades-caption min-h-11"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
          
          {/* Export PDF Button */}
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors trades-caption font-medium min-h-11"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stage Area - Fills remaining space, contains A4Stage */}
      <div className="flex-1 relative overflow-hidden">
        <ZoomPanLayer
          ref={zoomPanRef}
          onZoomChange={setCurrentZoom}
          fitToContainer={true}
          resetTrigger={resetTrigger}
        >
          {/* A4Stage with shadow and border for distinction */}
          <div className="relative">
            <InvoiceA4Page className="shadow-2xl border border-gray-300">
              {pages[currentPage]}
            </InvoiceA4Page>
          </div>
        </ZoomPanLayer>

        {/* Page Navigation Arrows - Only when multiple pages */}
        {hasMultiplePages && (
          <>
            {/* Previous Page Button */}
            {currentPage > 0 && (
              <button
                onClick={handlePrevPage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-sm"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
            )}

            {/* Next Page Button */}
            {currentPage < pages.length - 1 && (
              <button
                onClick={handleNextPage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-sm"
                aria-label="Next page"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls - Fixed floating bar, never overlaps page */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
            {/* Fit to Page Button */}
            <button
              onClick={handleFitToPage}
              className="flex items-center justify-center w-11 h-11 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fit to page"
              title="Fit to page"
            >
              <Maximize className="w-4 h-4" />
            </button>

            {/* Zoom Out Button */}
            <button
              onClick={handleZoomOut}
              disabled={currentZoom <= 0.25}
              className="flex items-center justify-center w-11 h-11 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Zoom Level Display / 100% Button */}
            <button
              onClick={handleZoomTo100}
              className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors trades-caption font-medium min-w-16"
              title="Zoom to 100%"
            >
              {Math.round(currentZoom * 100)}%
            </button>

            {/* Zoom In Button */}
            <button
              onClick={handleZoomIn}
              disabled={currentZoom >= 3.0}
              className="flex items-center justify-center w-11 h-11 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Page Indicators - Only for multiple pages */}
          {hasMultiplePages && (
            <div className="flex items-center gap-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <span className="trades-caption text-gray-600">Page</span>
              
              {/* Page Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="flex items-center justify-center w-8 h-8 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="trades-caption text-gray-900 font-medium min-w-16 text-center">
                  {currentPage + 1} of {pages.length}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === pages.length - 1}
                  className="flex items-center justify-center w-8 h-8 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}