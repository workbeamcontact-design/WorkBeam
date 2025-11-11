import { projectId, publicAnonKey } from './supabase/info';
import { localApi } from './local-storage-api';
import { supabase } from './supabase/client';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3`;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private useLocalFallback = false;

  // Get the current user's access token
  private async getAccessToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        console.log('🔑 Using access token for authenticated request');
        return session.access_token;
      } else {
        console.warn('⚠️ No access token available - using anon key');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      return null;
    }
  }

  // Health check endpoint
  async healthCheck() {
    try {
      const response = await this.request<{ status: string; timestamp: string }>('/health');
      if (response.success && response.data) {
        this.useLocalFallback = false;
        console.log('✅ Supabase server is healthy');
        return { ...response.data, environment: 'supabase' };
      } else {
        console.warn('🔄 Supabase server health check failed, switching to local storage fallback');
        this.useLocalFallback = true;
        return await localApi.healthCheck();
      }
    } catch (error) {
      console.warn('🔄 Supabase server health check error, switching to local storage fallback:', error);
      this.useLocalFallback = true;
      return await localApi.healthCheck();
    }
  }

  // Manual fallback control
  setLocalFallback(enabled: boolean) {
    console.log(`🔧 Manual fallback mode ${enabled ? 'enabled' : 'disabled'}`);
    this.useLocalFallback = enabled;
  }

  // Check if currently using local fallback
  isUsingLocalFallback() {
    return this.useLocalFallback;
  }

  private async executeWithFallback<T>(
    supabaseOperation: () => Promise<T>,
    localOperation: () => Promise<T>
  ): Promise<T> {
    if (this.useLocalFallback) {
      console.log('🏠 Using local storage fallback');
      return await localOperation();
    }

    try {
      const result = await supabaseOperation();
      
      // Null/undefined results are legitimate (no data, item not found, etc.)
      // Only actual errors (caught below) should trigger fallback
      return result;
    } catch (error) {
      console.warn('🔄 Supabase operation failed, falling back to local storage:', {
        error: error instanceof Error ? error.message : error,
        errorType: error instanceof Error ? error.name : typeof error,
        useLocalFallback: this.useLocalFallback
      });
      
      // Set fallback flag for future requests
      this.useLocalFallback = true;
      
      try {
        return await localOperation();
      } catch (localError) {
        console.error('❌ Local storage fallback also failed:', localError);
        // Return appropriate empty/null values based on operation type
        // We can't access 'result' here since it's out of scope, so check T
        return null as T;
      }
    }
  }
  /**
   * Request org-scoped data (Phase 4b)
   * Uses /org-data/* endpoints that support multi-user collaboration
   */
  private async requestOrgData<T>(
    resource: string,
    id?: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const endpoint = id 
      ? `/org-data/${resource}/${id}`
      : `/org-data/${resource}`;
    return await this.request<T>(endpoint, options);
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🔗 API Request: ${options.method || 'GET'} ${url}`);
    
    try {
      // Get access token for authenticated requests
      const accessToken = await this.getAccessToken();
      
      // Add timeout protection to all API requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || publicAnonKey}`,
          ...options.headers,
        },
      });
      
      clearTimeout(timeoutId);

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // 404 errors are expected in many cases (deleted items, etc.) - log as warning
        if (response.status === 404) {
          console.warn(`⚠️ API Not Found (404):`, errorData);
        } else {
          console.error(`❌ API Error: ${response.status}`, errorData);
        }
        
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log(`✅ API Success:`, data);
      
      // If backend already returns {success, data}, use it directly
      // Otherwise wrap it for consistency
      if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data as ApiResponse<T>;
      }
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ API Request timed out:`, endpoint);
        return {
          success: false,
          error: 'Request timed out after 30 seconds',
        };
      }
      
      console.error('❌ API Network Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error(`🔗 Failed URL: ${url}`);
      console.error(`🔑 Project ID: ${projectId}`);
      console.error(`🎯 Full error:`, error);
      
      return {
        success: false,
        error: `Network error: ${errorMessage}. Check if Supabase server is running.`,
      };
    }
  }

  // =============================================================================
  // CLIENTS API
  // =============================================================================

  async getClients() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ 
          success: boolean; 
          data: any[]; 
          metadata?: { count: number; organization_id: string; } 
        }>('clients');
        
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped clients:', orgResponse.data.data.length);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped clients');
        const response = await this.request<{ clients: any[] }>('/clients');
        return response.success ? response.data?.clients || [] : [];
      },
      () => localApi.getClients()
    );
  }

  async getClient(id: string) {
    // Input validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('⚠️ Invalid client ID provided to getClient:', { id, type: typeof id });
      return null;
    }
    
    return await this.executeWithFallback(
      async () => {
        try {
          // Try org-scoped data first (Phase 4b)
          const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('clients', id);
          if (orgResponse.success && orgResponse.data?.data) {
            console.log('✅ Using org-scoped client:', id);
            return orgResponse.data.data;
          }
          
          // Fall back to user-scoped data (legacy)
          console.log('🔄 Falling back to user-scoped client:', id);
          const response = await this.request<{ client: any }>(`/clients/${id}`);
          if (response.success && response.data?.client) {
            return response.data.client;
          } else if (response.error) {
            console.warn(`⚠️ Client fetch failed: ${response.error}`, { clientId: id });
            return null;
          }
          return null;
        } catch (requestError) {
          console.error('❌ Client request failed:', requestError);
          throw requestError; // Re-throw to trigger fallback
        }
      },
      async () => {
        try {
          return await localApi.getClient(id);
        } catch (localError) {
          console.error('❌ Local client fetch failed:', localError);
          return null;
        }
      }
    );
  }

  async createClient(clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('clients', undefined, {
          method: 'POST',
          body: JSON.stringify(clientData),
        });
        
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Created client in org-scoped storage:', orgResponse.data.data.id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped client creation');
        const response = await this.request<{ client: any }>('/clients', {
          method: 'POST',
          body: JSON.stringify(clientData),
        });
        return response.success ? response.data?.client : null;
      },
      () => localApi.createClient(clientData)
    );
  }

  async updateClient(id: string, clientData: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
  }>) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        // For updates, we use POST with id in the body
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('clients', undefined, {
          method: 'POST',
          body: JSON.stringify({ id, ...clientData }),
        });
        
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Updated client in org-scoped storage:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped client update');
        const response = await this.request<{ client: any }>(`/clients/${id}`, {
          method: 'PUT',
          body: JSON.stringify(clientData),
        });
        return response.success ? response.data?.client : null;
      },
      () => localApi.updateClient(id, clientData)
    );
  }

  async deleteClient(id: string) {
    const result = await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; message: string }>('clients', id, {
          method: 'DELETE',
        });
        
        if (orgResponse.success) {
          console.log('✅ Deleted client from org-scoped storage:', id);
          return {
            success: true,
            message: orgResponse.data?.message || 'Client deleted successfully'
          };
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped client deletion');
        const response = await this.request<{ success: boolean; message?: string }>(`/clients/${id}`, {
          method: 'DELETE',
        });
        return {
          success: response.success,
          message: response.data?.message || (response.success ? 'Client deleted successfully' : response.error)
        };
      },
      () => localApi.deleteClient(id)
    );
    
    // Clear ALL local cache after successful client deletion (clients, jobs, quotes, etc.)
    if (result.success) {
      this.clearAllLocalCache();
    }
    
    return result;
  }

  // =============================================================================
  // JOBS API
  // =============================================================================

  async getJobs() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('jobs');
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped jobs:', orgResponse.data.data.length);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped jobs');
        const response = await this.request<{ jobs: any[] }>('/jobs');
        return response.success ? response.data?.jobs || [] : [];
      },
      () => localApi.getJobs()
    );
  }

  async getJob(id: string) {
    // Input validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('⚠️ Invalid job ID provided to getJob:', { id, type: typeof id });
      return null;
    }
    
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('jobs', id);
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped job:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped job:', id);
        const response = await this.request<{ job: any }>(`/jobs/${id}`);
        if (response.success && response.data?.job) {
          return response.data.job;
        } else if (response.error?.includes('not found') || response.error?.includes('404')) {
          // Job doesn't exist - this is expected in some cases (job was deleted)
          console.log(`ℹ️ Job ${id} not found - may have been deleted`);
          return null;
        }
        return null;
      },
      () => localApi.getJob(id)
    );
  }

  async getClientJobs(clientId: string) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b) - filter by clientId on frontend
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('jobs');
        if (orgResponse.success && orgResponse.data?.data) {
          const clientJobs = orgResponse.data.data.filter((job: any) => job.clientId === clientId);
          console.log('✅ Using org-scoped client jobs:', clientJobs.length);
          return clientJobs;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped client jobs');
        const response = await this.request<{ jobs: any[] }>(`/clients/${clientId}/jobs`);
        return response.success ? response.data?.jobs || [] : [];
      },
      () => localApi.getClientJobs(clientId)
    );
  }

  async createJob(jobData: {
    clientId: string;
    title: string;
    description?: string;
    address?: string;
    status?: string;
    priority?: string;
    estimatedDuration?: string;
    estimatedValue?: number;
    materials?: any[];
    labour?: any[];
    notes?: string;
  }) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('jobs', undefined, {
          method: 'POST',
          body: JSON.stringify(jobData),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Created job in org-scoped storage:', orgResponse.data.data.id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped job creation');
        const response = await this.request<{ job: any }>('/jobs', {
          method: 'POST',
          body: JSON.stringify(jobData),
        });
        return response.success ? response.data?.job : null;
      },
      () => localApi.createJob(jobData)
    );
  }

  async updateJob(id: string, jobData: Partial<{
    title: string;
    description: string;
    address: string;
    status: string;
    priority: string;
    estimatedDuration: string;
    estimatedValue: number;
    materials: any[];
    labour: any[];
    notes: string;
  }>) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('jobs', undefined, {
          method: 'POST',
          body: JSON.stringify({ id, ...jobData }),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Updated job in org-scoped storage:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped job update');
        const response = await this.request<{ job: any }>(`/jobs/${id}`, {
          method: 'PUT',
          body: JSON.stringify(jobData),
        });
        return response.success ? response.data?.job : null;
      },
      () => localApi.updateJob(id, jobData)
    );
  }

  async deleteJob(id: string) {
    const result = await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; message: string }>('jobs', id, {
          method: 'DELETE',
        });
        if (orgResponse.success) {
          console.log('✅ Deleted job from org-scoped storage:', id);
          return {
            success: true,
            message: orgResponse.data?.message || 'Job deleted successfully'
          };
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped job deletion');
        const response = await this.request<{ success: boolean; message?: string }>(`/jobs/${id}`, {
          method: 'DELETE',
        });
        return {
          success: response.success,
          message: response.data?.message || (response.success ? 'Job deleted successfully' : response.error)
        };
      },
      () => localApi.deleteJob(id)
    );
    
    // Clear local cache after successful deletion
    if (result.success) {
      this.clearLocalCacheForType('jobs');
    }
    
    return result;
  }

  // =============================================================================
  // INVOICES API
  // =============================================================================

  async getInvoices() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('invoices');
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped invoices:', orgResponse.data.data.length);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped invoices');
        const response = await this.request<{ invoices: any[] }>('/invoices');
        return response.success ? response.data?.invoices || [] : [];
      },
      () => localApi.getInvoices()
    );
  }

  async getInvoice(id: string) {
    // Input validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('⚠️ Invalid invoice ID provided to getInvoice:', { id, type: typeof id });
      return null;
    }
    
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('invoices', id);
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped invoice:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped invoice:', id);
        const response = await this.request<{ invoice: any }>(`/invoices/${id}`);
        if (response.success && response.data?.invoice) {
          return response.data.invoice;
        } else if (response.error?.includes('not found') || response.error?.includes('404')) {
          console.log(`ℹ️ Invoice ${id} not found - may have been deleted`);
          return null;
        }
        return null;
      },
      () => localApi.getInvoice(id)
    );
  }

  async getJobInvoices(jobId: string) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b) - filter by jobId on frontend
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('invoices');
        if (orgResponse.success && orgResponse.data?.data) {
          const jobInvoices = orgResponse.data.data.filter((inv: any) => inv.jobId === jobId);
          console.log('✅ Using org-scoped job invoices:', jobInvoices.length);
          return jobInvoices;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped job invoices');
        const response = await this.request<{ invoices: any[] }>(`/jobs/${jobId}/invoices`);
        return response.success ? response.data?.invoices || [] : [];
      },
      () => localApi.getJobInvoices(jobId)
    );
  }

  async createInvoice(invoiceData: {
    jobId: string;
    clientId: string;
    issueDate?: string;
    dueDate: string;
    lineItems: any[];
    subtotal: number;
    vatAmount: number;
    cisAmount?: number;
    total: number;
    vatEnabled?: boolean;
    cisEnabled?: boolean;
    paymentTerms?: string;
    notes?: string;
    templateData?: any;
    selectedTemplate?: string;
    billType?: string;
    [key: string]: any; // Allow additional fields
  }) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('invoices', undefined, {
          method: 'POST',
          body: JSON.stringify(invoiceData),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Created invoice in org-scoped storage:', orgResponse.data.data.id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped invoice creation');
        const response = await this.request<{ invoice: any }>('/invoices', {
          method: 'POST',
          body: JSON.stringify(invoiceData),
        });
        return response.success ? response.data?.invoice : null;
      },
      () => localApi.createInvoice(invoiceData)
    );
  }

  async updateInvoice(id: string, invoiceData: Partial<{
    status: string;
    issueDate: string;
    dueDate: string;
    paidAt: string;
    lineItems: any[];
    subtotal: number;
    vatAmount: number;
    cisAmount: number;
    total: number;
    vatEnabled: boolean;
    cisEnabled: boolean;
    paymentTerms: string;
    notes: string;
  }>) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('invoices', undefined, {
          method: 'POST',
          body: JSON.stringify({ id, ...invoiceData }),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Updated invoice in org-scoped storage:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped invoice update');
        const response = await this.request<{ invoice: any }>(`/invoices/${id}`, {
          method: 'PUT',
          body: JSON.stringify(invoiceData),
        });
        return response.success ? response.data?.invoice : null;
      },
      () => localApi.updateInvoice(id, invoiceData)
    );
  }

  // =============================================================================
  // PAYMENTS API
  // =============================================================================

  async getPayments() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('payments');
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped payments:', orgResponse.data.data.length);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped payments');
        const response = await this.request<{ payments: any[] }>('/payments');
        return response.success ? response.data?.payments || [] : [];
      },
      () => localApi.getPayments()
    );
  }

  async getInvoicePayments(invoiceId: string) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b) - filter by invoiceId on frontend
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('payments');
        if (orgResponse.success && orgResponse.data?.data) {
          const invoicePayments = orgResponse.data.data.filter((p: any) => p.invoiceId === invoiceId);
          console.log('✅ Using org-scoped invoice payments:', invoicePayments.length);
          return invoicePayments;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped invoice payments');
        const response = await this.request<{ payments: any[] }>(`/invoices/${invoiceId}/payments`);
        return response.success ? response.data?.payments || [] : [];
      },
      () => localApi.getInvoicePayments(invoiceId)
    );
  }

  async recordPayment(paymentData: {
    invoiceId: string;
    amount: number;
    method: string;
    reference?: string;
    date?: string;
    notes?: string;
  }) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('payments', undefined, {
          method: 'POST',
          body: JSON.stringify(paymentData),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Recorded payment in org-scoped storage:', orgResponse.data.data.id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped payment recording');
        const response = await this.request<{ payment: any }>('/payments', {
          method: 'POST',
          body: JSON.stringify(paymentData),
        });
        return response.success ? response.data?.payment : null;
      },
      () => localApi.recordPayment(paymentData)
    );
  }

  // =============================================================================
  // BRANDING API
  // =============================================================================

  async getBranding() {
    return await this.executeWithFallback(
      async () => {
        try {
          // Try org-scoped data first (Phase 4b)
          const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('branding');
          if (orgResponse.success && orgResponse.data?.data) {
            console.log('✅ Using org-scoped branding');
            return orgResponse.data.data;
          }
          
          // Fall back to user-scoped data (legacy)
          console.log('🔄 Falling back to user-scoped branding');
          const response = await this.request<{ branding: any }>('/branding');
          if (response.success && response.data?.branding) {
            return response.data.branding;
          }
          // Return null if no branding data, fallback will provide defaults
          console.log('ℹ️ [API] No branding data from server, using fallback');
          return null;
        } catch (error) {
          console.warn('⚠️ [API] getBranding failed, using fallback:', error);
          throw error; // Let executeWithFallback handle it
        }
      },
      async () => {
        console.log('🏠 [API] Using local storage fallback for branding');
        return await localApi.getBranding();
      }
    );
  }

  async updateBranding(brandingData: {
    logo_url?: string;
    logo_dark_url?: string;
    icon_url?: string;
    primary_color?: string;
    accent_color?: string;
    neutral_color?: string;
    invoice_use_brand_colors?: boolean;
    invoice_logo_position?: 'left' | 'right';
    selected_template?: string;
  }) {
    // Safe logging - avoid cross-origin errors
    try {
      console.log('🎯 [API] updateBranding - logo_url:', brandingData.logo_url, 'has_logo_url:', 'logo_url' in brandingData);
    } catch (e) {
      // Ignore logging errors in iframe environment
    }
    
    const result = await this.executeWithFallback(
      async () => {
        const response = await this.request<{ branding: any }>('/branding', {
          method: 'PUT',
          body: JSON.stringify(brandingData),
        });
        try {
          console.log('🎯 [API] Server response - logo_url:', response.data?.branding?.logo_url);
        } catch (e) {
          // Ignore logging errors
        }
        return response.success ? response.data?.branding : null;
      },
      () => localApi.updateBranding(brandingData)
    );
    
    try {
      console.log('🎯 [API] updateBranding result - logo_url:', result?.logo_url);
    } catch (e) {
      // Ignore logging errors
    }
    
    return result;
  }

  async uploadBrandingFile(file: File, type: 'logo' | 'logo_dark' | 'icon') {
    console.log('📤 [API] uploadBrandingFile called:', file.name, file.type);
    
    // Use data URL approach directly (more reliable than server upload for prototyping)
    try {
      console.log('📄 [API] Converting file to data URL...');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          console.log('✅ [API] Data URL created, length:', result.length);
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('❌ [API] FileReader error:', error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });
      
      console.log('✅ [API] File converted to data URL successfully');
      return dataUrl;
    } catch (error) {
      console.error('❌ [API] Upload failed:', error);
      throw new Error('Failed to process image file');
    }
  }

  // =============================================================================
  // INVOICE SETTINGS API
  // =============================================================================

  async getInvoiceSettings() {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ settings: any }>('/invoice-settings');
        return response;
      },
      () => localApi.getInvoiceSettings()
    );
  }

  async updateInvoiceSettings(settingsData: {
    template?: string;
    numbering_prefix?: string;
    numbering_sequence?: number;
    payment_terms?: string;
    footer_text?: string;
  }) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ settings: any }>('/invoice-settings', {
          method: 'PUT',
          body: JSON.stringify(settingsData),
        });
        return response;
      },
      () => localApi.updateInvoiceSettings(settingsData)
    );
  }

  // =============================================================================
  // NOTIFICATION PREFERENCES API
  // =============================================================================

  async getNotificationPreferences() {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ preferences: any }>('/notification-preferences');
        return { success: true, data: response.data?.preferences || null };
      },
      () => localApi.getNotificationPreferences()
    );
  }

  async updateNotificationPreferences(preferences: any) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ preferences: any }>('/notification-preferences', {
          method: 'PUT',
          body: JSON.stringify(preferences),
        });
        return response;
      },
      () => localApi.updateNotificationPreferences(preferences)
    );
  }

  // =============================================================================
  // BOOKINGS API
  // =============================================================================

  async getBookings() {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ bookings: any[] }>('/bookings');
        return response.success ? response.data?.bookings || [] : [];
      },
      () => localApi.getBookings()
    );
  }

  async createBooking(bookingData: {
    clientId?: string | null;
    jobId?: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type?: string;
    status?: string;
    address?: string;
    notes?: string;
    clientName?: string;
    clientPhone?: string;
    isLead?: boolean;
    isAllDay?: boolean;
  }) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ booking: any }>('/bookings', {
          method: 'POST',
          body: JSON.stringify(bookingData),
        });
        return response.success ? response.data?.booking : null;
      },
      () => localApi.createBooking(bookingData)
    );
  }

  async updateBooking(id: string, bookingData: Partial<{
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    status: string;
    address: string;
    notes: string;
  }>) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ booking: any }>(`/bookings/${id}`, {
          method: 'PUT',
          body: JSON.stringify(bookingData),
        });
        return response.success ? response.data?.booking : null;
      },
      () => localApi.updateBooking(id, bookingData)
    );
  }

  async deleteBooking(id: string) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ success: boolean; message?: string }>(`/bookings/${id}`, {
          method: 'DELETE',
        });
        return {
          success: response.success,
          message: response.data?.message || (response.success ? 'Booking deleted successfully' : response.error)
        };
      },
      () => localApi.deleteBooking(id)
    );
  }

  // =============================================================================
  // QUOTES API
  // =============================================================================

  async getQuotes() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('quotes');
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped quotes:', orgResponse.data.data.length);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped quotes');
        const response = await this.request<{ quotes: any[] }>('/quotes');
        return response.success ? response.data?.quotes || [] : [];
      },
      () => localApi.getQuotes()
    );
  }

  async getQuote(id: string) {
    // Input validation
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.warn('⚠️ Invalid quote ID provided to getQuote:', { id, type: typeof id });
      return null;
    }
    
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('quotes', id);
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped quote:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped quote:', id);
        const response = await this.request<{ quote: any }>(`/quotes/${id}`);
        if (response.success && response.data?.quote) {
          return response.data.quote;
        } else if (response.error?.includes('not found') || response.error?.includes('404')) {
          console.log(`ℹ️ Quote ${id} not found - may have been deleted`);
          return null;
        }
        return null;
      },
      () => localApi.getQuote(id)
    );
  }

  async getClientQuotes(clientId: string) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b) - filter by clientId on frontend
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any[] }>('quotes');
        if (orgResponse.success && orgResponse.data?.data) {
          const clientQuotes = orgResponse.data.data.filter((q: any) => q.clientId === clientId);
          console.log('✅ Using org-scoped client quotes:', clientQuotes.length);
          return clientQuotes;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped client quotes');
        const response = await this.request<{ quotes: any[] }>(`/clients/${clientId}/quotes`);
        return response.success ? response.data?.quotes || [] : [];
      },
      () => localApi.getClientQuotes(clientId)
    );
  }

  async createQuote(quoteData: {
    clientId: string;
    jobId?: string;
    title: string;
    description?: string;
    lineItems: any[];
    subtotal: number;
    vatAmount: number;
    cisAmount?: number;
    total: number;
    vatEnabled?: boolean;
    cisEnabled?: boolean;
    validUntil?: string;
    notes?: string;
  }) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('quotes', undefined, {
          method: 'POST',
          body: JSON.stringify(quoteData),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Created quote in org-scoped storage:', orgResponse.data.data.id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped quote creation');
        const response = await this.request<{ quote: any }>('/quotes', {
          method: 'POST',
          body: JSON.stringify(quoteData),
        });
        return response.success ? response.data?.quote : null;
      },
      () => localApi.createQuote(quoteData)
    );
  }

  async updateQuote(id: string, quoteData: Partial<{
    title: string;
    description: string;
    lineItems: any[];
    subtotal: number;
    vatAmount: number;
    cisAmount: number;
    total: number;
    vatEnabled: boolean;
    cisEnabled: boolean;
    validUntil: string;
    notes: string;
    status: string;
  }>) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('quotes', undefined, {
          method: 'POST',
          body: JSON.stringify({ id, ...quoteData }),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Updated quote in org-scoped storage:', id);
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped quote update');
        const response = await this.request<{ quote: any }>(`/quotes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(quoteData),
        });
        return response.success ? response.data?.quote : null;
      },
      () => localApi.updateQuote(id, quoteData)
    );
  }

  async sendQuote(id: string) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ quote: any }>(`/quotes/${id}/send`, {
          method: 'POST',
        });
        return response.success ? response.data?.quote : null;
      },
      () => localApi.sendQuote(id)
    );
  }

  async convertQuoteToJob(id: string) {
    return await this.executeWithFallback(
      async () => {
        const response = await this.request<{ job: any }>(`/quotes/${id}/convert`, {
          method: 'POST',
        });
        return response.success ? response.data?.job : null;
      },
      () => localApi.convertQuoteToJob(id)
    );
  }

  async deleteQuote(id: string) {
    const result = await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; message: string }>('quotes', id, {
          method: 'DELETE',
        });
        if (orgResponse.success) {
          console.log('✅ Deleted quote from org-scoped storage:', id);
          return {
            success: true,
            message: orgResponse.data?.message || 'Quote deleted successfully'
          };
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped quote deletion');
        const response = await this.request<{ success: boolean; message?: string }>(`/quotes/${id}`, {
          method: 'DELETE',
        });
        return {
          success: response.success,
          message: response.data?.message || (response.success ? 'Quote deleted successfully' : response.error)
        };
      },
      () => localApi.deleteQuote(id)
    );
    
    // Clear local cache after successful deletion
    if (result.success) {
      this.clearLocalCacheForType('quotes');
    }
    
    return result;
  }

  // =============================================================================
  // BUSINESS DETAILS API
  // =============================================================================

  async getBusinessDetails() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('business-details');
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped business details');
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped business details');
        const response = await this.request<{ businessDetails: any }>('/business-details');
        return response.success ? response.data?.businessDetails : null;
      },
      () => localApi.getBusinessDetails()
    );
  }

  async saveBusinessDetails(businessData: any) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('business-details', undefined, {
          method: 'POST',
          body: JSON.stringify(businessData),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Saved business details in org-scoped storage');
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped business details save');
        const response = await this.request<{ businessDetails: any }>('/business-details', {
          method: 'POST',
          body: JSON.stringify(businessData),
        });
        return response.success ? response.data?.businessDetails : null;
      },
      () => localApi.saveBusinessDetails(businessData)
    );
  }

  // =============================================================================
  // BANK DETAILS API
  // =============================================================================

  async getBankDetails() {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('bank-details');
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Using org-scoped bank details');
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped bank details');
        const response = await this.request<{ bankDetails: any }>('/bank-details');
        return response.success ? response.data?.bankDetails : null;
      },
      () => localApi.getBankDetails()
    );
  }

  async updateBankDetails(bankData: {
    account_holder_name: string;
    bank_name: string;
    sort_code: string;
    account_number: string;
    iban?: string;
    show_on_invoice?: boolean;
  }) {
    return await this.executeWithFallback(
      async () => {
        // Try org-scoped data first (Phase 4b)
        const orgResponse = await this.requestOrgData<{ success: boolean; data: any }>('bank-details', undefined, {
          method: 'POST',
          body: JSON.stringify(bankData),
        });
        if (orgResponse.success && orgResponse.data?.data) {
          console.log('✅ Updated bank details in org-scoped storage');
          return orgResponse.data.data;
        }
        
        // Fall back to user-scoped data (legacy)
        console.log('🔄 Falling back to user-scoped bank details update');
        const response = await this.request<{ bankDetails: any }>('/bank-details', {
          method: 'PUT',
          body: JSON.stringify(bankData),
        });
        return response.success ? response.data?.bankDetails : null;
      },
      () => localApi.updateBankDetails(bankData)
    );
  }

  // =============================================================================
  // LOCAL CACHE MANAGEMENT
  // =============================================================================

  /**
   * Clear local cache for a specific data type
   * Forces fresh fetch from Supabase on next request
   */
  private clearLocalCacheForType(type: 'jobs' | 'clients' | 'quotes' | 'invoices' | 'bookings' | 'payments') {
    try {
      const { removeUserData } = require('./user-scoped-storage');
      removeUserData(type);
      console.log(`🧹 Cleared local cache for: ${type}`);
    } catch (error) {
      console.warn(`Failed to clear local cache for ${type}:`, error);
    }
  }

  /**
   * Clear ALL local cache
   * Use when deleting parent entities (like clients) that affect multiple child entities
   */
  private clearAllLocalCache() {
    try {
      const { removeUserData } = require('./user-scoped-storage');
      removeUserData('jobs');
      removeUserData('clients');
      removeUserData('quotes');
      removeUserData('invoices');
      removeUserData('payments');
      removeUserData('bookings');
      console.log('🧹 Cleared ALL local cache');
    } catch (error) {
      console.warn('Failed to clear all local cache:', error);
    }
  }

  // =============================================================================
  // DATABASE CLEANUP UTILITIES
  // =============================================================================

  /**
   * Clean up orphaned old-format data from the database
   * This removes jobs, quotes, invoices, etc. that were stored with old key formats
   * Should be called once after deploying user isolation fixes
   */
  async cleanupOrphanedData() {
    try {
      const response = await this.request<{ 
        success: boolean; 
        message: string;
        deleted: number;
        breakdown: {
          jobs: number;
          quotes: number;
          invoices: number;
          clients: number;
          bookings: number;
          payments: number;
        }
      }>('/cleanup-orphaned-data', {
        method: 'POST',
      });
      
      return {
        success: response.success,
        message: response.data?.message || (response.success ? 'Cleanup completed' : response.error),
        deleted: response.data?.deleted || 0,
        breakdown: response.data?.breakdown
      };
    } catch (error) {
      console.error('Failed to cleanup orphaned data:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cleanup orphaned data',
        deleted: 0
      };
    }
  }
}

export const api = new ApiClient();