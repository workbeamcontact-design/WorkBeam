import React from 'react';

interface InvoiceA4PageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * InvoiceA4Page - Represents one A4 page (portrait) with correct A-series aspect ratio
 * A4 ratio = 1:1.414; using app design tokens for styling.
 * Styled to look like a real document page.
 */
export function InvoiceA4Page({ children, className = '' }: InvoiceA4PageProps) {
  return (
    <div 
      className={`bg-white relative overflow-hidden border border-gray-200 shadow-md rounded-sm ${className}`}
      style={{ 
        width: '595px', // A4 width in pixels at 72 DPI
        height: '842px', // A4 height in pixels at 72 DPI (595 * 1.414)
        aspectRatio: '1 / 1.414', // A4 aspect ratio
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      {children}
    </div>
  );
}