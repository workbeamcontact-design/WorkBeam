/**
 * Navigation Service
 * Handles navigation logic, validation, and data transformation
 * Extracted from App.tsx for better separation of concerns
 */

export type Screen = 
  | 'dashboard' 
  | 'clients' 
  | 'calendar' 
  | 'settings'
  | 'business-analytics'
  | 'client-detail'
  | 'job-detail' 
  | 'job-list'
  | 'quote-builder'
  | 'quote-detail'
  | 'variation-builder'
  | 'quote-approval' 
  | 'variation-approval'
  | 'payment-recorder'
  | 'add-booking'
  | 'new-client'
  | 'edit-client'
  | 'new-job'
  | 'booking-detail'
  | 'generate-invoice'
  | 'invoice-detail'
  | 'invoice-list'
  | 'record-payment'
  | 'branding-logo'
  | 'invoice-templates'
  | 'invoice-template-preview'
  | 'business-details'
  | 'business-preview'
  | 'bank-details'
  | 'notifications-settings'
  | 'stub-calling'
  | 'stub-whatsapp'
  | 'stub-sms'
  | 'stub-maps';

export interface NavigationState {
  screen: Screen;
  data?: any;
  history: { screen: Screen; data?: any }[];
}

export interface NavigationResult {
  isValid: boolean;
  screen: Screen;
  data?: any;
  redirectTo?: { screen: Screen; data?: any };
  error?: string;
}

/**
 * Validates navigation requests and transforms data if needed
 */
export class NavigationService {
  
  /**
   * Validate and process navigation request
   */
  static validateNavigation(screen: Screen, data?: any): NavigationResult {
    console.log(`🧭 Navigation attempt: ${screen}`, data);
    
    // Enhanced data structure logging for debugging
    if (data && typeof data === 'object') {
      console.log(`📊 Data structure analysis:`, {
        hasId: !!data.id,
        hasInvoiceId: !!data.invoiceId,
        hasJob: !!data.job,
        hasClient: !!data.client,
        hasInvoices: !!data.invoices,
        invoicesCount: data.invoices?.length || 0,
        topLevelKeys: Object.keys(data),
        dataType: Array.isArray(data) ? 'array' : 'object',
        looksLikeJob: !!(data.title || data.description || data.estimatedValue || data.materials),
        looksLikeClient: !!(data.name && data.phone && !data.title),
        hasNestedClient: !!(data.client && data.client.id)
      });
    }

    // Public routes don't need validation
    if (['quote-approval', 'variation-approval'].includes(screen)) {
      return { isValid: true, screen, data };
    }

    // Main navigation screens
    if (['dashboard', 'clients', 'calendar', 'settings', 'business-analytics'].includes(screen)) {
      return { isValid: true, screen, data };
    }

    // Job-related screens validation
    const jobScreens = ['job-detail', 'variation-builder', 'payment-recorder', 'generate-invoice'];
    if (jobScreens.includes(screen)) {
      return this.validateJobNavigation(screen, data);
    }

    // Quote-related screens validation
    const quoteScreens = ['quote-builder', 'quote-detail'];
    if (quoteScreens.includes(screen)) {
      return this.validateQuoteNavigation(screen, data);
    }

    // Invoice-related screens validation
    const invoiceScreens = ['invoice-detail', 'record-payment'];
    if (invoiceScreens.includes(screen)) {
      return this.validateInvoiceNavigation(screen, data);
    }

    // Client-related screens validation
    if (screen === 'client-detail') {
      return this.validateClientNavigation(data);
    }

    // Other screens with minimal validation
    const simpleScreens = [
      'job-list', 'add-booking', 'new-client', 'edit-client', 'new-job',
      'booking-detail', 'invoice-list', 'branding-logo', 'invoice-templates',
      'invoice-template-preview', 'business-details', 'business-preview',
      'bank-details', 'notifications-settings'
    ];
    
    if (simpleScreens.includes(screen)) {
      return { isValid: true, screen, data };
    }

    // Stub screens
    if (screen.startsWith('stub-')) {
      return { isValid: true, screen, data };
    }

    return {
      isValid: false,
      screen: 'dashboard',
      error: `Unknown screen: ${screen}`
    };
  }

