import React from 'react';
import { InvoiceDataContext, getBusinessContact } from '../hooks/use-invoice-data';

interface InvoiceFooterProps {
  data: InvoiceDataContext;
  currentPage: number;
  totalPages: number;
  className?: string;
}

export function InvoiceFooter({ 
  data, 
  currentPage, 
  totalPages, 
  className = '' 
}: InvoiceFooterProps) {
  const { businessDetails } = data;
  const contact = getBusinessContact(businessDetails);
  
  // Blueprint: Footer with name of owner, number and email • website, Page X of Y right-aligned
  return (
    <div className={`border-t pt-1 mt-1 ${className}`}>
      <div className="flex justify-between items-end">
        {/* Contact Information - single line format */}
        <div className="trades-caption text-gray-600">
          {[
            contact.ownerName,
            contact.phone,
            contact.email,
            contact.website
          ].filter(Boolean).join(' • ')}
        </div>
        
        {/* Page Number - right-aligned */}
        <div className="trades-caption text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  );
}