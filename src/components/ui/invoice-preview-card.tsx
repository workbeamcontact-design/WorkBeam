import React from 'react';
import { Eye } from 'lucide-react';

interface InvoicePreviewCardProps {
  children: React.ReactNode;
  onViewFullSize: () => void;
  className?: string;
}

/**
 * InvoicePreviewCard - Wraps the preview area in a card with existing card style,
 * light background, subtle shadow. Split into PreviewFrame (full-bleed) and MetaRow (below).
 */
export function InvoicePreviewCard({ children, onViewFullSize, className = '' }: InvoicePreviewCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>
      {/* PreviewFrame - full-bleed container for the scaled A4 page */}
      <div 
        className="relative cursor-pointer"
        onClick={onViewFullSize}
        aria-label="View full size"
      >
        {children}
      </div>
      
      {/* MetaRow - caption and actions below the preview, never overlapping */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <p className="trades-caption text-gray-600 flex-1">
          Preview is a full A4 page scaled to fit.
        </p>
        
        <button
          onClick={onViewFullSize}
          className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors trades-caption font-medium min-h-11"
          aria-label="View full size"
        >
          <Eye className="w-4 h-4" />
          View Full Size
        </button>
      </div>
    </div>
  );
}