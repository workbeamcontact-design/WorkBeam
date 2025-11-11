import React from 'react';

interface TermsAndNotesProps {
  invoice: any;
  primaryColor: string;
  className?: string;
  maxLines?: number;
  showContinuation?: boolean;
}

export function TermsAndNotes({ 
  invoice, 
  primaryColor, 
  className = '',
  maxLines = 2, // Allow up to 2 lines by default
  showContinuation = false
}: TermsAndNotesProps) {
  const hasPaymentTerms = invoice.payment_terms;
  const hasNotes = invoice.notes;
  
  if (!hasPaymentTerms && !hasNotes) {
    return null;
  }
  
  return (
    <div className={`${className}`}>
      <h3 className="trades-caption font-semibold mb-1" style={{ color: primaryColor }}>
        Terms & Conditions{showContinuation && <span className="text-gray-500"> (continued)</span>}
      </h3>
      
      <div className="trades-caption text-gray-600">
        {/* Payment Terms - remove line clamp that's cutting off text */}
        {hasPaymentTerms && (
          <div 
            className="break-words"
            style={{ 
              lineHeight: '1.4', // Better line height for readability
              maxHeight: `${maxLines * 1.4 * 12}px`, // Calculate exact height needed (12px * line-height * lines)
              overflow: 'visible' // Allow text to show completely, don't clip
            }}
          >
            {invoice.payment_terms}
          </div>
        )}
        
        {/* Notes - only if payment terms don't exist and space allows */}
        {hasNotes && !hasPaymentTerms && (
          <div 
            className="break-words"
            style={{ 
              lineHeight: '1.4', // Better line height for readability
              maxHeight: `${maxLines * 1.4 * 12}px`, // Calculate exact height needed
              overflow: 'visible' // Allow text to show completely, don't clip
            }}
          >
            {invoice.notes}
          </div>
        )}
      </div>
    </div>
  );
}