import { useState, useEffect } from 'react';
import { useBranding } from '../../../../utils/branding-context';
import { api } from '../../../../utils/api';

export interface BusinessDetails {
  legal_name?: string;
  trading_name?: string;
  owner_name?: string;
  registered_address?: string;
  trading_address?: string;
  company_number?: string;
  vat_number?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface BankDetails {
  account_holder_name?: string;
  bank_name?: string;
  sort_code?: string;
  account_number?: string;
  iban?: string;
  show_on_invoice?: boolean;
}

export interface InvoiceDataContext {
  // Branding data
  branding: any;
  // Business details
  businessDetails: BusinessDetails | null;
  // Bank details (only when show_on_invoice is true)
  bankDetails: BankDetails | null;
  // Loading states
  loading: boolean;
  error: string | null;
}

/**
 * Unified hook for loading all invoice template data
 * Handles branding, business details, and bank details
 */
export function useInvoiceData(): InvoiceDataContext {
  let branding: any = {};
  
  try {
    const brandingContext = useBranding();
    branding = brandingContext.branding || {};
  } catch (error) {
    console.warn('Failed to load branding context:', error);
    // Use default branding
    branding = {
      primary_color: '#0A84FF',
      accent_color: '#16A34A',
      secondary_color: '#16A34A',
      selected_template: 'classic'
    };
  }
  
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoiceData();
  }, []);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load business details and bank details in parallel with timeout
      const [businessData, bankData] = await Promise.allSettled([
        Promise.race([
          api.getBusinessDetails(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Business data fetch timeout')), 5000))
        ]),
        Promise.race([
          api.getBankDetails(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Bank details fetch timeout')), 5000))
        ])
      ]);

      // Handle business details result
      if (businessData.status === 'fulfilled') {
        setBusinessDetails(businessData.value as BusinessDetails);
      } else {
        // Silently handle timeout - this is expected when details haven't been set up yet
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.debug('Business details not loaded:', businessData.reason);
        }
      }
      
      // Handle bank details result
      if (bankData.status === 'fulfilled') {
        const bankResult = bankData.value as BankDetails;
        // Only include bank details if show_on_invoice is enabled
        if (bankResult?.show_on_invoice) {
          setBankDetails(bankResult);
        } else {
          setBankDetails(null);
        }
      } else {
        // Silently handle timeout - bank details are optional
        if (process.env.NODE_ENV === 'development') {
          console.debug('Bank details not loaded:', bankData.reason);
        }
        setBankDetails(null);
      }
      
    } catch (err) {
      console.error('Failed to load invoice data:', err);
      setError('Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  };

  return {
    branding,
    businessDetails,
    bankDetails,
    loading,
    error
  };
}

// Helper function to get display name (trading name first, then legal name)
export function getBusinessDisplayName(businessDetails: BusinessDetails | null, branding: any): string {
  if (branding?.business_name) {
    return branding.business_name;
  }
  if (businessDetails?.trading_name) {
    return businessDetails.trading_name;
  }
  if (businessDetails?.legal_name) {
    return businessDetails.legal_name;
  }
  return 'Your Business';
}

// Helper function to get primary business address
export function getBusinessAddress(businessDetails: BusinessDetails | null): string {
  return businessDetails?.trading_address || businessDetails?.registered_address || '';
}

// Helper function to get business contact info
export function getBusinessContact(businessDetails: BusinessDetails | null) {
  return {
    ownerName: businessDetails?.owner_name || '',
    phone: businessDetails?.phone || '',
    email: businessDetails?.email || '',
    website: businessDetails?.website || ''
  };
}

// Helper function to format date in UK format (dd MMM yyyy)
export function formatUKDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

// Helper function to format currency in UK format
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}