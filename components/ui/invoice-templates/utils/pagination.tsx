import React from 'react';
import { LineItemsTable, paginateLineItems } from '../components/line-items-table';
import { TotalsSection } from '../components/totals-section';
import { TermsAndNotes } from '../components/terms-and-notes';
import { BankTransferSection } from '../components/bank-transfer-section';
import { InvoiceFooter } from '../components/invoice-footer';
import { InvoiceDataContext, formatCurrency } from '../hooks/use-invoice-data';

export interface PaginationConfig {
  maxItemsPage1: number;
  maxItemsSubsequent: number;
  reserveSpaceForTotals: number;
  maxTermsLinesPage1: number;
}

export interface InvoicePage {
  pageNumber: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  lineItems: any[];
  showTotals: boolean;
  showTerms: boolean;
  showTermsContinuation: boolean;
}

/**
 * Default pagination configuration optimized for A4 invoices
 */
export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  maxItemsPage1: 20,     // Increased to allow more items on first page for quotes
  maxItemsSubsequent: 28, // Even more items on subsequent pages
  reserveSpaceForTotals: 6, // Reduced space since quotes don't need as much space as invoices
  maxTermsLinesPage1: 2   // Allow up to 2 lines for terms
};

/**
 * Paginate invoice content into multiple pages
 */
export function paginateInvoice(
  invoice: any,
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG
): InvoicePage[] {
  // Handle different field names for line items
  const items = invoice.line_items || invoice.items || invoice.lineItems || [];
  
  // Special handling for deposit invoices - force single page
  if (invoice.is_deposit_invoice) {
    return [{
      pageNumber: 1,
      isFirstPage: true,
      isLastPage: true,
      lineItems: items,
      showTotals: true,
      showTerms: true,
      showTermsContinuation: false
    }];
  }
  
  // Special handling for quotes - force single page if items <= 15
  const isQuote = invoice.status === 'quote' || invoice.quote_title;
  if (isQuote && items.length <= 15) {
    return [{
      pageNumber: 1,
      isFirstPage: true,
      isLastPage: true,
      lineItems: items,
      showTotals: true,
      showTerms: true,
      showTermsContinuation: false
    }];
  }
  
  if (items.length === 0) {
    // Single page with no items
    return [{
      pageNumber: 1,
      isFirstPage: true,
      isLastPage: true,
      lineItems: [],
      showTotals: true,
      showTerms: true,
      showTermsContinuation: false
    }];
  }
  
  // Split items across pages
  const itemPages = paginateLineItems(
    items, 
    config.maxItemsPage1, 
    config.maxItemsSubsequent
  );
  
  // Build page structure
  const pages: InvoicePage[] = itemPages.map((pageItems, index) => {
    const pageNumber = index + 1;
    const isFirstPage = index === 0;
    const isLastPage = index === itemPages.length - 1;
    
    return {
      pageNumber,
      isFirstPage,
      isLastPage,
      lineItems: pageItems,
      showTotals: isLastPage, // Totals only on last page
      showTerms: true, // Show terms on all pages (with continuation logic)
      showTermsContinuation: !isFirstPage
    };
  });
  
  return pages;
}

interface PaginatedInvoiceProps {
  invoice?: any; // Legacy prop
  document?: any; // New unified prop
  documentType?: 'invoice' | 'quote'; // Document type identifier
  data: InvoiceDataContext;
  primaryColor: string;
  secondaryColor: string;
  style?: 'classic' | 'modern' | 'minimal' | 'corporate' | 'creative' | 'professional';
  config?: PaginationConfig;
  children?: (page: InvoicePage) => React.ReactNode;
}

/**
 * Renders a paginated invoice with consistent pagination logic
 */
export function PaginatedInvoice({
  invoice, // Legacy prop
  document, // New unified prop
  documentType, // Document type identifier
  data,
  primaryColor,
  secondaryColor,
  style = 'classic',
  config = DEFAULT_PAGINATION_CONFIG,
  children
}: PaginatedInvoiceProps) {
  // Determine the effective document
  const effectiveDocument = document || invoice;
  const effectiveDocumentType = documentType || (effectiveDocument?.status === 'quote' || effectiveDocument?.quote_title ? 'quote' : 'invoice');
  
  const pages = paginateInvoice(effectiveDocument, config);
  
  return (
    <>
      {pages.map((page) => (
        <div 
          key={page.pageNumber}
          className="w-full h-full p-5 flex flex-col page-break"
          style={{ 
            width: '595px', 
            minHeight: '842px',
            pageBreakAfter: page.isLastPage ? 'auto' : 'always'
          }}
        >
          {/* Custom header content for each page */}
          {children && children(page)}
          
          {/* Line Items Table */}
          <div className="flex-1">
            <LineItemsTable
              items={page.lineItems}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              style={style}
              isPage1={page.isFirstPage}
              showContinuation={page.showTermsContinuation}
              className="mb-3"
            />
            
            {/* Subtotal carried forward (for page 1 if items continue) */}
            {page.isFirstPage && !page.isLastPage && (
              <div className="flex justify-end mb-2">
                <div className="text-right">
                  <div className="trades-caption text-gray-600">
                    Subtotal carried forward: {formatCurrency(
                      page.lineItems.reduce((sum, item) => sum + item.amount, 0)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Totals and Bank Details Section - Side by side layout, moved lower for more space */}
          {page.showTotals && (
            <div className="flex gap-4 mb-6 items-start mt-8">
              {/* Bank Transfer Section - Left side (only if bank details exist) */}
              {data.bankDetails && (
                <div className="flex-1">
                  <BankTransferSection
                    bankDetails={data.bankDetails}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    style={style}
                    className=""
                  />
                </div>
              )}
              
              {/* Spacer if no bank details - ensures totals stay right-aligned */}
              {!data.bankDetails && <div className="flex-1"></div>}
              
              {/* Totals Section - Right side */}
              <div className="flex-1">
                <TotalsSection
                  invoice={effectiveDocument}
                  primaryColor={primaryColor}
                  secondaryColor={secondaryColor}
                  documentType={effectiveDocumentType}
                  className=""
                />
              </div>
            </div>
          )}
          
          {/* Spacer to push terms to bottom - constrained to fit everything on one page */}
          <div className="flex-grow max-h-6"></div>
          
          {/* Terms and Notes - Position right above footer line */}
          <TermsAndNotes
            invoice={effectiveDocument}
            primaryColor={primaryColor}
            maxLines={page.isFirstPage ? config.maxTermsLinesPage1 : undefined}
            showContinuation={page.showTermsContinuation}
            className="mb-0.5"
          />
          
          {/* Footer */}
          <InvoiceFooter
            data={data}
            currentPage={page.pageNumber}
            totalPages={pages.length}
          />
        </div>
      ))}
    </>
  );
}

/**
 * Hook to get pagination info without rendering
 */
export function usePagination(
  invoice: any,
  config: PaginationConfig = DEFAULT_PAGINATION_CONFIG
) {
  const pages = paginateInvoice(invoice, config);
  
  return {
    pages,
    totalPages: pages.length,
    willPaginate: pages.length > 1,
    itemsOnPage1: pages[0]?.lineItems.length || 0,
    totalItems: invoice.line_items?.length || invoice.items?.length || 0
  };
}