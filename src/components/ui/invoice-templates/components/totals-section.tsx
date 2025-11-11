import React from 'react';
import { formatCurrency, formatUKDate } from '../hooks/use-invoice-data';

interface Payment {
  id?: string;
  amount: number;
  method: string;
  date: string;
  reference?: string;
}

// Helper function to format payment method for display
function formatPaymentMethod(method: string): string {
  const methodMap: { [key: string]: string } = {
    'bank': 'Bank Transfer',
    'cash': 'Cash',
    'other': 'Other'
  };
  return methodMap[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1);
}

interface TotalsSectionProps {
  invoice: any;
  primaryColor: string;
  secondaryColor?: string;
  className?: string;
  compact?: boolean;
  documentType?: 'invoice' | 'quote'; // Add document type prop
}

export function TotalsSection({ 
  invoice, 
  primaryColor, 
  secondaryColor,
  className = '',
  compact = false,
  documentType = 'invoice'
}: TotalsSectionProps) {
  const borderColor = '#E5E7EB';
  const bgColor = secondaryColor || '#F9FAFB';
  
  // Calculate balance
  const paymentsTotal = invoice.payments?.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) || 0;
  const balance = (invoice.total || 0) - paymentsTotal;
  
  // Determine if this is a quotation
  const isQuote = documentType === 'quote' || invoice.status === 'quote' || invoice.quote_title;
  
  // Blueprint: Dense totals block, right-aligned, compact spacing
  // Check if payments exist
  const hasPayments = invoice.payments && invoice.payments.length > 0;
  
  return (
    <div className={`flex justify-end ${className}`}>
      <div className="w-56">
        {/* FOR DEPOSIT INVOICES: Show project breakdown first */}
        {invoice.is_deposit_invoice && (
          <>
            {/* Red header line - aligned with bank details */}
            <div 
              className="flex justify-between items-center py-1 mb-1"
              style={{ 
                backgroundColor: `${primaryColor}10`,
                borderTop: `2px solid ${primaryColor}`,
                height: '32px', // Fixed height to match bank details section
                marginTop: '0px' // Ensure perfect alignment with bank details
              }}
            >
              <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                Project Breakdown
              </span>
            </div>
            
            {/* Project Subtotal (before VAT) */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Project Subtotal:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency(invoice.project_subtotal || 0)}
              </span>
            </div>
            
            {/* VAT Amount - show if VAT was included in the project */}
            {(invoice.project_vat_amount !== undefined && invoice.project_vat_amount > 0) && (
              <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                <span className="trades-caption text-gray-600">VAT ({invoice.vat_rate || 20}%):</span>
                <span className="trades-caption font-medium tabular-nums">
                  {formatCurrency(invoice.project_vat_amount || 0)}
                </span>
              </div>
            )}
            
            {/* Project Total (after VAT) */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Project Total:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency(invoice.project_total || 0)}
              </span>
            </div>
            
            {/* Deposit Section */}
            <div className="mt-2 mb-1">
              <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                <span className="trades-caption text-gray-600">
                  Deposit{invoice.deposit_percentage ? ` (${invoice.deposit_percentage}%)` : ''}:
                </span>
                <span className="trades-caption font-medium tabular-nums">
                  {formatCurrency(invoice.deposit_amount_with_vat || invoice.deposit_amount || 0)}
                </span>
              </div>
            </div>
            
            {/* PAYMENTS RECEIVED SECTION - Only show if payments exist */}
            {hasPayments && (
              <>
                <div 
                  className="flex justify-between items-center py-1 mt-3 mb-1"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    borderTop: `2px solid ${primaryColor}`,
                    height: '32px',
                    marginTop: '12px'
                  }}
                >
                  <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                    Payments Received
                  </span>
                </div>
                
                {invoice.payments.map((payment: Payment, index: number) => (
                  <div key={payment.id || index} className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                    <span className="trades-caption text-gray-600">
                      {formatUKDate(payment.date)} - {formatPaymentMethod(payment.method)}:
                    </span>
                    <span className="trades-caption font-medium tabular-nums text-green-600">
                      -{formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </>
            )}
            
            {/* Balance Due or Amount Due - depending on whether payments exist */}
            <div 
              className="flex justify-between items-center py-1 mt-1 border-t"
              style={{ 
                borderTopColor: primaryColor,
                backgroundColor: `${primaryColor}10` // Light background like Project Breakdown
              }}
            >
              <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                {hasPayments ? 'Balance Due:' : 'Amount Due:'}
              </span>
              <span className="trades-label font-semibold tabular-nums" style={{ color: primaryColor }}>
                {formatCurrency(hasPayments ? Math.max(0, balance) : (invoice.total || 0))}
              </span>
            </div>
          </>
        )}
        
        {/* FOR REMAINING BALANCE INVOICES: Show comprehensive project breakdown */}
        {!invoice.is_deposit_invoice && (invoice.is_remaining_from_quote || invoice.is_remaining_balance_invoice) && (
          <>
            {/* Project Breakdown header */}
            {!isQuote && (
              <div 
                className="flex justify-between items-center py-1 mb-1"
                style={{ 
                  backgroundColor: `${primaryColor}10`,
                  borderTop: `2px solid ${primaryColor}`,
                  height: '32px', // Fixed height to match bank details section
                  marginTop: '0px' // Ensure perfect alignment with bank details
                }}
              >
                <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                  Project Breakdown
                </span>
              </div>
            )}
            
            {/* Project Subtotal - use full project amount */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Project Subtotal:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency(invoice.project_subtotal_full || invoice.subtotal || 0)}
              </span>
            </div>
            
            {/* VAT Amount - use full project VAT */}
            {(invoice.project_vat_full !== undefined && invoice.project_vat_full > 0) && (
              <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                <span className="trades-caption text-gray-600">VAT ({invoice.vat_rate || 20}%):</span>
                <span className="trades-caption font-medium tabular-nums">
                  {formatCurrency(invoice.project_vat_full || invoice.vat_amount || 0)}
                </span>
              </div>
            )}
            
            {/* Project Total - full project with VAT */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Project Total:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency(invoice.project_total_full || ((invoice.project_subtotal_full || 0) + (invoice.project_vat_full || 0)))}
              </span>
            </div>
            
            {/* Deposit Paid */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Deposit Paid:</span>
              <span className="trades-caption font-medium tabular-nums">
                -{formatCurrency(invoice.deposit_paid_amount || 0)}
              </span>
            </div>
            
            {/* Remaining Amount - calculation */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Remaining Amount:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency((invoice.project_total_full || 0) - (invoice.deposit_paid_amount || 0))}
              </span>
            </div>
            
            {/* PAYMENTS RECEIVED SECTION - Only show if payments exist */}
            {hasPayments && (
              <>
                <div 
                  className="flex justify-between items-center py-1 mt-3 mb-1"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    borderTop: `2px solid ${primaryColor}`,
                    height: '32px',
                    marginTop: '12px'
                  }}
                >
                  <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                    Payments Received
                  </span>
                </div>
                
                {invoice.payments.map((payment: Payment, index: number) => (
                  <div key={payment.id || index} className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                    <span className="trades-caption text-gray-600">
                      {formatUKDate(payment.date)} - {formatPaymentMethod(payment.method)}:
                    </span>
                    <span className="trades-caption font-medium tabular-nums text-green-600">
                      -{formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </>
            )}
            
            {/* Balance Due or Amount Due - depending on whether payments exist */}
            <div 
              className="flex justify-between items-center py-1 mt-1 border-t"
              style={{ 
                borderTopColor: primaryColor,
                backgroundColor: `${primaryColor}10` // Light background like Project Breakdown
              }}
            >
              <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                {hasPayments ? 'Balance Due:' : 'Amount Due:'}
              </span>
              <span className="trades-label font-semibold tabular-nums" style={{ color: primaryColor }}>
                {formatCurrency(hasPayments ? Math.max(0, balance) : (invoice.total || 0))}
              </span>
            </div>
          </>
        )}

        {/* FOR FULL INVOICES: Show project breakdown like other invoice types */}
        {!invoice.is_deposit_invoice && !invoice.is_remaining_from_quote && !invoice.is_remaining_balance_invoice && (
          <>
            {/* Project Breakdown header - CHANGED from "Invoice Total" */}
            {!isQuote && (
              <div 
                className="flex justify-between items-center py-1 mb-1"
                style={{ 
                  backgroundColor: `${primaryColor}10`,
                  borderTop: `2px solid ${primaryColor}`,
                  height: '32px', // Fixed height to match bank details section
                  marginTop: '0px' // Ensure perfect alignment with bank details
                }}
              >
                <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                  Project Breakdown
                </span>
              </div>
            )}
            
            {/* Project Subtotal - CHANGED from "Subtotal" */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Project Subtotal:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency(invoice.subtotal || 0)}
              </span>
            </div>
            
            {/* VAT - FIXED: Show VAT only when it exists and has a valid value */}
            {(invoice.vat_amount !== undefined && invoice.vat_amount !== null && !isNaN(invoice.vat_amount)) && (
              <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                <span className="trades-caption text-gray-600">
                  VAT ({invoice.vat_rate || 20}%):
                </span>
                <span className="trades-caption font-medium tabular-nums">
                  {formatCurrency(invoice.vat_amount || 0)}
                </span>
              </div>
            )}
            
            {/* Project Total - Show total with VAT before final amount */}
            <div className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
              <span className="trades-caption text-gray-600">Project Total:</span>
              <span className="trades-caption font-medium tabular-nums">
                {formatCurrency(((invoice.subtotal || 0) + (invoice.vat_amount || 0)))}
              </span>
            </div>
            
            {/* PAYMENTS RECEIVED SECTION - Only show if payments exist */}
            {hasPayments && (
              <>
                <div 
                  className="flex justify-between items-center py-1 mt-3 mb-1"
                  style={{ 
                    backgroundColor: `${primaryColor}10`,
                    borderTop: `2px solid ${primaryColor}`,
                    height: '32px',
                    marginTop: '12px'
                  }}
                >
                  <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                    Payments Received
                  </span>
                </div>
                
                {invoice.payments.map((payment: Payment, index: number) => (
                  <div key={payment.id || index} className="flex justify-between items-center py-1 border-b" style={{ borderBottomColor: borderColor }}>
                    <span className="trades-caption text-gray-600">
                      {formatUKDate(payment.date)} - {formatPaymentMethod(payment.method)}:
                    </span>
                    <span className="trades-caption font-medium tabular-nums text-green-600">
                      -{formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </>
            )}
            
            {/* Balance Due or Amount Due - depending on whether payments exist */}
            <div 
              className="flex justify-between items-center py-1 mt-1 border-t"
              style={{ 
                borderTopColor: primaryColor,
                backgroundColor: `${primaryColor}10` // Light background like Project Breakdown
              }}
            >
              <span className="trades-label font-semibold" style={{ color: primaryColor }}>
                {isQuote ? 'Quote Total:' : (hasPayments ? 'Balance Due:' : 'Amount Due:')}
              </span>
              <span className="trades-label font-semibold tabular-nums" style={{ color: primaryColor }}>
                {formatCurrency(hasPayments ? Math.max(0, balance) : (invoice.total || 0))}
              </span>
            </div>
          </>
        )}
        
        {/* FOR DEPOSIT INVOICES: Show remaining balance */}
        {invoice.is_deposit_invoice && invoice.remaining_balance > 0 && (
          <div className="mt-2">
            {/* Secondary header line - same design as Project Breakdown but with secondary colors */}
            <div 
              className="py-1 mb-1"
              style={{ 
                backgroundColor: `${secondaryColor || '#6B7280'}10`, // Use actual secondary color with 10% opacity
                borderTop: `2px solid ${secondaryColor || '#6B7280'}`, // Use actual secondary color for border
                minHeight: '38px', // Slightly smaller to fit content better
                marginTop: '0px'
              }}
            >
              {/* First line: Remaining Balance with amount */}
              <div className="flex justify-between items-center px-1">
                <span className="trades-label font-semibold" style={{ color: secondaryColor || '#6B7280' }}>
                  Remaining Balance:
                </span>
                <span className="trades-label font-semibold tabular-nums" style={{ color: '#374151' }}>
                  {formatCurrency(invoice.remaining_balance)}
                </span>
              </div>
              {/* Second line: Due upon project completion - moved up slightly */}
              <div className="px-1 -mt-0.5">
                <span className="trades-caption" style={{ color: secondaryColor || '#6B7280' }}>
                  Due upon project completion
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}