  /**
   * Validate job-related navigation
   */
  private static validateJobNavigation(screen: Screen, data?: any): NavigationResult {
    const hasValidId = data && (data.id || data.jobId);
    
    if (!hasValidId) {
      console.error(`❌ Navigation blocked: ${screen} requires valid job data with id/jobId, but received:`, data);
      
      // Check for client data instead of job data
      if (data && data.client && data.client.id) {
        console.warn('⚠️ Detected client data instead of job data. Redirecting to client detail.');
        return {
          isValid: false,
          screen: 'client-detail',
          redirectTo: { screen: 'client-detail', data: data.client },
          error: 'Received client data instead of job data'
        };
      }

      // Check for likely client data structure
      if (data && data.name && data.phone && !data.title && !data.description) {
        console.warn('⚠️ Detected likely client data structure. Redirecting to client detail.');
        return {
          isValid: false,
          screen: 'client-detail',
          redirectTo: { screen: 'client-detail', data: data },
          error: 'Detected client data structure'
        };
      }

      return {
        isValid: false,
        screen: 'dashboard',
        error: `${screen} requires valid job data with id/jobId`
      };
    }

    // Transform jobId to id for consistency
    if (data.jobId && !data.id) {
      data = { ...data, id: data.jobId };
      console.log(`🔄 Transformed jobId to id for ${screen}:`, data.id);
    }

    console.log(`✅ Navigation validated: ${screen} with job id:`, data.id || data.jobId);
    return { isValid: true, screen, data };
  }

  /**
   * Validate quote-related navigation
   */
  private static validateQuoteNavigation(screen: Screen, data?: any): NavigationResult {
    if (screen === 'quote-builder') {
      // Quote builder is more flexible - can accept job data, client data, or no data
      if (data) {
        if (data.id) {
          // Job data case
          if (!data.title && !data.description && !data.clientId && !data.client) {
            console.warn(`⚠️ Navigation warning: quote-builder received potentially invalid job data:`, data);
          }
          console.log(`✅ Navigation validated: quote-builder with job id:`, data.id);
        } else if (data.client && data.client.id) {
          // Client data case
          console.log(`✅ Navigation validated: quote-builder with client id:`, data.client.id);
        } else {
          return {
            isValid: false,
            screen: 'dashboard',
            error: 'quote-builder requires valid job data with id OR client data'
          };
        }
      } else {
        console.log(`✅ Navigation validated: quote-builder for standalone quote creation`);
      }
      return { isValid: true, screen, data };
    }

    // Other quote screens need quote data
    if (!data || (!data.id && !data.quoteId)) {
      return {
        isValid: false,
        screen: 'dashboard',
        error: `${screen} requires valid quote data with id`
      };
    }

    return { isValid: true, screen, data };
  }

