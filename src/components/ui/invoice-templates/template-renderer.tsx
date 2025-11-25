import React, { Suspense } from 'react';
import { ClassicTemplate } from './classic-template';
import { ModernTemplate } from './modern-template';
import { MinimalTemplate } from './minimal-template';
import { CorporateTemplate } from './corporate-template';
import { CreativeTemplate } from './creative-template';
import { ProfessionalTemplate } from './professional-template';
import { ErrorBoundary } from '../error-boundary';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address: string;
  };
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  line_items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  vat_amount?: number;
  total: number;
  payment_terms?: string;
  notes?: string;
}

// Quote interface
interface Quote {
  id: string;
  number: string;
  title: string;
  createdAt: string;
  validUntil?: string;
  status: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address: string;
  };
  business: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  line_items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  vat_amount?: number;
  total: number;
  notes?: string;
}

interface Branding {
  logo_url?: string;
  logo_dark_url?: string;
  primary_color?: string;
  secondary_color?: string;
  business_name?: string;
  invoice_use_brand_colors?: boolean; // Add support for brand color flag
  invoice_logo_position?: 'left' | 'right'; // Add support for logo position
}

interface BankDetails {
  account_holder_name?: string;
  bank_name?: string;
  sort_code?: string;
  account_number?: string;
  iban?: string;
}

interface TemplateRendererProps {
  templateId: string;
  document: Invoice | Quote;
  documentType: 'invoice' | 'quote';
  branding?: Branding;
  logoPosition?: 'left' | 'right';
  preview?: boolean;
  bankDetails?: BankDetails;
}

// Type guard to check if document is an Invoice
function isInvoice(document: Invoice | Quote): document is Invoice {
  return document != null && 'invoice_number' in document && 'issue_date' in document;
}

// Type guard to check if document is a Quote
function isQuote(document: Invoice | Quote): document is Quote {
  return document != null && 'title' in document && 'createdAt' in document;
}

export function TemplateRenderer({ 
  templateId, 
  document, 
  documentType,
  branding, 
  logoPosition = 'left', 
  preview = false,
  bankDetails
}: TemplateRendererProps) {
  // Handle case where no document is provided
  if (!document || typeof document !== 'object') {
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-gray-500 trades-caption">No document data provided</div>
      </div>
    );
  }

  // Safe template props assembly
  const templateProps = {
    document,
    documentType: documentType || 'invoice',
    branding: branding || {},
    logoPosition: logoPosition || 'left',
    preview: preview || false,
    bankDetails: bankDetails || undefined,
    // Legacy props for backward compatibility
    invoice: isInvoice(document) ? document : undefined,
    quote: isQuote(document) ? document : undefined
  };

  // Safe template rendering with error boundary
  try {
    const renderTemplate = () => {
      switch (templateId) {
        case 'modern':
          return <ModernTemplate {...templateProps} />;
        case 'minimal':
          return <MinimalTemplate {...templateProps} />;
        case 'corporate':
          return <CorporateTemplate {...templateProps} />;
        case 'creative':
          return <CreativeTemplate {...templateProps} />;
        case 'professional':
          return <ProfessionalTemplate {...templateProps} />;
        case 'classic':
        default:
          return <ClassicTemplate {...templateProps} />;
      }
    };

    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
            <div className="text-gray-500 trades-caption">Loading template...</div>
          </div>
        }>
          {renderTemplate()}
        </Suspense>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error rendering template:', error);
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-red-500 trades-caption">Template rendering error</div>
      </div>
    );
  }
}

// Legacy component for backward compatibility - INVOICE ONLY
export function InvoiceTemplateRenderer({ 
  templateId, 
  invoice, 
  branding, 
  logoPosition = 'left', 
  preview = false,
  bankDetails
}: {
  templateId: string;
  invoice: Invoice;
  branding?: Branding;
  logoPosition?: 'left' | 'right';
  preview?: boolean;
  bankDetails?: BankDetails;
}) {
  // Handle case where no invoice is provided
  if (!invoice) {
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-gray-500 trades-caption">No invoice data provided</div>
      </div>
    );
  }

  return (
    <TemplateRenderer 
      templateId={templateId}
      document={invoice}
      documentType="invoice"
      branding={branding}
      logoPosition={logoPosition}
      preview={preview}
      bankDetails={bankDetails}
    />
  );
}

// New component for quotes
export function QuoteTemplateRenderer({ 
  templateId, 
  quote, 
  branding, 
  logoPosition = 'left', 
  preview = false
}: {
  templateId: string;
  quote: Quote;
  branding?: Branding;
  logoPosition?: 'left' | 'right';
  preview?: boolean;
}) {
  // Handle case where no quote is provided
  if (!quote) {
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-gray-500 trades-caption">No quote data provided</div>
      </div>
    );
  }

  return (
    <TemplateRenderer 
      templateId={templateId}
      document={quote}
      documentType="quote"
      branding={branding}
      logoPosition={logoPosition}
      preview={preview}
    />
  );
}