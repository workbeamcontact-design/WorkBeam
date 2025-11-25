import React from 'react';
import { BankDetails } from '../hooks/use-invoice-data';

interface BankTransferSectionProps {
  bankDetails: BankDetails | null;
  primaryColor: string;
  secondaryColor?: string;
  style?: 'classic' | 'modern' | 'minimal' | 'corporate' | 'creative' | 'professional';
  className?: string;
}

export function BankTransferSection({ 
  bankDetails, 
  primaryColor, 
  secondaryColor = '#F9FAFB',
  style = 'classic',
  className = '' 
}: BankTransferSectionProps) {
  // Blueprint: Bank transfer section with account name, bank, sort code and account number only
  const hasBankDetails = bankDetails && (
    bankDetails.account_holder_name || 
    bankDetails.bank_name ||
    bankDetails.sort_code || 
    bankDetails.account_number
  );
  
  if (!hasBankDetails) return null;

  const borderColor = '#E5E7EB';
  
  // Format sort code for better readability
  const formatSortCode = (sortCode: string) => {
    // Remove any existing dashes and format as XX-XX-XX
    const cleaned = sortCode.replace(/[-\s]/g, '');
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
    }
    return sortCode;
  };
  
  return (
    <div className={`flex justify-start ${className}`}>
      <div className="w-56">
        {/* Header with primary color accent - perfectly aligned with totals section */}
        <div 
          className="flex justify-between items-center py-1 mb-1"
          style={{ 
            backgroundColor: `${primaryColor}10`,
            borderTop: `2px solid ${primaryColor}`,
            height: '32px', // Fixed height to match totals section
            marginTop: '0px' // Ensure no extra margin
          }}
        >
          <span className="trades-label font-semibold" style={{ color: primaryColor }}>
            Bank Transfer Details
          </span>
        </div>
        
        {/* Bank details rows in table format */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          {bankDetails.account_holder_name && (
            <div className="flex border-b" style={{ borderBottomColor: borderColor }}>
              <div className="trades-caption text-gray-600 font-medium py-1 px-2 bg-gray-50 w-20 border-r" style={{ borderRightColor: borderColor }}>
                Account
              </div>
              <div className="trades-caption font-medium py-1 px-2 flex-1">
                {bankDetails.account_holder_name}
              </div>
            </div>
          )}
          
          {bankDetails.bank_name && (
            <div className="flex border-b" style={{ borderBottomColor: borderColor }}>
              <div className="trades-caption text-gray-600 font-medium py-1 px-2 bg-gray-50 w-20 border-r" style={{ borderRightColor: borderColor }}>
                Bank
              </div>
              <div className="trades-caption font-medium py-1 px-2 flex-1">
                {bankDetails.bank_name}
              </div>
            </div>
          )}
          
          {bankDetails.sort_code && (
            <div className="flex border-b" style={{ borderBottomColor: borderColor }}>
              <div className="trades-caption text-gray-600 font-medium py-1 px-2 bg-gray-50 w-20 border-r" style={{ borderRightColor: borderColor }}>
                Sort Code
              </div>
              <div className="trades-caption font-medium font-mono py-1 px-2 flex-1">
                {formatSortCode(bankDetails.sort_code)}
              </div>
            </div>
          )}
          
          {bankDetails.account_number && (
            <div className="flex">
              <div className="trades-caption text-gray-600 font-medium py-1 px-2 bg-gray-50 w-20 border-r truncate" style={{ borderRightColor: borderColor }}>
                Acc No
              </div>
              <div className="trades-caption font-medium font-mono py-1 px-2 flex-1">
                {bankDetails.account_number}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}