  /**
   * Validate invoice-related navigation
   */
  private static validateInvoiceNavigation(screen: Screen, data?: any): NavigationResult {
    // Check for direct invoice structure
    const hasValidInvoiceId = data && (data.id || data.invoiceId);
    
    // Special handling for record-payment with job+invoices data
    if (screen === 'record-payment' && data && data.job && data.invoices) {
      if (!data.job.id) {
        return {
          isValid: false,
          screen: 'dashboard',
          error: 'Job data is missing id field'
        };
      }
      
      if (!Array.isArray(data.invoices) || data.invoices.length === 0) {
        return {
          isValid: false,
          screen: 'job-detail',
          redirectTo: { screen: 'job-detail', data: data.job },
          error: 'No invoices found for this job'
        };
      }
      
      // Find unpaid invoice
      const unpaidInvoice = data.invoices.find((inv: any) => inv.status !== 'paid');
      if (unpaidInvoice) {
        console.log(`✅ Navigation fixed: Converting job+invoices data to invoice data for record-payment`, unpaidInvoice.id);
        
        if (!unpaidInvoice.id) {
          return {
            isValid: false,
            screen: 'job-detail',
            redirectTo: { screen: 'job-detail', data: data.job },
            error: 'Invoice is missing id field'
          };
        }
        
        const normalizedInvoice = {
          ...unpaidInvoice,
          total: unpaidInvoice.total || unpaidInvoice.amount || 0
        };
        
        return { isValid: true, screen, data: normalizedInvoice };
      } else {
        console.warn(`⚠️ Navigation redirected: All invoices for this job are already paid`);
        return {
          isValid: false,
          screen: 'job-detail',
          redirectTo: { screen: 'job-detail', data: data.job },
          error: 'All invoices are already paid'
        };
      }
    }
    
    // Standard validation for direct invoice data
    if (!hasValidInvoiceId) {
      return {
        isValid: false,
        screen: 'dashboard',
        error: `${screen} requires valid invoice data with id`
      };
    }
    
    // For record-payment, ensure required fields
    if (screen === 'record-payment') {
      const invoiceId = data.id || data.invoiceId;
      
      if (typeof invoiceId !== 'string' || !invoiceId.trim()) {
        return {
          isValid: false,
          screen: 'dashboard',
          error: 'Invalid invoice ID format'
        };
      }
      
      const normalizedInvoice = {
        ...data,
        id: invoiceId,
        total: data.total || data.amount || 0
      };
      
      console.log(`🔍 Record Payment navigation with normalized invoice:`, {
        id: normalizedInvoice.id,
        total: normalizedInvoice.total,
        hasRequiredFields: !!(normalizedInvoice.id && typeof normalizedInvoice.total === 'number')
      });
      
      return { isValid: true, screen, data: normalizedInvoice };
    }

    return { isValid: true, screen, data };
  }

  /**
   * Validate client-related navigation
   */
  private static validateClientNavigation(data?: any): NavigationResult {
    if (!data || !data.id) {
      console.error(`❌ Navigation blocked: client-detail requires valid client data with id, but received:`, data);
      return {
        isValid: false,
        screen: 'clients',
        error: 'client-detail requires valid client data with id'
      };
    }

    return { isValid: true, screen: 'client-detail', data };
  }

  /**
   * Get active tab based on current screen
   */
  static getActiveTab(screen: Screen, history: NavigationState['history']): 'home' | 'clients' | 'calendar' | 'settings' {
    switch (screen) {
      case 'dashboard':
        return 'home';
      case 'clients':
      case 'client-detail':
      case 'new-client':
      case 'edit-client':
        return 'clients';
      case 'calendar':
      case 'add-booking':
      case 'booking-detail':
        return 'calendar';
      case 'settings':
        return 'settings';
      case 'job-detail':
      case 'job-list':
      case 'quote-builder':
      case 'quote-detail':
      case 'variation-builder':
      case 'payment-recorder':
      case 'new-job':
      case 'generate-invoice':
      case 'invoice-detail':
      case 'invoice-list':
      case 'record-payment':
        // For job-related screens, determine from navigation history or default to home
        const lastMainScreen = [...history].reverse().find(h => 
          ['dashboard', 'clients', 'calendar', 'settings'].includes(h.screen)
        );
        if (lastMainScreen) {
          return NavigationService.getActiveTab(lastMainScreen.screen, []);
        }
        return 'home';
      default:
        return 'home';
    }
  }

  /**
   * Check if screen should trigger overdue notifications
   */
  static shouldTriggerOverdueCheck(screen: Screen): boolean {
    const financialScreens = ['dashboard', 'client-detail', 'invoice-list', 'invoice-detail', 'business-analytics'];
    return financialScreens.includes(screen);
  }
}