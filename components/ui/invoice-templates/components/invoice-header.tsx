import React from 'react';
import { formatUKDate, getBusinessDisplayName, getBusinessAddress, getBusinessContact } from '../hooks/use-invoice-data';

interface InvoiceHeaderProps {
  invoice?: any; // Legacy prop
  document?: any; // New unified prop
  documentType?: 'invoice' | 'quote'; // Document type identifier
  data: any;
  logoPosition?: 'left' | 'right';
  className?: string;
  style?: 'classic' | 'modern' | 'minimal' | 'corporate' | 'creative' | 'professional';
  primaryColor?: string;
  isRightAligned?: boolean;
}

export function InvoiceHeader({
  invoice, // Legacy prop for backward compatibility
  document, // New unified prop
  documentType, // Document type identifier
  data,
  logoPosition = 'left',
  className = '',
  style = 'classic',
  primaryColor = '#0A84FF',
  isRightAligned = false
}: InvoiceHeaderProps) {
  // Determine the effective document and document type with error handling
  const effectiveDocument = document || invoice;
  const effectiveDocumentType = documentType || (effectiveDocument?.status === 'quote' || effectiveDocument?.quote_title ? 'quote' : 'invoice');
  
  // Handle case where no document is provided
  if (!effectiveDocument || typeof effectiveDocument !== 'object') {
    return null;
  }

  // Safe access to data properties
  let businessName = 'Your Business';
  let businessAddress = '';
  let contact = { phone: '', email: '' };
  
  try {
    businessName = getBusinessDisplayName(data?.businessDetails, data?.branding);
    businessAddress = getBusinessAddress(data?.businessDetails);
    contact = getBusinessContact(data?.businessDetails);
  } catch (error) {
    console.warn('Error accessing business data in header:', error);
  }

  // Route to appropriate header style
  switch (style) {
    case 'classic':
      return <ClassicHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
    case 'modern':
      return <ModernHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
    case 'minimal':
      return <MinimalHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
    case 'corporate':
      return <CorporateHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
    case 'creative':
      return <CreativeHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
    case 'professional':
      return <ProfessionalHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
    default:
      return <ClassicHeader {...{ document: effectiveDocument, documentType: effectiveDocumentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }} />;
  }
}

