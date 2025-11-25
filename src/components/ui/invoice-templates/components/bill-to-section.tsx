import React from 'react';

interface BillToSectionProps {
  invoice?: any; // Legacy prop
  document?: any; // New unified prop  
  documentType?: 'invoice' | 'quote'; // Document type identifier
  primaryColor: string;
  className?: string;
}

export function BillToSection({ 
  invoice, // Legacy prop for backward compatibility
  document, // New unified prop
  documentType, // Document type identifier
  primaryColor, 
  className = '' 
}: BillToSectionProps) {
  // Determine the effective document and document type with error handling
  const effectiveDocument = document || invoice;
  const effectiveDocumentType = documentType || (effectiveDocument?.status === 'quote' || effectiveDocument?.quote_title ? 'quote' : 'invoice');
  const isQuote = effectiveDocumentType === 'quote';
  
  // Safe access to client data
  let client = null;
  try {
    client = effectiveDocument?.client;
  } catch (error) {
    console.warn('Error accessing client data:', error);
  }
  
  if (!client || typeof client !== 'object') {
    return null;
  }
  
  // Blueprint: Single compact block with max 4 lines
  const addressLines = [];
  try {
    if (client.billing_address || client.address) {
      addressLines.push(...(client.billing_address || client.address).split('\n').slice(0, 3));
    }
  } catch (error) {
    console.warn('Error processing address:', error);
  }
  
  return (
    <div className={`mb-3 ${className}`}>
      <h3 
        className="trades-label mb-1"
        style={{ color: primaryColor }}
      >
        {isQuote ? 'Quote For' : 'Bill To'}
      </h3>
      
      <div className="text-gray-700">
        {/* Client Name */}
        <div className="trades-label font-semibold leading-tight">
          {client.name}
        </div>
        
        {/* Address - compact, max 3 lines */}
        {addressLines.length > 0 && (
          <div className="trades-caption text-gray-600 leading-tight mt-0.5">
            {addressLines.join('\n')}
          </div>
        )}
        
        {/* Email removed to save space for line items */}
      </div>
    </div>
  );
}