// Temporary local storage fallback API for development
// This will be used when Supabase edge function is not available
// NOW WITH MULTI-USER SUPPORT - Each user has isolated data

import { getUserData, setUserData, getCurrentUserId } from './user-scoped-storage';

interface LocalData {
  clients: any[];
  jobs: any[];
  quotes: any[];
  invoices: any[];
  payments: any[];
  bookings: any[];
  branding?: any;
  invoiceSettings?: any;
  businessDetails?: any;
  bankDetails?: any;
  notificationPreferences?: any;
}

class LocalStorageApi {
  private readonly storageKey = 'trades-app-data';

  private getData(): LocalData {
    try {
      // Get user-scoped data
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('No authenticated user, returning sample data');
        return this.getSampleData();
      }

      // Try to get existing user data
      const clients = getUserData<any[]>('clients', []);
      const jobs = getUserData<any[]>('jobs', []);
      const quotes = getUserData<any[]>('quotes', []);
      const invoices = getUserData<any[]>('invoices', []);
      const payments = getUserData<any[]>('payments', []);
      const bookings = getUserData<any[]>('bookings', []);
      const branding = getUserData<any>('branding', undefined);
      const invoiceSettings = getUserData<any>('invoiceSettings', undefined);
      const businessDetails = getUserData<any>('businessDetails', undefined);
      const bankDetails = getUserData<any>('bankDetails', undefined);
      const notificationPreferences = getUserData<any>('notificationPreferences', undefined);

      return {
        clients,
        jobs,
        quotes,
        invoices,
        payments,
        bookings,
        branding,
        invoiceSettings,
        businessDetails,
        bankDetails,
        notificationPreferences
      };
    } catch (error) {
      console.warn('Failed to get user data:', error);
      return this.getSampleData();
    }
  }

  private getSampleData(): LocalData {
    // Return empty data - no sample/mock data for production
    return {
      clients: [],
      jobs: [],
      quotes: [],
      invoices: [],
      payments: [],
      bookings: []
    };
  }

  private saveData(data: LocalData): void {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('No authenticated user, skipping save');
        return;
      }

      // Save each data type separately with user scope
      setUserData('clients', data.clients);
      setUserData('jobs', data.jobs);
      setUserData('quotes', data.quotes);
      setUserData('invoices', data.invoices);
      setUserData('payments', data.payments);
      setUserData('bookings', data.bookings);
      
      if (data.branding !== undefined) {
        setUserData('branding', data.branding);
      }
      if (data.invoiceSettings !== undefined) {
        setUserData('invoiceSettings', data.invoiceSettings);
      }
      if (data.businessDetails !== undefined) {
        setUserData('businessDetails', data.businessDetails);
      }
      if (data.bankDetails !== undefined) {
        setUserData('bankDetails', data.bankDetails);
      }
      if (data.notificationPreferences !== undefined) {
        setUserData('notificationPreferences', data.notificationPreferences);
      }
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health check
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-local',
      environment: 'local-fallback'
    };
  }

  // Clients API
  async getClients() {
    const data = this.getData();
    return data.clients;
  }

  async getClient(id: string) {
    const data = this.getData();
    return data.clients.find(client => client.id === id) || null;
  }

  async createClient(clientData: any) {
    const data = this.getData();
    const client = {
      id: this.generateId(),
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.clients.push(client);
    this.saveData(data);
    return client;
  }

  async updateClient(id: string, clientData: any) {
    const data = this.getData();
    const index = data.clients.findIndex(client => client.id === id);
    
    if (index === -1) return null;
    
    data.clients[index] = {
      ...data.clients[index],
      ...clientData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.clients[index];
  }

  async deleteClient(id: string) {
    const data = this.getData();
    const index = data.clients.findIndex(client => client.id === id);
    
    if (index === -1) return false;
    
    // Remove the client
    data.clients.splice(index, 1);
    
    // Also remove any related jobs, quotes, invoices, payments, and bookings
    data.jobs = data.jobs.filter(job => job.clientId !== id);
    data.quotes = data.quotes.filter(quote => quote.clientId !== id);
    data.invoices = data.invoices.filter(invoice => invoice.clientId !== id);
    data.payments = data.payments.filter(payment => payment.clientId !== id);
    data.bookings = data.bookings.filter(booking => booking.clientId !== id);
    
    this.saveData(data);
    return true;
  }

  // Jobs API
  async getJobs() {
    const data = this.getData();
    return data.jobs;
  }

  async getJob(id: string) {
    const data = this.getData();
    return data.jobs.find(job => job.id === id) || null;
  }

  async getClientJobs(clientId: string) {
    const data = this.getData();
    return data.jobs.filter(job => job.clientId === clientId);
  }

  async createJob(jobData: any) {
    const data = this.getData();
    const job = {
      id: this.generateId(),
      ...jobData,
      status: jobData.status || 'quote_pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.jobs.push(job);
    this.saveData(data);
    return job;
  }

  async updateJob(id: string, jobData: any) {
    const data = this.getData();
    const index = data.jobs.findIndex(job => job.id === id);
    
    if (index === -1) return null;
    
    data.jobs[index] = {
      ...data.jobs[index],
      ...jobData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.jobs[index];
  }

  async deleteJob(id: string) {
    const data = this.getData();
    const index = data.jobs.findIndex(job => job.id === id);
    
    if (index === -1) {
      return {
        success: false,
        message: 'Job not found'
      };
    }
    
    // Remove the job
    data.jobs.splice(index, 1);
    
    // SIMPLIFIED: Delete related quotes when job is deleted
    const initialQuoteCount = data.quotes.length;
    data.quotes = data.quotes.filter(quote => 
      quote.jobId !== id && quote.convertedJobId !== id
    );
    const deletedQuotes = initialQuoteCount - data.quotes.length;
    
    // Remove related invoices, payments, and bookings
    data.invoices = data.invoices.filter(invoice => invoice.jobId !== id);
    data.payments = data.payments.filter(payment => payment.jobId !== id);
    data.bookings = data.bookings.filter(booking => booking.jobId !== id);
    
    this.saveData(data);
    return {
      success: true,
      message: `Job deleted successfully${deletedQuotes > 0 ? `. ${deletedQuotes} related quote(s) also deleted` : ''}`
    };
  }

  // Invoices API
  async getInvoices() {
    const data = this.getData();
    return data.invoices;
  }

  async getInvoice(id: string) {
    const data = this.getData();
    return data.invoices.find(invoice => invoice.id === id) || null;
  }

  async getJobInvoices(jobId: string) {
    const data = this.getData();
    return data.invoices.filter(invoice => invoice.jobId === jobId);
  }

  async createInvoice(invoiceData: any) {
    const data = this.getData();
    
    // Generate invoice number
    const invoiceCount = data.invoices.length + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${invoiceCount.toString().padStart(4, '0')}`;
    
    const invoice = {
      id: this.generateId(),
      number: invoiceNumber,
      ...invoiceData,
      status: 'draft',
      issueDate: invoiceData.issueDate || new Date().toLocaleDateString('en-GB'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.invoices.push(invoice);
    this.saveData(data);
    return invoice;
  }

  async updateInvoice(id: string, invoiceData: any) {
    const data = this.getData();
    const index = data.invoices.findIndex(invoice => invoice.id === id);
    
    if (index === -1) return null;
    
    data.invoices[index] = {
      ...data.invoices[index],
      ...invoiceData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.invoices[index];
  }

  // Payments API
  async getPayments() {
    const data = this.getData();
    return data.payments;
  }

  async getInvoicePayments(invoiceId: string) {
    const data = this.getData();
    return data.payments.filter(payment => payment.invoiceId === invoiceId);
  }

  async recordPayment(paymentData: any) {
    const data = this.getData();
    
    // Get invoice to extract jobId
    const invoice = data.invoices.find(inv => inv.id === paymentData.invoiceId);
    
    const payment = {
      id: this.generateId(),
      ...paymentData,
      jobId: invoice?.jobId || '',
      clientId: invoice?.clientId || '',
      date: paymentData.date || new Date().toLocaleDateString('en-GB'),
      createdAt: new Date().toISOString()
    };
    
    data.payments.push(payment);
    
    // Update invoice status and amountPaid based on total payments
    if (invoice) {
      const invoicePayments = data.payments.filter(p => p.invoiceId === paymentData.invoiceId);
      const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const invoiceIndex = data.invoices.findIndex(inv => inv.id === paymentData.invoiceId);
      if (invoiceIndex !== -1) {
        // Determine status based on payment amount
        let newStatus: 'draft' | 'sent' | 'part-paid' | 'paid' = invoice.status;
        
        if (totalPaid >= invoice.total) {
          newStatus = 'paid';
        } else if (totalPaid > 0) {
          newStatus = 'part-paid';
        }
        
        data.invoices[invoiceIndex] = {
          ...invoice,
          status: newStatus,
          amountPaid: totalPaid,
          paidAt: newStatus === 'paid' ? new Date().toLocaleDateString('en-GB') : null,
          paidAtISO: newStatus === 'paid' ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString()
        };
      }
    }
    
    this.saveData(data);
    return payment;
  }

  // Bookings API
  async getBookings() {
    const data = this.getData();
    return data.bookings;
  }

  async createBooking(bookingData: any) {
    const data = this.getData();
    const booking = {
      id: this.generateId(),
      ...bookingData,
      status: bookingData.status || 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.bookings.push(booking);
    this.saveData(data);
    return booking;
  }

  async updateBooking(id: string, bookingData: any) {
    const data = this.getData();
    const index = data.bookings.findIndex(booking => booking.id === id);
    
    if (index === -1) return null;
    
    data.bookings[index] = {
      ...data.bookings[index],
      ...bookingData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.bookings[index];
  }

  async deleteBooking(id: string) {
    const data = this.getData();
    const index = data.bookings.findIndex(booking => booking.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Booking not found' };
    }
    
    data.bookings.splice(index, 1);
    this.saveData(data);
    return { success: true, message: 'Booking deleted successfully' };
  }

  // Quotes API
  async getQuotes() {
    const data = this.getData();
    return data.quotes;
  }

  async getQuote(id: string) {
    const data = this.getData();
    return data.quotes.find(quote => quote.id === id) || null;
  }

  async getClientQuotes(clientId: string) {
    const data = this.getData();
    return data.quotes.filter(quote => quote.clientId === clientId);
  }

  async createQuote(quoteData: any) {
    const data = this.getData();
    
    // Generate quote number
    const quoteCount = data.quotes.length + 1;
    const quoteNumber = `QUO-${new Date().getFullYear()}-${quoteCount.toString().padStart(4, '0')}`;
    
    const quote = {
      id: this.generateId(),
      number: quoteNumber,
      ...quoteData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.quotes.push(quote);
    this.saveData(data);
    return quote;
  }

  async updateQuote(id: string, quoteData: any) {
    const data = this.getData();
    const index = data.quotes.findIndex(quote => quote.id === id);
    
    if (index === -1) return null;
    
    data.quotes[index] = {
      ...data.quotes[index],
      ...quoteData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.quotes[index];
  }

  async sendQuote(id: string) {
    const data = this.getData();
    const index = data.quotes.findIndex(quote => quote.id === id);
    
    if (index === -1) return null;
    
    data.quotes[index] = {
      ...data.quotes[index],
      status: 'sent',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.quotes[index];
  }

  async convertQuoteToJob(id: string) {
    const data = this.getData();
    const quote = data.quotes.find(q => q.id === id);
    
    if (!quote) return null;
    
    // Create new job from quote
    const job = {
      id: this.generateId(),
      clientId: quote.clientId,
      originalQuoteId: quote.id, // Use originalQuoteId for consistency
      title: quote.title,
      description: quote.description,
      address: '', // Will need to get from client
      status: 'quote_approved',
      priority: 'medium',
      estimatedDuration: '',
      estimatedValue: quote.total,
      materials: quote.lineItems.filter((item: any) => item.type === 'material' || !item.type),
      labour: quote.lineItems.filter((item: any) => item.type === 'labour'),
      notes: quote.notes || '',
      // CRITICAL FIX: Transfer VAT/CIS settings from quote to job
      // This prevents double VAT charging when generating invoices
      vatEnabled: quote.vatEnabled !== undefined ? quote.vatEnabled : false,
      vatRate: quote.vatRate || 20,
      cisEnabled: quote.cisEnabled !== undefined ? quote.cisEnabled : false,
      cisRate: quote.cisRate || 20,
      subtotal: quote.subtotal,
      vatAmount: quote.vatAmount || 0,
      cisAmount: quote.cisAmount || 0,
      total: quote.total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.jobs.push(job);
    
    // Update quote status
    const quoteIndex = data.quotes.findIndex(q => q.id === id);
    if (quoteIndex !== -1) {
      data.quotes[quoteIndex] = {
        ...quote,
        status: 'converted',
        convertedAt: new Date().toISOString(),
        jobId: job.id,
        updatedAt: new Date().toISOString()
      };
    }
    
    this.saveData(data);
    return job;
  }

  async deleteQuote(id: string) {
    const data = this.getData();
    const index = data.quotes.findIndex(quote => quote.id === id);
    
    if (index === -1) {
      return {
        success: false,
        message: 'Quote not found'
      };
    }
    
    // Check if quote is already converted to a job
    const quote = data.quotes[index];
    if (quote.status === 'converted' && quote.jobId) {
      return {
        success: false,
        message: 'Cannot delete quote that has been converted to a job'
      };
    }
    
    // Remove the quote
    data.quotes.splice(index, 1);
    
    this.saveData(data);
    return {
      success: true,
      message: 'Quote deleted successfully'
    };
  }

  // Branding API
  async getBranding() {
    const data = this.getData();
    return data.branding || {
      logo_url: null,
      logo_dark_url: null,
      icon_url: null,
      primary_color: '#0A84FF',
      accent_color: '#16A34A',
      neutral_color: '#6B7280',
      invoice_use_brand_colors: true,
      invoice_logo_position: 'left',
      selected_template: 'classic'
    };
  }

  async updateBranding(brandingData: any) {
    const data = this.getData();
    const currentBranding = await this.getBranding();
    
    console.log('🏠 [LOCAL] Current branding:', {
      primary_color: currentBranding.primary_color,
      accent_color: currentBranding.accent_color
    });
    
    try {
      console.log('🏠 [LOCAL] Incoming - logo_url:', brandingData.logo_url, 'has_logo_url:', 'logo_url' in brandingData);
    } catch (e) {
      // Ignore logging errors
    }
    
    // Merge branding data, explicitly handling null/undefined values to allow removal
    const mergedBranding = {
      ...currentBranding,
      ...brandingData,
      updatedAt: new Date().toISOString()
    };
    
    // Explicitly handle null/undefined values to allow removal
    if ('logo_url' in brandingData && (brandingData.logo_url === undefined || brandingData.logo_url === null)) {
      mergedBranding.logo_url = undefined;
    }
    if ('logo_dark_url' in brandingData && (brandingData.logo_dark_url === undefined || brandingData.logo_dark_url === null)) {
      mergedBranding.logo_dark_url = undefined;
    }
    if ('icon_url' in brandingData && (brandingData.icon_url === undefined || brandingData.icon_url === null)) {
      mergedBranding.icon_url = undefined;
    }
    
    data.branding = mergedBranding;
    
    try {
      console.log('🏠 [LOCAL] Merged - logo_url:', data.branding.logo_url);
    } catch (e) {
      // Ignore logging errors
    }
    
    this.saveData(data);
    
    console.log('🏠 [LOCAL] Branding saved to localStorage');
    
    return data.branding;
  }

  // Invoice Settings API
  async getInvoiceSettings() {
    const data = this.getData();
    return {
      success: true,
      data: data.invoiceSettings || {
        template: 'classic',
        numbering_prefix: 'INV',
        numbering_sequence: 1,
        payment_terms: 'Payment due within 30 days of invoice date.',
        footer_text: 'Thank you for your business!'
      }
    };
  }

  async updateInvoiceSettings(settingsData: any) {
    const data = this.getData();
    const currentSettings = data.invoiceSettings || {
      template: 'classic',
      numbering_prefix: 'INV',
      numbering_sequence: 1,
      payment_terms: 'Payment due within 30 days of invoice date.',
      footer_text: 'Thank you for your business!'
    };

    data.invoiceSettings = {
      ...currentSettings,
      ...settingsData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return {
      success: true,
      data: data.invoiceSettings
    };
  }

  // Business Details API
  async getBusinessDetails() {
    const data = this.getData();
    return data.businessDetails || null;
  }

  async saveBusinessDetails(businessData: any) {
    const data = this.getData();
    data.businessDetails = {
      ...businessData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.businessDetails;
  }

  // Bank Details API
  async getBankDetails() {
    const data = this.getData();
    return data.bankDetails || null;
  }

  async updateBankDetails(bankData: any) {
    const data = this.getData();
    data.bankDetails = {
      ...bankData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return data.bankDetails;
  }

  // Notification Preferences API
  async getNotificationPreferences() {
    const data = this.getData();
    return {
      success: true,
      data: data.notificationPreferences || null
    };
  }

  async updateNotificationPreferences(preferences: any) {
    const data = this.getData();
    data.notificationPreferences = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData(data);
    return {
      success: true,
      data: data.notificationPreferences
    };
  }
}

export const localApi = new LocalStorageApi();