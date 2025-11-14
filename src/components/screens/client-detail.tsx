import { Phone, Navigation, Plus, ArrowLeft, Quote, Edit, Trash2, MapPin, CreditCard, CheckCircle, Clock, AlertTriangle, TrendingUp, Calendar, Receipt, Eye, User, Settings as SettingsIcon, Mail, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { StatusBadge } from "../trades-ui/status-badge";
import { QuoteStatusBadge } from "../trades-ui/quote-status-badge";
import { FloatingActionButton } from "../trades-ui/floating-action-button";
import { WhatsAppIcon } from "../ui/whatsapp-icon";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { api } from "../../utils/api";
import { EmptyStateIllustration } from "../ui/empty-state-illustration";
import { formatPhoneForWhatsApp } from "../../utils/phone-utils";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../utils/auth-context";
import { AttributionDisplay } from "../ui/attribution-display";
import { useAppStore } from "../../hooks/useAppStore";

interface ClientDetailProps {
  client: any; // Can be full client object OR just { id: string }
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface JobFinancialDetail {
  jobId: string;
  jobTitle: string;
  status: 'overdue' | 'due_soon' | 'pending' | 'deposit_paid' | 'partially_paid' | 'fully_paid' | 'not_invoiced';
  outstandingAmount: number;
  totalValue: number;
  dueDate?: string;
  daysUntilDue?: number;
  invoices: InvoiceDetail[];
}

interface InvoiceDetail {
  id: string;
  number: string;
  amount: number;
  status: string;
  dueDate?: string;
  issueDate?: string;
}

interface ClientFinancialSummary {
  totalOutstanding: number;
  totalPaid: number;
  totalValue: number;
  jobCount: number;
  activeJobsWithBalance: number;
  lastPaymentDate?: string;
  jobs: JobFinancialDetail[];
}

interface PaymentRecordingState {
  isOpen: boolean;
  selectedInvoices: string[];
  paymentAmount: string;
  paymentMethod: 'cash' | 'bank' | 'other';
  reference: string;
}

export function ClientDetail({ client: clientProp, onNavigate, onBack }: ClientDetailProps) {
  const { user } = useAuth();
  
  // Client data state - will be fetched if only ID is provided
  const [client, setClient] = useState<any>(null);
  const [clientLoading, setClientLoading] = useState(true);
  
  const [jobs, setJobs] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showFloatingActions, setShowFloatingActions] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentRecordingState>({
    isOpen: false,
    selectedInvoices: [],
    paymentAmount: '',
    paymentMethod: 'bank',
    reference: ''
  });
  const [financialSummary, setFinancialSummary] = useState<ClientFinancialSummary | null>(null);

  // Watch for refresh trigger from app store
  const { clientDetailRefreshKey } = useAppStore();

  // STEP 1: Fetch full client data if only ID was provided
  // This handles the case where Zustand's persist middleware wipes the navigation data
  useEffect(() => {
    console.log('🔍 ClientDetail useEffect triggered:', {
      hasClientProp: !!clientProp,
      clientPropType: typeof clientProp,
      clientPropKeys: clientProp ? Object.keys(clientProp) : [],
      clientPropSample: clientProp
    });

    const fetchClientData = async () => {
      if (!clientProp) {
        console.error('❌ ClientDetail: No client prop provided');
        setError('Client not found. Please go back and try again.');
        setClientLoading(false);
        return;
      }

      // Extract client ID (could be string or object with id)
      const clientId = typeof clientProp === 'string' ? clientProp : clientProp.id;
      
      console.log('🔑 ClientDetail: Extracted client ID:', { 
        clientId, 
        propType: typeof clientProp,
        hasName: !!(clientProp as any).name 
      });
      
      if (!clientId) {
        console.error('❌ ClientDetail: No client ID found', { clientProp });
        setError('Invalid client reference. Please go back and try again.');
        setClientLoading(false);
        return;
      }

      // If we have full client data with name, use it directly
      if ((clientProp as any).name) {
        console.log('✅ ClientDetail: Using provided client data', { id: clientId, name: (clientProp as any).name });
        setClient(clientProp);
        setClientLoading(false);
        return;
      }

      // Otherwise, fetch the full client data by ID
      console.log('🔄 ClientDetail: Fetching client data by ID', { clientId });
      try {
        const fetchedClient = await api.getClient(clientId);
        console.log('📦 ClientDetail: API response:', { 
          success: !!fetchedClient, 
          hasId: fetchedClient?.id,
          hasName: fetchedClient?.name,
          client: fetchedClient 
        });
        
        if (fetchedClient) {
          console.log('✅ ClientDetail: Fetched client data', { id: fetchedClient.id, name: fetchedClient.name });
          setClient(fetchedClient);
        } else {
          console.error('❌ ClientDetail: Client not found', { clientId });
          setError('Client not found. It may have been deleted.');
        }
      } catch (err) {
        console.error('❌ ClientDetail: Error fetching client', err);
        setError('Failed to load client data. Please try again.');
      } finally {
        setClientLoading(false);
      }
    };

    fetchClientData();
  }, [clientProp]);

  // STEP 2: Load client data when user logs in, client changes, or refresh is triggered
  useEffect(() => {
    if (user && client?.id && !clientLoading) {
      console.log('👤 Client Detail: Loading related data for client:', client.name);
      loadClientData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, client?.id, clientDetailRefreshKey, user, clientLoading]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Skip re-fetching client - we already have the data
      // Just validate the client exists
      if (!client || !client.id) {
        console.error('❌ Client Detail Error: Missing client data', { 
          hasClient: !!client, 
          clientId: client?.id,
          clientName: client?.name,
          fullClient: JSON.stringify(client, null, 2)
        });
        setError('Invalid client data. Please go back and try again.');
        setLoading(false);
        return;
      }
      
      console.log('✅ Client Detail: Loading data for client:', {
        id: client.id,
        name: client.name,
        hasAddress: !!client.address,
        hasPhone: !!client.phone,
        allFields: Object.keys(client)
      });
      
      const [clientJobs, clientQuotes, allInvoices, allPayments] = await Promise.all([
        api.getClientJobs(client.id),
        api.getClientQuotes(client.id),
        api.getInvoices(),
        api.getPayments()
      ]);
      
      console.log('✅ Client Detail: Fetched related data:', {
        jobs: clientJobs?.length || 0,
        quotes: clientQuotes?.length || 0,
        invoices: allInvoices?.length || 0,
        payments: allPayments?.length || 0
      });
      
      const clientInvoices = allInvoices.filter((invoice: any) => invoice.clientId === client.id);
      const clientPayments = (allPayments || []).filter((payment: any) => payment.clientId === client.id);
      
      // Fix any jobs that have "quote_pending" status but no associated quotes (these should be "scheduled")
      const jobsWithFixedStatus = await Promise.all((clientJobs || []).map(async (job: any) => {
        if (job.status === 'quote_pending') {
          // Check if this job has any associated quotes
          const jobQuotes = (clientQuotes || []).filter((quote: any) => quote.jobId === job.id);
          
          // If no quotes exist for this job, it should be "scheduled" (direct job creation)
          if (jobQuotes.length === 0) {
            console.log(`🔧 Fixing job status: "${job.title}" from "quote_pending" to "scheduled"`);
            try {
              const updatedJob = await api.updateJob(job.id, { status: 'scheduled' });
              return updatedJob || { ...job, status: 'scheduled' };
            } catch (error) {
              console.warn('Failed to update job status:', error);
              return { ...job, status: 'scheduled' }; // Update locally at least
            }
          }
        }
        return job;
      }));
      
      // Sort jobs by creation date (newest first)
      const sortedJobs = jobsWithFixedStatus.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Sort quotes by creation date (newest first)
      const sortedQuotes = (clientQuotes || []).sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setJobs(sortedJobs);
      setQuotes(sortedQuotes);
      setInvoices(clientInvoices || []);
      
      setTimeout(() => {
        try {
          const calculationPromise = new Promise<void>((resolve) => {
            calculateFinancialSummary(clientJobs || [], clientInvoices || [], clientPayments || []);
            resolve();
          });
          
          const timeoutPromise = new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Financial calculation timeout')), 3000)
          );
          
          Promise.race([calculationPromise, timeoutPromise]).catch(error => {
            console.error('Financial summary calculation failed or timed out:', error.message);
            // Fallback: Calculate using payment records and partial payments
            const totalPaid = (clientPayments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
            const totalOutstanding = (clientInvoices || [])
              .filter((inv: any) => inv.status !== 'paid')
              .reduce((sum: number, inv: any) => {
                const invoiceTotal = inv.total || 0;
                const amountPaid = inv.amountPaid || 0;
                return sum + Math.max(0, invoiceTotal - amountPaid);
              }, 0);
            setFinancialSummary({
              totalOutstanding,
              totalPaid,
              totalValue: (clientJobs || [])
                .reduce((sum: number, job: any) => sum + (job.estimatedValue || 0), 0),
              jobCount: clientJobs?.length || 0,
              activeJobsWithBalance: 0,
              jobs: []
            });
          });
        } catch (error) {
          console.error('Financial summary calculation setup failed:', error);
          setFinancialSummary({
            totalOutstanding: 0,
            totalPaid: 0,
            totalValue: 0,
            jobCount: clientJobs?.length || 0,
            activeJobsWithBalance: 0,
            jobs: []
          });
        }
      }, 100);
    } catch (err) {
      console.error('Failed to load client data:', err);
      setError('Failed to load client data. The client may no longer exist.');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialSummary = (jobsData: any[], invoicesData: any[], paymentsData: any[] = []) => {
    try {
      if (!Array.isArray(jobsData) || !Array.isArray(invoicesData)) {
        console.warn('Invalid data types for financial calculation');
        setFinancialSummary({
          totalOutstanding: 0,
          totalPaid: 0,
          totalValue: 0,
          jobCount: 0,
          activeJobsWithBalance: 0,
          jobs: []
        });
        return;
      }

      if (jobsData.length > 50 || invoicesData.length > 200) {
        console.warn('Large dataset detected, using simplified calculation');
        const totalValue = jobsData.reduce((sum, job) => {
          // Use total (with VAT) as primary source, fallback to estimatedValue (pre-VAT)
          const value = Number(job.total || job.estimatedValue || 0);
          return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        // Calculate totalPaid from actual payment records
        const totalPaid = paymentsData.reduce((sum, payment) => {
          const amount = Number(payment.amount || 0);
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
        
        // Calculate totalOutstanding: account for partial payments on each invoice
        const totalOutstanding = invoicesData
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => {
            const invoiceTotal = inv.total || 0;
            const amountPaid = inv.amountPaid || 0;
            return sum + Math.max(0, invoiceTotal - amountPaid);
          }, 0);
        
        setFinancialSummary({
          totalOutstanding,
          totalPaid,
          totalValue,
          jobCount: jobsData.length,
          activeJobsWithBalance: totalOutstanding > 0 ? jobsData.length : 0,
          jobs: []
        });
        return;
      }

      const now = new Date();
      
      // Calculate totalPaid from actual payment records
      const totalPaid = paymentsData.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      
      // Calculate totalOutstanding: account for partial payments on each invoice
      const totalOutstanding = invoicesData
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => {
          const invoiceTotal = inv.total || 0;
          const amountPaid = inv.amountPaid || 0;
          return sum + Math.max(0, invoiceTotal - amountPaid);
        }, 0);
      
      const totalJobValue = jobsData.reduce((sum, job) => {
        // Use total (with VAT) as primary source for contract value
        const jobValue = job.total || job.estimatedValue || job.value || job.amount || job.quoteTotal || job.quote_total || job.finalTotal || job.budget || 0;
        return sum + jobValue;
      }, 0);
      
      const totalValue = totalJobValue > 0 ? totalJobValue : (totalOutstanding + totalPaid);
      
      const jobFinancialDetails: JobFinancialDetail[] = jobsData.map(job => {
        const jobInvoices = invoicesData.filter(inv => inv.jobId === job.id);
        const jobInvoiceIds = jobInvoices.map(inv => inv.id);
        
        // Calculate total paid from payment records for this job's invoices
        const jobPayments = paymentsData.filter(payment => jobInvoiceIds.includes(payment.invoiceId));
        const totalPaidForJob = jobPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Calculate outstanding: total invoiced minus total paid
        const totalInvoiced = jobInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const outstandingAmount = Math.max(0, totalInvoiced - totalPaidForJob);
        
        // Use total (with VAT) as primary source for individual job contract value
        const jobContractValue = job.total || job.estimatedValue || job.value || job.amount || job.quoteTotal || 0;
        const jobTotalValue = jobContractValue > 0 ? jobContractValue : totalInvoiced;
        
        let earliestDueDate: string | undefined;
        let daysUntilDue: number | undefined;
        
        // Find earliest due date among unpaid invoices
        if (outstandingAmount > 0) {
          const unpaidInvoices = jobInvoices.filter(inv => {
            const invoicePayments = paymentsData.filter(p => p.invoiceId === inv.id);
            const invoicePaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            return invoicePaid < (inv.total || 0);
          });
          
          const dueDates = unpaidInvoices
            .filter(inv => inv.dueDate)
            .map(inv => new Date(inv.dueDate!))
            .sort((a, b) => a.getTime() - b.getTime());
          
          if (dueDates.length > 0) {
            earliestDueDate = dueDates[0].toISOString();
            daysUntilDue = Math.ceil((dueDates[0].getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        
        const totalInvoices = jobInvoices.length;
        
        let status: 'overdue' | 'due_soon' | 'pending' | 'deposit_paid' | 'partially_paid' | 'fully_paid' | 'not_invoiced' = 'not_invoiced';
        
        if (totalInvoices === 0) {
          status = 'not_invoiced';
        } else if (totalPaidForJob >= jobTotalValue && jobTotalValue > 0) {
          // Job is fully paid when total paid equals or exceeds contract value
          status = 'fully_paid';
        } else if (totalPaidForJob > 0 && outstandingAmount === 0) {
          // Some payments made, no outstanding invoices, but not fully paid against contract value
          // This means deposit paid but remaining invoice not yet sent
          status = 'deposit_paid';
        } else if (totalPaidForJob > 0 && outstandingAmount > 0) {
          // Some payments made but there are still outstanding invoices
          status = 'partially_paid';
        } else if (outstandingAmount > 0) {
          // No payments made yet, but invoices are outstanding
          if (daysUntilDue !== undefined) {
            if (daysUntilDue < 0) {
              status = 'overdue';
            } else if (daysUntilDue <= 7) {
              status = 'due_soon';
            } else {
              status = 'pending';
            }
          } else {
            status = 'pending';
          }
        }
        
        return {
          jobId: job.id,
          jobTitle: job.title,
          status,
          outstandingAmount,
          totalValue: jobTotalValue,
          dueDate: earliestDueDate,
          daysUntilDue,
          invoices: jobInvoices.map(inv => ({
            id: inv.id,
            number: inv.number,
            amount: inv.total || 0,
            total: inv.total || 0,
            status: inv.status,
            dueDate: inv.dueDate,
            issueDate: inv.issueDate,
            ...inv
          }))
        };
      });
      
      const sortedJobs = jobFinancialDetails.sort((a, b) => {
        const statusOrder = { 
          overdue: 0, 
          due_soon: 1, 
          pending: 2, 
          deposit_paid: 3, 
          partially_paid: 4, 
          fully_paid: 5,
          not_invoiced: 6
        } as const;
        const aOrder = statusOrder[a.status];
        const bOrder = statusOrder[b.status];
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        if (a.status === 'overdue' || a.status === 'due_soon') {
          if (a.daysUntilDue !== undefined && b.daysUntilDue !== undefined) {
            return a.daysUntilDue - b.daysUntilDue;
          }
        }
        
        return b.outstandingAmount - a.outstandingAmount;
      });
      
      const paidInvoices = invoicesData.filter(inv => inv.status === 'paid');
      let lastPaymentDate: string | undefined;
      if (paidInvoices.length > 0) {
        const latestPaid = paidInvoices
          .map(inv => new Date(inv.issueDate || inv.createdAt))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        lastPaymentDate = latestPaid.toISOString();
      }
      
      const summary: ClientFinancialSummary = {
        totalOutstanding,
        totalPaid,
        totalValue,
        jobCount: jobsData.length,
        activeJobsWithBalance: sortedJobs.filter(job => job.outstandingAmount > 0).length,
        lastPaymentDate,
        jobs: sortedJobs
      };
      
      setFinancialSummary(summary);
      
    } catch (error) {
      console.error('Error in financial summary calculation:', error);
      setFinancialSummary({
        totalOutstanding: 0,
        totalPaid: 0,
        totalValue: 0,
        jobCount: jobsData.length,
        activeJobsWithBalance: 0,
        jobs: []
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => `£${amount.toFixed(0)}`;
  
  const formatLastPayment = (dateString?: string) => {
    if (!dateString) return 'No payments yet';
    const date = new Date(dateString);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    if (daysAgo < 7) return `${daysAgo} days ago`;
    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
    return `${Math.floor(daysAgo / 30)} months ago`;
  };

  // Helper functions for job status display
  const getStatusColor = (status: 'overdue' | 'due_soon' | 'pending' | 'deposit_paid' | 'partially_paid' | 'fully_paid' | 'not_invoiced') => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'due_soon': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'deposit_paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'partially_paid': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'fully_paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'not_invoiced': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getStatusIcon = (status: 'overdue' | 'due_soon' | 'pending' | 'deposit_paid' | 'partially_paid' | 'fully_paid' | 'not_invoiced') => {
    switch (status) {
      case 'overdue': return '🚨';
      case 'due_soon': return '⏰';
      case 'pending': return '💰';
      case 'deposit_paid': return '📋';
      case 'partially_paid': return '⚡';
      case 'fully_paid': return '✅';
      case 'not_invoiced': return '📄';
      default: return '📄';
    }
  };
  
  const getStatusText = (status: 'overdue' | 'due_soon' | 'pending' | 'deposit_paid' | 'partially_paid' | 'fully_paid' | 'not_invoiced', daysUntilDue?: number) => {
    switch (status) {
      case 'overdue': return `OVERDUE ${daysUntilDue ? `(${Math.abs(daysUntilDue)} days)` : ''}`;
      case 'due_soon': return `DUE SOON ${daysUntilDue ? `(${daysUntilDue} days)` : ''}`;
      case 'pending': return 'AWAITING PAYMENT';
      case 'deposit_paid': return 'DEPOSIT PAID';
      case 'partially_paid': return 'PARTIALLY PAID';
      case 'fully_paid': return 'FULLY PAID';
      case 'not_invoiced': return 'NOT INVOICED';
      default: return 'UNKNOWN';
    }
  };

  // Helper function to determine if an invoice is actually paid based on payment records
  const getInvoicePaidStatus = (invoice: any, jobFinancial: JobFinancialDetail) => {
    // Use the outstanding amount calculation from financial summary
    // which already correctly uses payment records
    const jobOutstanding = jobFinancial.outstandingAmount || 0;
    const invoices = jobFinancial.invoices || [];
    const totalJobInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
    const totalJobPaid = totalJobInvoiced - jobOutstanding;
    
    console.log(`💰 Payment Status Check for Invoice ${invoice.number || invoice.id}:`, {
      invoiceAmount: invoice.total || invoice.amount || 0,
      invoiceStatus: invoice.status,
      jobOutstanding,
      totalJobInvoiced,
      totalJobPaid,
      jobTitle: jobFinancial.jobTitle
    });
    
    // Sort invoices by creation date to determine payment priority
    const sortedInvoices = [...invoices].sort((a, b) => 
      new Date(a.createdAt || a.created_at || 0).getTime() - 
      new Date(b.createdAt || b.created_at || 0).getTime()
    );
    
    // Calculate how much has been paid towards invoices before this one
    let priorInvoicesAmount = 0;
    for (const inv of sortedInvoices) {
      if (inv.id === invoice.id) break;
      priorInvoicesAmount += (inv.total || inv.amount || 0);
    }
    
    // This invoice is paid if there's enough payment to cover it after prior invoices
    const invoiceAmount = invoice.total || invoice.amount || 0;
    const remainingPaymentForThisInvoice = Math.max(0, totalJobPaid - priorInvoicesAmount);
    const isPaid = remainingPaymentForThisInvoice >= invoiceAmount;
    
    console.log(`✅ Payment Result:`, {
      priorInvoicesAmount,
      remainingPaymentForThisInvoice,
      isPaid,
      oldStatus: invoice.status
    });
    
    return isPaid;
  };

  const generateJobStatusIndicators = () => {
    if (!financialSummary) return [];
    
    const statusIndicators: any[] = [];
    
    financialSummary.jobs.forEach(jobFinancial => {
      const invoices = jobFinancial.invoices || [];
      const jobTitle = jobFinancial.jobTitle || 'Untitled Job';
      
      if (invoices.length === 0) return;
      
      // Find the actual full job object from the jobs array
      const fullJob = jobs.find(j => j.id === jobFinancial.jobId);
      if (!fullJob) {
        console.warn(`Job ${jobFinancial.jobId} not found in jobs array`);
        return;
      }
      
      // Create job object with client reference for navigation
      const jobWithClient = {
        ...fullJob,
        client: client,
        client_id: client.id,
        clientId: client.id,
        clientName: client.name
      };
      
      const depositInvoices: any[] = [];
      const remainingInvoices: any[] = [];
      const fullInvoices: any[] = [];
      
      invoices.forEach(inv => {
        let classified = false;
        
        if (inv.billType === 'full') {
          fullInvoices.push(inv);
          classified = true;
        } else if (invoices.length === 1 && 
                 (inv.total || inv.amount || 0) >= (jobFinancial.totalValue || 0) * 0.8 &&
                 inv.billType !== 'deposit' && 
                 inv.billType !== 'remaining') {
          fullInvoices.push(inv);
          classified = true;
        }
        
        if (!classified && (
          inv.billType === 'deposit' || 
          inv.type === 'deposit' ||
          inv.description?.toLowerCase().includes('deposit')
        )) {
          depositInvoices.push(inv);
          classified = true;
        }
        
        if (!classified && (
          inv.billType === 'remaining' ||
          inv.type === 'remaining' ||
          inv.description?.toLowerCase().includes('remaining') ||
          inv.description?.toLowerCase().includes('balance')
        )) {
          remainingInvoices.push(inv);
          classified = true;
        }
        
        if (!classified && invoices.length === 2) {
          const otherInvoice = invoices.find(other => other.id !== inv.id);
          if (otherInvoice) {
            const thisAmount = inv.total || inv.amount || 0;
            const otherAmount = otherInvoice.total || otherInvoice.amount || 0;
            if (thisAmount < otherAmount) {
              depositInvoices.push(inv);
              classified = true;
            } else {
              remainingInvoices.push(inv);
              classified = true;
            }
          }
        }
        
        if (!classified) {
          remainingInvoices.push(inv);
        }
      });
      
      if (fullInvoices.length > 0) {
        const unpaidFull = fullInvoices.filter(inv => !getInvoicePaidStatus(inv, jobFinancial));
        const paidFull = fullInvoices.filter(inv => getInvoicePaidStatus(inv, jobFinancial));
        
        if (unpaidFull.length > 0) {
          const overdueInvoice = unpaidFull.find(inv => {
            if (!inv.dueDate) return false;
            return new Date(inv.dueDate) < new Date();
          });
          
          if (overdueInvoice) {
            statusIndicators.push({
              type: 'job-overdue',
              text: `${jobTitle} - Full Invoice Overdue`,
              color: 'bg-red-600 hover:bg-red-700',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...overdueInvoice,
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          } else {
            statusIndicators.push({
              type: 'job-full-unpaid',
              text: `${jobTitle} - Full Invoice Sent`,
              color: 'bg-orange-500 hover:bg-orange-600',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...unpaidFull[0],
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          }
        } else if (paidFull.length > 0) {
          statusIndicators.push({
            type: 'job-fully-paid',
            text: `${jobTitle} - Fully Paid`,
            color: 'bg-green-600 hover:bg-green-700',
            jobTitle,
            onClick: () => {
              onNavigate('job-detail', jobWithClient);
            }
          });
        }
      } else if (depositInvoices.length > 0 || remainingInvoices.length > 0) {
        const unpaidDeposits = depositInvoices.filter(inv => !getInvoicePaidStatus(inv, jobFinancial));
        const paidDeposits = depositInvoices.filter(inv => getInvoicePaidStatus(inv, jobFinancial));
        const unpaidRemaining = remainingInvoices.filter(inv => !getInvoicePaidStatus(inv, jobFinancial));
        const paidRemaining = remainingInvoices.filter(inv => getInvoicePaidStatus(inv, jobFinancial));
        
        // Calculate total paid vs job value to determine if truly fully paid
        // Use the actual paid amount from financial summary (which uses payment records)
        const totalJobInvoiced = jobFinancial.invoices?.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0) || 0;
        const totalPaidAmount = totalJobInvoiced - (jobFinancial.outstandingAmount || 0);
        const jobValue = jobFinancial.totalValue || 0;
        
        // Job is only fully paid if total paid equals or exceeds job value
        if (totalPaidAmount >= jobValue && jobValue > 0 && unpaidDeposits.length === 0 && unpaidRemaining.length === 0) {
          statusIndicators.push({
            type: 'job-fully-paid',
            text: `${jobTitle} - Fully Paid`,
            color: 'bg-green-600 hover:bg-green-700',
            jobTitle,
            onClick: () => {
              onNavigate('job-detail', jobWithClient);
            }
          });
        } else if (paidDeposits.length > 0 && unpaidDeposits.length === 0 && remainingInvoices.length === 0) {
          // Deposit paid but remaining invoice not yet sent
          statusIndicators.push({
            type: 'job-deposit-paid',
            text: `${jobTitle} - Deposit Paid`,
            color: 'bg-blue-600 hover:bg-blue-700',
            jobTitle,
            onClick: () => {
              onNavigate('job-detail', jobWithClient);
            }
          });
        } else {
          const overdueDeposits = unpaidDeposits.filter(inv => {
            if (!inv.dueDate) return false;
            return new Date(inv.dueDate) < new Date();
          });
          
          if (overdueDeposits.length > 0) {
            statusIndicators.push({
              type: 'job-deposit-overdue',
              text: `${jobTitle} - Deposit Overdue`,
              color: 'bg-red-600 hover:bg-red-700',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...overdueDeposits[0],
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          }
          
          const overdueRemaining = unpaidRemaining.filter(inv => {
            if (!inv.dueDate) return false;
            return new Date(inv.dueDate) < new Date();
          });
          
          if (overdueRemaining.length > 0) {
            statusIndicators.push({
              type: 'job-remaining-overdue',
              text: `${jobTitle} - Balance Overdue`,
              color: 'bg-red-600 hover:bg-red-700',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...overdueRemaining[0],
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          }
          
          const nonOverdueDeposits = unpaidDeposits.filter(inv => {
            if (!inv.dueDate) return true;
            return new Date(inv.dueDate) >= new Date();
          });
          
          if (nonOverdueDeposits.length > 0) {
            statusIndicators.push({
              type: 'job-deposit-sent',
              text: `${jobTitle} - Deposit Sent`,
              color: 'bg-orange-500 hover:bg-orange-600',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...nonOverdueDeposits[0],
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          }
          
          const nonOverdueRemaining = unpaidRemaining.filter(inv => {
            if (!inv.dueDate) return true;
            return new Date(inv.dueDate) >= new Date();
          });
          
          if (nonOverdueRemaining.length > 0) {
            statusIndicators.push({
              type: 'job-remaining-sent',
              text: `${jobTitle} - Balance Sent`,
              color: 'bg-orange-500 hover:bg-orange-600',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...nonOverdueRemaining[0],
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          }
          
          if (paidDeposits.length > 0 && unpaidRemaining.length > 0) {
            statusIndicators.push({
              type: 'job-deposit-paid',
              text: `${jobTitle} - Deposit Paid`,
              color: 'bg-green-500 hover:bg-green-600',
              jobTitle,
              onClick: () => {
                const invoiceWithContext = {
                  ...paidDeposits[0],
                  job: jobWithClient,
                  client: client,
                  clientId: client.id
                };
                onNavigate('invoice-detail', invoiceWithContext);
              }
            });
          }
        }
      }
    });
    
    statusIndicators.sort((a, b) => {
      const priorityOrder = {
        'job-overdue': 1,
        'job-deposit-overdue': 2,
        'job-remaining-overdue': 3,
        'job-full-unpaid': 4,
        'job-deposit-sent': 5,
        'job-remaining-sent': 6,
        'job-deposit-paid': 7,
        'job-fully-paid': 8
      };
      
      const aPriority = priorityOrder[a.type] || 9;
      const bPriority = priorityOrder[b.type] || 9;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return (a.jobTitle || '').localeCompare(b.jobTitle || '');
    });
    
    return statusIndicators;
  };

  const handleJobClick = (job: any) => {
    // Ensure job has client reference for proper navigation
    const jobWithClient = {
      ...job,
      client: client,
      client_id: client.id,
      clientId: client.id,
      clientName: client.name
    };
    onNavigate('job-detail', jobWithClient);
  };

  const handleNewJob = () => {
    onNavigate('new-job', client);
  };

  const handleNewQuote = () => {
    onNavigate('quote-builder', { client });
  };

  const handleQuoteClick = (quote: any) => {
    onNavigate('quote-detail', quote);
  };

  const handleConvertQuote = async (quote: any) => {
    try {
      const newJob = await api.convertQuoteToJob(quote.id);
      if (newJob) {
        await loadClientData();
        onNavigate('job-detail', newJob);
      }
    } catch (error) {
      console.error('Failed to convert quote:', error);
    }
  };

  const handleWhatsApp = () => {
    if (client.phone) {
      let formattedPhone;
      if (client.phone.startsWith('+') || client.phone.match(/^\d{10,15}$/)) {
        formattedPhone = client.phone.replace(/^\+/, '').replace(/[^\d]/g, '');
      } else {
        formattedPhone = formatPhoneForWhatsApp(client.phone, '+44');
      }
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
  };

  const handleCall = () => {
    if (client.phone) {
      window.open(`tel:${client.phone}`, '_self');
    }
  };

  const handleNavigate = () => {
    if (client.address) {
      const encodedAddress = encodeURIComponent(client.address);
      window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
    }
  };

  const handleEditClient = () => {
    onNavigate('edit-client', client);
  };

  const handleSmartPaymentRecording = () => {
    if (!financialSummary) return;
    
    const unpaidInvoices = financialSummary.jobs
      .flatMap(job => job.invoices)
      .filter(invoice => invoice.status !== 'paid');
    
    if (unpaidInvoices.length === 0) {
      toast.info("All invoices are already paid!");
      return;
    }
    
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const oldestOverdue = unpaidInvoices
      .filter(inv => {
        if (!inv.dueDate) return false;
        return new Date(inv.dueDate) < new Date();
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];
    
    setPaymentState({
      isOpen: true,
      selectedInvoices: oldestOverdue ? [oldestOverdue.id] : [],
      paymentAmount: oldestOverdue ? oldestOverdue.amount.toString() : totalOutstanding.toString(),
      paymentMethod: 'bank',
      reference: ''
    });
    setShowPaymentDialog(true);
  };

  const handlePaymentAmountChange = (amount: string) => {
    setPaymentState(prev => ({ ...prev, paymentAmount: amount }));
  };

  const handleInvoiceSelection = (invoiceId: string, checked: boolean) => {
    setPaymentState(prev => ({
      ...prev,
      selectedInvoices: checked 
        ? [...prev.selectedInvoices, invoiceId]
        : prev.selectedInvoices.filter(id => id !== invoiceId)
    }));
  };

  const handleRecordPayment = async () => {
    try {
      const amount = parseFloat(paymentState.paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid payment amount");
        return;
      }

      if (paymentState.selectedInvoices.length === 0) {
        toast.error("Please select at least one invoice to apply payment to");
        return;
      }

      const selectedInvoices = financialSummary?.jobs.flatMap(job => job.invoices)
        .filter(invoice => paymentState.selectedInvoices.includes(invoice.id)) || [];

      if (selectedInvoices.length === 0) {
        toast.error("Selected invoices not found");
        return;
      }

      let paymentsToRecord = [];
      
      if (selectedInvoices.length === 1) {
        paymentsToRecord = [{
          invoiceId: selectedInvoices[0].id,
          amount: amount,
          method: paymentState.paymentMethod,
          reference: paymentState.reference,
          date: new Date().toISOString()
        }];
      } else {
        const totalInvoiceAmount = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        paymentsToRecord = selectedInvoices.map(invoice => ({
          invoiceId: invoice.id,
          amount: Math.round((invoice.amount / totalInvoiceAmount) * amount * 100) / 100,
          method: paymentState.paymentMethod,
          reference: paymentState.reference || `Payment for ${invoice.number}`,
          date: new Date().toISOString()
        }));
      }

      for (const paymentData of paymentsToRecord) {
        const result = await api.recordPayment(paymentData);
        if (!result) {
          throw new Error(`Failed to record payment for invoice ${paymentData.invoiceId}`);
        }
      }

      toast.success("Payment recorded successfully!");
      setShowPaymentDialog(false);
      setPaymentState({
        isOpen: false,
        selectedInvoices: [],
        paymentAmount: '',
        paymentMethod: 'bank',
        reference: ''
      });
      
      await loadClientData();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error("Failed to record payment");
    }
  };

  const handleDeleteClient = async () => {
    try {
      setDeleting(true);
      setShowDeleteDialog(false);
      
      const result = await api.deleteClient(client.id);
      
      if (result.success) {
        toast.success("Client deleted successfully");
        onNavigate("clients");
      } else {
        toast.error(result.message || "Failed to delete client");
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error("Failed to delete client");
    } finally {
      setDeleting(false);
    }
  };

  // Show loading state while fetching client data
  if (clientLoading) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
              style={{
                width: 'clamp(44px, 10.5vw, 48px)',
                height: 'clamp(44px, 10.5vw, 48px)'
              }}
            >
              <ArrowLeft style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }} className="text-gray-600" />
            </button>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Loading Client...</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="trades-body text-gray-600">Loading client data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if client couldn't be loaded
  if (!client || !client.id || !client.name) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Client Not Found</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="trades-body text-gray-600 mb-4">{error || 'Client data not available.'}</p>
            <button
              onClick={() => onNavigate('clients')}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  // At this point, client is guaranteed to have id and name
  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      <div className="header bg-white p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 trades-caption text-gray-600 mb-1">
              <span>Clients</span>
              <span>/</span>
              <span>{client.name}</span>
            </div>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>{client.name}</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto pb-40">
        {error ? (
          <div className="p-4">
            <div className="bg-white rounded-xl p-6 border border-red-200 mb-6 text-center">
              <h3 className="trades-h2 mb-3 text-red-600">Client Not Available</h3>
              <p className="trades-body mb-4 text-gray-600">{error}</p>
              <button
                onClick={() => onNavigate('clients')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg trades-body hover:bg-blue-700 transition-colors"
              >
                Back to Clients
              </button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="p-4 pb-0">
              <div className="bg-white rounded-xl p-3 border border-gray-200 mb-2">
                <h2 className="trades-h2 mb-3" style={{ color: 'var(--ink)' }}>Contact Information</h2>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-gray-400" />
                    <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>{client.name}</span>
                  </div>

                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400" />
                      <span className="trades-body" style={{ color: 'var(--ink)' }}>{client.phone}</span>
                    </div>
                  )}
                  
                  {client.address && (
                    <div className="flex items-center gap-3">
                      <Navigation size={16} className="text-gray-400" />
                      <span className="trades-body" style={{ color: 'var(--ink)' }}>{client.address}</span>
                    </div>
                  )}

                  {client.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-gray-400" />
                      <span className="trades-body" style={{ color: 'var(--ink)' }}>{client.email}</span>
                    </div>
                  )}

                  {client.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="trades-body" style={{ color: 'var(--muted)' }}>{client.notes}</p>
                    </div>
                  )}
                </div>

                {/* Multi-user attribution (Phase 4b) */}
                <AttributionDisplay
                  createdByName={client.created_by_name}
                  createdAt={client.created_at}
                  updatedByName={client.updated_by_name}
                  updatedAt={client.updated_at}
                  className="mb-3 pb-3 border-b border-gray-100"
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleWhatsApp}
                    className="flex flex-col items-center justify-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <WhatsAppIcon size={18} />
                    <span className="trades-caption text-[11px]">WhatsApp</span>
                  </button>

                  <button
                    onClick={handleCall}
                    className="flex flex-col items-center justify-center gap-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Phone size={18} />
                    <span className="trades-caption text-[11px]">Call</span>
                  </button>

                  <button
                    onClick={handleNavigate}
                    className="flex flex-col items-center justify-center gap-1 bg-orange-50 text-orange-700 px-3 py-2 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <MapPin size={18} />
                    <span className="trades-caption text-[11px]">Navigate</span>
                  </button>
                </div>
              </div>

              <TabsList className="w-full h-12 bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex mb-2">
                <TabsTrigger 
                  value="overview" 
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all border-0 trades-label font-medium"
                >
                  <User size={15} />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="work" 
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all border-0 trades-label font-medium"
                >
                  <TrendingUp size={15} />
                  Jobs & Quotes
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all border-0 trades-label font-medium"
                >
                  <SettingsIcon size={15} />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="px-4 m-0">
                {financialSummary && (
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 mb-4 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <TrendingUp size={20} />
                      </div>
                      <h3 className="trades-h2">Financial Overview</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="trades-h1 mb-1">{formatCurrency(financialSummary.totalOutstanding)}</div>
                        <div className="trades-caption opacity-90">Outstanding</div>
                      </div>
                      <div className="text-center">
                        <div className="trades-h1 mb-1">{formatCurrency(financialSummary.totalPaid)}</div>
                        <div className="trades-caption opacity-90">Paid to Date</div>
                      </div>
                      <div className="text-center">
                        <div className="trades-h1 mb-1">{formatCurrency(financialSummary.totalValue)}</div>
                        <div className="trades-caption opacity-90">Contract Value</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/20">
                      <div>
                        <div className="trades-body">Across {financialSummary.jobCount} job{financialSummary.jobCount !== 1 ? 's' : ''}</div>
                        <div className="trades-caption opacity-75">
                          {financialSummary.activeJobsWithBalance} with outstanding payments
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="trades-caption opacity-75">Last Payment</div>
                        <div className="trades-body">{formatLastPayment(financialSummary.lastPaymentDate)}</div>
                      </div>
                    </div>
                    
                    {(() => {
                      const statusIndicators = generateJobStatusIndicators();
                      
                      if (statusIndicators.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                            </div>
                            <h4 className="trades-label font-medium text-gray-700">
                              Job Status ({statusIndicators.length})
                            </h4>
                          </div>
                          
                          <div className="space-y-2">
                            {statusIndicators.map((indicator, index) => (
                              <button
                                key={`${indicator.type}-${indicator.jobTitle}-${index}`}
                                onClick={indicator.onClick}
                                className={`w-full flex items-center justify-between ${indicator.color} text-white px-4 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02]`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-white rounded-full opacity-90"></div>
                                  <span className="trades-label font-medium text-left">
                                    {indicator.text}
                                  </span>
                                </div>
                                <ChevronRight size={16} className="opacity-75" />
                              </button>
                            ))}
                          </div>
                          
                          {statusIndicators.length > 2 && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="trades-caption text-gray-600 text-center">
                                Tap any job status to view details or record payments
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={() => onNavigate('invoice-list', { client, clientId: client.id, clientName: client.name })}
                        className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2 min-w-[200px]"
                        variant="outline"
                        style={{
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                        }}
                      >
                        <Receipt size={18} />
                        View All Invoices
                      </Button>
                    </div>
                  </div>
                )}

                {financialSummary && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp size={16} className="text-blue-600" />
                        </div>
                        <h4 className="trades-label font-medium">Active Jobs</h4>
                      </div>
                      <div className="trades-h1 mb-1">{financialSummary.jobCount}</div>
                      <div className="trades-caption text-gray-600">
                        {financialSummary.activeJobsWithBalance} with outstanding payments
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle size={16} className="text-green-600" />
                        </div>
                        <h4 className="trades-label font-medium">Active Quotes</h4>
                      </div>
                      <div className="trades-h1 mb-1">{quotes.length}</div>
                      <div className="trades-caption text-gray-600">
                        Pending approval
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="work" className="px-4 m-0">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="trades-body text-gray-600">Loading jobs and quotes...</p>
                  </div>
                ) : (
                  <>
                    {/* Priority Jobs - Needs Attention */}
                    {financialSummary && financialSummary.jobs.filter(job => job.outstandingAmount > 0).length > 0 && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle size={12} className="text-red-600" />
                          </div>
                          <h3 className="trades-h2" style={{ color: 'var(--ink)' }}>Jobs Needing Attention</h3>
                        </div>
                        
                        <div className="space-y-3">
                          {financialSummary.jobs
                            .filter(job => job.outstandingAmount > 0)
                            .slice(0, 3)
                            .map((job) => {
                              const jobData = jobs.find(j => j.id === job.jobId);
                              if (!jobData) return null;
                              
                              return (
                                <div
                                  key={job.jobId}
                                  onClick={() => handleJobClick(jobData)}
                                  className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>
                                        {job.jobTitle}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                                          {getStatusIcon(job.status)}
                                          {getStatusText(job.status, job.daysUntilDue)}
                                        </Badge>
                                        <span className="trades-caption text-gray-600">
                                          Outstanding: {formatCurrency(job.outstandingAmount)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="ml-2">
                                      <span className="text-gray-400">→</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* All Jobs Section */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <TrendingUp size={12} className="text-blue-600" />
                          </div>
                          <h3 className="trades-h2" style={{ color: 'var(--ink)' }}>All Jobs ({jobs.length})</h3>
                        </div>
                        <Button 
                          onClick={() => onNavigate('job-list', { clientId: client.id, clientName: client.name })} 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                        >
                          <Eye size={16} />
                          View All
                        </Button>
                      </div>
                      
                      {jobs.length === 0 ? (
                        <div className="text-center py-8">
                          <EmptyStateIllustration size="medium" />
                          <h3 className="trades-label font-medium mb-2">No jobs yet</h3>
                          <p className="trades-caption text-gray-600">Use the "New Job" button below to create your first job for this client</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {jobs.slice(0, 3).map((job) => {
                            // Try to find financial summary data for this job
                            const financialJob = financialSummary?.jobs.find(fj => fj.jobId === job.id);
                            
                            return (
                              <div
                                key={job.id}
                                onClick={() => handleJobClick(job)}
                                className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>
                                      {job.title}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      {financialJob ? (
                                        // Show payment status for jobs with invoices
                                        <Badge className={`text-xs ${getStatusColor(financialJob.status)}`}>
                                          {getStatusIcon(financialJob.status)}
                                          {getStatusText(financialJob.status)}
                                        </Badge>
                                      ) : (
                                        // Show job status for jobs without invoices
                                        <StatusBadge status={job.status} />
                                      )}
                                      <span className="trades-caption text-gray-600">
                                        {financialJob ? formatCurrency(financialJob.totalValue) : formatCurrency(job.estimatedValue || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    <span className="text-gray-400">→</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {jobs.length > 3 && (
                            <button
                              onClick={() => onNavigate('job-list', { clientId: client.id })}
                              className="w-full p-2 text-center text-blue-600 hover:text-blue-700 trades-caption transition-colors"
                            >
                              Show {jobs.length - 3} more jobs
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quotes Section */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                            <Quote size={12} className="text-green-600" />
                          </div>
                          <h3 className="trades-h2" style={{ color: 'var(--ink)' }}>Active Quotes ({quotes.length})</h3>
                        </div>
                        {quotes.length > 0 && (
                          <Button 
                            onClick={() => onNavigate('quotes', { clientId: client.id })} 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                          >
                            <Eye size={16} />
                            View All
                          </Button>
                        )}
                      </div>
                      
                      {quotes.length === 0 ? (
                        <div className="text-center py-8">
                          <EmptyStateIllustration size="medium" />
                          <h3 className="trades-label font-medium mb-2">No quotes yet</h3>
                          <p className="trades-caption text-gray-600">Use the "New Quote" button below to create your first quote for this client</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {quotes.slice(0, 3).map((quote) => (
                            <div
                              key={quote.id}
                              onClick={() => handleQuoteClick(quote)}
                              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>
                                    {quote.title}
                                  </h4>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <QuoteStatusBadge status={quote.status} />
                                      <span className="trades-caption text-gray-600">
                                        {formatCurrency(quote.total || 0)}
                                      </span>
                                    </div>
                                    {quote.status === 'approved' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleConvertQuote(quote);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 hover:border-blue-300 transition-all trades-caption font-medium"
                                      >
                                        <Plus size={14} />
                                        Convert
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-2">
                                  <span className="text-gray-400">→</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {quotes.length > 3 && (
                            <button
                              onClick={() => onNavigate('quotes', { clientId: client.id })}
                              className="w-full p-2 text-center text-blue-600 hover:text-blue-700 trades-caption transition-colors"
                            >
                              Show {quotes.length - 3} more quotes
                            </button>
                          )}
                        </div>
                      )}
                    </div>


                  </>
                )}
              </TabsContent>

              <TabsContent value="settings" className="px-4 m-0">
                <div className="space-y-4">
                  {/* Client Actions */}
                  <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h3 className="trades-h2 mb-4" style={{ color: 'var(--ink)' }}>Client Actions</h3>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={handleEditClient}
                        variant="outline" 
                        className="w-full justify-start gap-3 h-12"
                      >
                        <Edit size={16} />
                        <div className="text-left">
                          <div className="trades-label">Edit Client Details</div>
                          <div className="trades-caption text-gray-500">Update contact information and notes</div>
                        </div>
                      </Button>
                      
                      <Button 
                        onClick={() => onNavigate('export-data', client)}
                        variant="outline" 
                        className="w-full justify-start gap-3 h-12"
                      >
                        <Receipt size={16} />
                        <div className="text-left">
                          <div className="trades-label">Export Data</div>
                          <div className="trades-caption text-gray-500">Download all invoices and documents</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="trades-h2 mb-4 text-red-800">Danger Zone</h3>
                    
                    <Button 
                      onClick={() => setShowDeleteDialog(true)}
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      <div className="text-left">
                        <div className="trades-label">Delete Client</div>
                        <div className="trades-caption text-red-500">Permanently remove all data (irreversible)</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </TabsContent>
          </Tabs>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {client.name}? This action cannot be undone and will also delete all associated jobs, quotes, and invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Client'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Buttons - Show on Overview and Work Tabs */}
      {(activeTab === 'overview' || activeTab === 'work') && (
        <div className="fixed bottom-20 inset-x-0 z-50">
          <div className="max-w-[390px] mx-auto px-4">
            <div className="flex gap-3">
              {/* New Job Button - Responsive sizing */}
              <button
                onClick={handleNewJob}
                className="flex-1 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                style={{
                  height: 'clamp(52px, 12vw, 56px)',
                  minWidth: 'clamp(140px, 32vw, 160px)'
                }}
              >
                <Plus style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }} />
                <span className="trades-body font-medium text-[16px]">New Job</span>
              </button>
              
              {/* New Quote Button - Responsive sizing */}
              <button
                onClick={handleNewQuote}
                className="flex-1 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                style={{
                  height: 'clamp(52px, 12vw, 56px)',
                  minWidth: 'clamp(140px, 32vw, 160px)'
                }}
              >
                <Quote style={{ width: 'clamp(20px, 5vw, 24px)', height: 'clamp(20px, 5vw, 24px)' }} />
                <span className="trades-body font-medium text-[16px]">New Quote</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}