// Classic Header - keep the current design as requested
function ClassicHeader({ document: invoice, documentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }: any) {
  const { branding } = data;
  const isQuote = documentType === 'quote';
  
  return (
    <div className={`mb-3 ${className}`}>
      <div className="grid grid-cols-2 gap-3">
        {/* Left Column: Logo above company details */}
        <div>
          {/* Logo positioned above company details */}
          {branding?.logo_url && (
            <div className="mb-1.5">
              <img 
                src={branding.logo_url} 
                alt="Company Logo" 
                className="h-9 w-auto object-contain max-w-[120px]"
              />
            </div>
          )}
          
          {/* Company details below logo */}
          <div>
            <h2 className="trades-label text-gray-900 leading-tight" style={{ color: primaryColor }}>
              {businessName}
            </h2>
            {businessAddress && (
              <div className="trades-caption text-gray-600 leading-tight mt-0.5 whitespace-pre-line">
                {businessAddress.split('\n').slice(0, 3).join('\n')}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Document title + meta info */}
        <div className="text-right">
          <h1 className="trades-h2 mb-1.5" style={{ color: primaryColor }}>
            {invoice.is_deposit_invoice ? 'DEPOSIT INVOICE' : (isQuote ? 'QUOTATION' : 'INVOICE')}
          </h1>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 trades-caption text-gray-600">
            <div className="text-right"><strong>{isQuote ? 'Quote #:' : 'Invoice #:'}</strong></div>
            <div>{invoice.invoice_number}</div>
            <div className="text-right"><strong>{isQuote ? 'Created:' : 'Issue Date:'}</strong></div>
            <div>{formatUKDate(invoice.issue_date)}</div>
            <div className="text-right"><strong>{isQuote ? 'Valid Until:' : 'Due Date:'}</strong></div>
            <div>{formatUKDate(invoice.due_date)}</div>
            {isQuote && invoice.quote_title && (
              <>
                <div className="text-right"><strong>Project:</strong></div>
                <div>{invoice.quote_title}</div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Optional header border for classic/professional styles */}
      {(style === 'classic' || style === 'professional') && (
        <div 
          className="border-b-2 mt-1.5"
          style={{ borderColor: primaryColor }}
        />
      )}
    </div>
  );
}

// Modern Header - Inspired by reference image 1: Clean, bold INVOICE text with geometric elements
function ModernHeader({ document: invoice, documentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }: any) {
  const { branding } = data;
  const isQuote = documentType === 'quote';
  
  return (
    <div className={`mb-4 ${className}`}>
      <div className="grid grid-cols-2 gap-6 items-start">
        {/* Left: Logo above company details */}
        <div>
          {branding?.logo_url && (
            <div className="mb-2">
              <img 
                src={branding.logo_url} 
                alt="Company Logo" 
                className="h-9 w-auto object-contain max-w-[120px]"
              />
            </div>
          )}
          
          <div className="space-y-1">
            <h2 className="trades-label text-gray-900 font-semibold">
              {businessName}
            </h2>
            {businessAddress && (
              <div className="trades-caption text-gray-600 leading-tight whitespace-pre-line">
                {businessAddress.split('\n').slice(0, 3).join('\n')}
              </div>
            )}
          </div>
        </div>

        {/* Right: Bold INVOICE with number */}
        <div className="text-right">
          <div className="trades-caption text-gray-500 uppercase tracking-wide mb-1">
            No. {invoice.invoice_number}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            {invoice.is_deposit_invoice ? 'DEPOSIT INVOICE' : (isQuote ? 'QUOTATION' : 'INVOICE')}
          </h1>
          
          <div className="space-y-1 trades-caption text-gray-600">
            <div><strong>Date:</strong> {formatUKDate(invoice.issue_date)}</div>
            <div><strong>Due:</strong> {formatUKDate(invoice.due_date)}</div>
            {isQuote && invoice.quote_title && (
              <>
                <div><strong>Project:</strong> {invoice.quote_title}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Header - Clean Scandinavian design (already working well)
function MinimalHeader({ document: invoice, documentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }: any) {
  const { branding } = data;
  const isQuote = documentType === 'quote';
  
  return (
    <div className={`mb-5 ${className}`}>
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Logo and Company - Minimal Stack */}
        <div className="space-y-3">
          {branding?.logo_url && (
            <div>
              <img 
                src={branding.logo_url} 
                alt="Company Logo" 
                className="h-9 w-auto object-contain max-w-[120px]"
              />
            </div>
          )}
          
          <div className="space-y-1.5">
            <h2 className="trades-label text-gray-900 font-medium">
              {businessName}
            </h2>
            {businessAddress && (
              <div className="trades-caption text-gray-500 leading-relaxed whitespace-pre-line">
                {businessAddress.split('\n').slice(0, 3).join('\n')}
              </div>
            )}
          </div>
        </div>

        {/* Right: Clean Invoice Info */}
        <div className="text-right space-y-3">
          <div>
            <div className="trades-caption text-gray-400 uppercase tracking-wide mb-1">
              Invoice
            </div>
            <div className="trades-h1 text-gray-900 font-light">
              {invoice.invoice_number}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div>
              <div className="trades-caption text-gray-400 uppercase tracking-wide">
                Issue Date
              </div>
              <div className="trades-caption text-gray-700">
                {formatUKDate(invoice.issue_date)}
              </div>
            </div>
            <div>
              <div className="trades-caption text-gray-400 uppercase tracking-wide">
                Due Date
              </div>
              <div className="trades-caption text-gray-900 font-medium">
                {formatUKDate(invoice.due_date)}
              </div>
            </div>
            {isQuote && invoice.quote_title && (
              <>
                <div>
                  <div className="trades-caption text-gray-400 uppercase tracking-wide">
                    Project
                  </div>
                  <div className="trades-caption text-gray-900 font-medium">
                    {invoice.quote_title}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Corporate Header - Inspired by reference image 2: Traditional business layout with structured information
function CorporateHeader({ document: invoice, documentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }: any) {
  const { branding } = data;
  const isQuote = documentType === 'quote';
  
  return (
    <div className={`mb-5 ${className}`}>
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Company Information */}
        <div>
          {branding?.logo_url && (
            <div className="mb-2">
              <img 
                src={branding.logo_url} 
                alt="Company Logo" 
                className="h-9 w-auto object-contain max-w-[120px]"
              />
            </div>
          )}
          
          <div className="space-y-0.5">
            <h2 className="trades-label text-gray-900 font-bold">
              {businessName}
            </h2>
            {businessAddress && (
              <div className="trades-caption text-gray-600 leading-tight whitespace-pre-line">
                {businessAddress.split('\n').slice(0, 3).join('\n')}
              </div>
            )}
            {contact?.phone && (
              <div className="trades-caption text-gray-600">
                Phone: {contact.phone}
              </div>
            )}
            {contact?.email && (
              <div className="trades-caption text-gray-600">
                Email: {contact.email}
              </div>
            )}
          </div>
        </div>

        {/* Right: Invoice Information Table */}
        <div className="text-right">
          <h1 
            className="trades-h1 font-bold mb-2 tracking-wider"
            style={{ color: primaryColor }}
          >
            {invoice.is_deposit_invoice ? 'DEPOSIT INVOICE' : (isQuote ? 'QUOTATION' : 'INVOICE')}
          </h1>
          
          <div className="inline-block text-left">
            <div className="border border-gray-300">
              <div 
                className="px-3 py-1.5 text-white trades-caption font-bold text-center"
                style={{ backgroundColor: primaryColor }}
              >
                {isQuote ? 'QUOTATION DETAILS' : 'INVOICE DETAILS'}
              </div>
              <div className="p-2.5 bg-gray-50 space-y-0.5">
                <div className="grid grid-cols-2 gap-3 trades-caption">
                  <span className="font-bold text-gray-700">DATE:</span>
                  <span className="text-gray-900">{formatUKDate(invoice.issue_date)}</span>
                  
                  <span className="font-bold text-gray-700">{isQuote ? 'QUOTE #:' : 'INVOICE #:'}</span>
                  <span className="text-gray-900 font-mono">{invoice.invoice_number}</span>
                  
                  <span className="font-bold text-gray-700">{isQuote ? 'VALID UNTIL:' : 'DUE DATE:'}</span>
                  <span className="text-gray-900 font-bold">{formatUKDate(invoice.due_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Creative Header - Inspired by reference image 3: Colored header bar with logo and company on opposite sides
function CreativeHeader({ document: invoice, documentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }: any) {
  const { branding } = data;
  const isQuote = documentType === 'quote';
  
  return (
    <div className={`mb-4 ${className}`}>
      {/* Colored Header Bar */}
      <div 
        className="p-4 text-white rounded-t-lg"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex justify-between items-center">
          {/* Left: Logo and Invoice Title */}
          <div className="flex items-center space-x-3">
            {branding?.logo_url && (
              <div className="bg-white p-2 rounded">
                <img 
                  src={branding.logo_url} 
                  alt="Company Logo" 
                  className="h-7 w-auto object-contain max-w-[80px]"
                />
              </div>
            )}
            <h1 className="trades-h1 font-bold tracking-wide">
              {invoice.is_deposit_invoice ? 'DEPOSIT INVOICE' : (isQuote ? 'QUOTATION' : 'Invoice')}
            </h1>
          </div>

          {/* Right: Company Name and Address */}
          <div className="text-right">
            <h2 className="trades-label font-bold mb-0.5">
              {businessName}
            </h2>
            {businessAddress && (
              <div className="trades-caption opacity-90 leading-tight whitespace-pre-line">
                {businessAddress.split('\n').slice(0, 2).join('\n')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* White Content Area with Invoice Details */}
      <div className="bg-white border-x border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="trades-caption text-gray-600">
              <strong>{isQuote ? 'QUOTE #:' : 'INVOICE #:'}</strong> {invoice.invoice_number}
            </div>
            <div className="trades-caption text-gray-600">
              <strong>DATE:</strong> {formatUKDate(invoice.issue_date)}
            </div>
          </div>
          
          <div className="text-right">
            <div className="trades-caption text-gray-600">
              <strong>{isQuote ? 'QUOTATION DUE DATE:' : 'INVOICE DUE DATE:'}</strong>
            </div>
            <div className="trades-caption text-gray-900 font-bold">
              {formatUKDate(invoice.due_date)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Professional Header - Clean business design with structured layout
function ProfessionalHeader({ document: invoice, documentType, data, logoPosition, className, style, primaryColor, businessName, businessAddress, contact, isRightAligned }: any) {
  const { branding } = data;
  const isQuote = documentType === 'quote';
  
  return (
    <div className={`mb-4 ${className}`}>
      {/* Top accent line */}
      <div 
        className="h-1 w-full mb-3"
        style={{ backgroundColor: primaryColor }}
      />
      
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Logo and Company */}
        <div>
          {branding?.logo_url && (
            <div className="mb-2">
              <img 
                src={branding.logo_url} 
                alt="Company Logo" 
                className="h-9 w-auto object-contain max-w-[120px]"
              />
            </div>
          )}
          
          <div className="space-y-0.5">
            <h2 className="trades-label text-gray-900 font-semibold">
              {businessName}
            </h2>
            {businessAddress && (
              <div className="trades-caption text-gray-600 leading-tight whitespace-pre-line">
                {businessAddress.split('\n').slice(0, 3).join('\n')}
              </div>
            )}
          </div>
        </div>

        {/* Right: Professional Invoice Card */}
        <div className="text-right">
          <div className="inline-block">
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div 
                className="px-3 py-1.5 text-white text-center"
                style={{ backgroundColor: primaryColor }}
              >
                <h1 className="trades-label font-bold tracking-wide">
                  {invoice.is_deposit_invoice ? 'DEPOSIT INVOICE' : (isQuote ? 'QUOTATION' : 'INVOICE')}
                </h1>
              </div>
              
              {/* Content */}
              <div className="p-3 space-y-1.5">
                <div className="text-center">
                  <div className="trades-caption text-gray-500 mb-0.5">
                    Invoice Number
                  </div>
                  <div className="trades-label font-mono text-gray-900 font-bold">
                    {invoice.invoice_number}
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-1.5 space-y-0.5">
                  <div className="flex justify-between trades-caption">
                    <span className="text-gray-600">Date:</span>
                    <span className="text-gray-900">{formatUKDate(invoice.issue_date)}</span>
                  </div>
                  <div className="flex justify-between trades-caption">
                    <span className="text-gray-600">Due:</span>
                    <span className="text-gray-900 font-bold">{formatUKDate(invoice.due_date)}</span>
                  </div>
                  {isQuote && invoice.quote_title && (
                    <>
                      <div className="flex justify-between trades-caption">
                        <span className="text-gray-600">Project:</span>
                        <span className="text-gray-900 font-medium">{invoice.quote_title}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}