import React from 'react';
import { useInvoiceData, InvoiceDataContext } from '../hooks/use-invoice-data';
import { InvoiceHeader } from './invoice-header';
import { BillToSection } from './bill-to-section';
import { PaginatedInvoice, PaginationConfig, DEFAULT_PAGINATION_CONFIG } from '../utils/pagination';

export interface BaseTemplateProps {
  invoice?: any; // Legacy prop for backward compatibility
  document?: any; // New unified prop for both invoices and quotes
  documentType?: 'invoice' | 'quote'; // Document type identifier
  quote?: any; // New quote prop for backward compatibility
  branding?: any;
  logoPosition?: 'left' | 'right';
  preview?: boolean;
  bankDetails?: any; // Legacy prop for compatibility
  style: 'classic' | 'modern' | 'minimal' | 'corporate' | 'creative' | 'professional';
  primaryColor?: string;
  secondaryColor?: string;
  paginationConfig?: PaginationConfig;
  className?: string;
}

/**
 * Base template component that provides unified structure and data loading
 * All specific templates extend this base component
 * Now supports both invoices and quotes with the same design
 */
export function BaseInvoiceTemplate({
  invoice,
  document,
  documentType,
  quote,
  branding: legacyBranding,
  logoPosition = 'left',
  preview = false,
  bankDetails: legacyBankDetails, // Legacy compatibility
  style,
  primaryColor: overridePrimaryColor,
  secondaryColor: overrideSecondaryColor,
  paginationConfig = DEFAULT_PAGINATION_CONFIG,
  className = ''
}: BaseTemplateProps) {
  // Load all invoice data using the unified hook with error handling
  let invoiceData: InvoiceDataContext;
  try {
    invoiceData = useInvoiceData();
  } catch (error) {
    console.error('Error loading invoice data:', error);
    // Fallback data structure
    invoiceData = {
      branding: legacyBranding || {},
      businessDetails: null,
      bankDetails: legacyBankDetails || null,
      loading: false,
      error: 'Failed to load data'
    };
  }
  
  // Determine the effective document and document type with safer checks
  let effectiveDocument = document || invoice || quote || null;
  let effectiveDocumentType = documentType;
  
  // Handle case where no document is provided
  if (!effectiveDocument || typeof effectiveDocument !== 'object') {
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-gray-500 trades-caption">No document data available</div>
      </div>
    );
  }
  
  // Auto-detect document type if not provided with safer property checking
  if (!effectiveDocumentType) {
    try {
      if (quote || (effectiveDocument && typeof effectiveDocument === 'object' && 'title' in effectiveDocument && 'createdAt' in effectiveDocument)) {
        effectiveDocumentType = 'quote';
      } else {
        effectiveDocumentType = 'invoice';
      }
    } catch (error) {
      console.warn('Error detecting document type, defaulting to invoice:', error);
      effectiveDocumentType = 'invoice';
    }
  }
  
  // Use provided data or fallback to legacy props for compatibility with safe fallbacks
  const effectiveData: InvoiceDataContext = {
    branding: invoiceData?.branding || legacyBranding || {},
    businessDetails: invoiceData?.businessDetails || null,
    bankDetails: invoiceData?.bankDetails || legacyBankDetails || null,
    loading: invoiceData?.loading || false,
    error: invoiceData?.error || null
  };
  
  // Determine colors with safe property access - FIXED: Properly prioritize branding context over legacy props
  const brandingSource = effectiveData.branding || legacyBranding || {};
  
  // Check if brand colors should be used
  const shouldUseBrandColors = brandingSource.invoice_use_brand_colors !== false; // Default to true unless explicitly false
  
  // Get the primary color with proper fallback logic
  const brandPrimaryColor = brandingSource.primary_color;
  const brandSecondaryColor = brandingSource.secondary_color || brandingSource.accent_color;
  
  // Apply color logic matching the PDF generation
  const primaryColor = overridePrimaryColor || 
    (shouldUseBrandColors && brandPrimaryColor ? brandPrimaryColor : '#0A84FF');
  const secondaryColor = overrideSecondaryColor || 
    (shouldUseBrandColors && brandSecondaryColor ? brandSecondaryColor : '#F9FAFB');
  
  // Don't show loading for preview mode
  if (!preview && effectiveData.loading) {
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-gray-500 trades-caption">Loading {effectiveDocumentType} data...</div>
      </div>
    );
  }
  
  // Show error state only if not in preview mode
  if (!preview && effectiveData.error) {
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-red-500 trades-caption">Error: {effectiveData.error}</div>
      </div>
    );
  }
  
  // Safe render with error boundary
  try {
    return (
      <div className={`bg-white ${className}`}>
        <PaginatedInvoice
          invoice={effectiveDocument}
          document={effectiveDocument}
          documentType={effectiveDocumentType}
          data={effectiveData}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          style={style}
          config={paginationConfig}
        >
          {(page) => (
            <>
              {/* Header - only on first page or repeat on subsequent pages based on style */}
              {(page.isFirstPage || shouldRepeatHeader(style)) && (
                <InvoiceHeader
                  invoice={effectiveDocument}
                  document={effectiveDocument}
                  documentType={effectiveDocumentType}
                  data={effectiveData}
                  logoPosition={logoPosition}
                  style={style}
                  primaryColor={primaryColor}
                  className="mb-3"
                />
              )}
              
              {/* Bill To - only on first page */}
              {page.isFirstPage && (
                <BillToSection
                  invoice={effectiveDocument}
                  document={effectiveDocument}
                  documentType={effectiveDocumentType}
                  primaryColor={primaryColor}
                  className="mb-3"
                />
              )}
            </>
          )}
        </PaginatedInvoice>
      </div>
    );
  } catch (renderError) {
    console.error('Error rendering template:', renderError);
    return (
      <div className="flex items-center justify-center" style={{ width: '595px', height: '200px' }}>
        <div className="text-red-500 trades-caption">Rendering error: {String(renderError)}</div>
      </div>
    );
  }
}

/**
 * Determines if the header should repeat on subsequent pages based on template style
 */
function shouldRepeatHeader(style: string): boolean {
  // Modern and creative templates might want simplified headers on subsequent pages
  // Classic, minimal, corporate, and professional repeat full headers
  return ['classic', 'minimal', 'corporate', 'professional'].includes(style);
}

/**
 * Template-specific pagination configurations
 */
export const TEMPLATE_PAGINATION_CONFIGS: Record<string, PaginationConfig> = {
  classic: {
    maxItemsPage1: 22, // Increased significantly due to ultra-compressed spacing
    maxItemsSubsequent: 28,
    reserveSpaceForTotals: 6, // Reduced space needed
    maxTermsLinesPage1: 2     // Allow up to 2 lines for terms
  },
  modern: {
    maxItemsPage1: 23, // Increased significantly due to ultra-compressed spacing
    maxItemsSubsequent: 30,
    reserveSpaceForTotals: 5, // Reduced space needed
    maxTermsLinesPage1: 2
  },
  minimal: {
    maxItemsPage1: 24, // Increased significantly due to ultra-compressed spacing
    maxItemsSubsequent: 32,
    reserveSpaceForTotals: 4, // Reduced space needed
    maxTermsLinesPage1: 2
  },
  corporate: {
    maxItemsPage1: 20, // Increased from 17, but still formal
    maxItemsSubsequent: 26,
    reserveSpaceForTotals: 7, // Space for corporate + terms
    maxTermsLinesPage1: 2
  },
  creative: {
    maxItemsPage1: 21, // Increased significantly due to ultra-compressed spacing
    maxItemsSubsequent: 27,
    reserveSpaceForTotals: 6, // Reduced space needed
    maxTermsLinesPage1: 2
  },
  professional: {
    maxItemsPage1: 22, // Increased significantly due to ultra-compressed spacing
    maxItemsSubsequent: 28,
    reserveSpaceForTotals: 6, // Reduced space needed
    maxTermsLinesPage1: 2
  }
};