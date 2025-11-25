import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Phone, 
  MapPin, 
  FileText, 
  Receipt, 
  Calendar, 
  ClipboardList, 
  Trash2, 
  Plus,
  CheckCircle,
  TrendingUp,
  Clock,
  CreditCard,
  DollarSign,
  Package
} from "lucide-react";
import { StatusBadge } from "../trades-ui/status-badge";
import { WhatsAppIcon } from "../ui/whatsapp-icon";
import { api } from "../../utils/api";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../utils/auth-context";
import { AttributionDisplay } from "../ui/attribution-display";
import { useAppStore } from "../../hooks/useAppStore";

interface JobDetailProps {
  job: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function JobDetail({ job, onNavigate, onBack }: JobDetailProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(job?.client || null);
  const [originalQuote, setOriginalQuote] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentJob, setCurrentJob] = useState<any>(job); // Track the freshly loaded job data

  // Watch for refresh trigger from app store
  const { jobDetailRefreshKey } = useAppStore();

  // Load job data when user logs in, job changes, or refresh is triggered
  useEffect(() => {
    if (user && job?.id) {
      console.log('💼 Job Detail: Loading data (user authenticated, job:', job.title, ')');
      loadJobData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, jobDetailRefreshKey, user]);

  // Add focus listener to refresh data when user returns to this page
  useEffect(() => {
    const handleFocus = () => {
      // Refresh job data when page regains focus (user returns from invoice detail)
      if (job?.id && !loading) {
        console.log('🔄 Page focus detected, refreshing job data...');
        loadJobData();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, loading]);

  const loadJobData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading job data for job:', job.id);
      
      // Load current job
      const loadedJob = await api.getJob(job.id);
      if (!loadedJob) {
        setError('This job no longer exists.');
        setLoading(false);
        return;
      }
      
      // Update current job state with fresh data from API
      setCurrentJob(loadedJob);
      console.log('✅ Current job updated with fresh data:', {
        id: loadedJob.id,
        title: loadedJob.title,
        hasVatEnabled: loadedJob.vatEnabled !== undefined,
        vatEnabled: loadedJob.vatEnabled,
        vatRate: loadedJob.vatRate,
        estimatedValue: loadedJob.estimatedValue
      });
      
      // Load client data
      if (loadedJob.clientId || job.clientId) {
        try {
          const client = await api.getClient(loadedJob.clientId || job.clientId);
          if (client) {
            console.log('✅ Client data loaded:', client.name);
            setClientData(client);
          }
        } catch (clientError) {
          console.error('❌ Failed to load client data:', clientError);
        }
      }

      // Load original quote if job was converted from a quote
      if (loadedJob.originalQuoteId || job.originalQuoteId || loadedJob.quoteId || job.quoteId) {
        try {
          const quoteId = loadedJob.originalQuoteId || job.originalQuoteId || loadedJob.quoteId || job.quoteId;
          console.log('🔄 Loading original quote for quoteId:', quoteId);
          
          // Validate quote ID before making API call
          if (!quoteId || typeof quoteId !== 'string' || quoteId.trim() === '') {
            console.warn('⚠️ Invalid quote ID format in job-detail:', { 
              quoteId, 
              type: typeof quoteId,
              jobId: loadedJob.id || job.id 
            });
            return; // Skip quote loading
          }
          
          const quote = await api.getQuote(quoteId);
          if (quote) {
            console.log('✅ Original quote loaded:', quote.number);
            setOriginalQuote(quote);
          }
        } catch (quoteError: any) {
          const errorStatus = quoteError?.status || quoteError?.response?.status;
          
          if (errorStatus === 404) {
            console.warn('⚠️ Quote not found (404) in job-detail - quote may have been deleted:', {
              quoteId: loadedJob.originalQuoteId || job.originalQuoteId || loadedJob.quoteId || job.quoteId,
              jobId: loadedJob.id || job.id
            });
          } else {
            console.error('❌ Failed to load original quote in job-detail:', {
              error: quoteError?.message || 'Unknown error',
              status: errorStatus,
              quoteId: loadedJob.originalQuoteId || job.originalQuoteId || loadedJob.quoteId || job.quoteId
            });
          }
        }
      }
      
      // Load activity data
      const [allInvoices, allPayments, allBookings] = await Promise.all([
        api.getInvoices(),
        api.getPayments(),
        api.getBookings()
      ]);
      
      // Filter data for this specific job
      const jobInvoices = allInvoices.filter((invoice: any) => invoice.jobId === job.id);
      const jobBookings = allBookings.filter((booking: any) => booking.jobId === job.id);
      
      // Get payments for job invoices
      const jobInvoiceIds = jobInvoices.map((invoice: any) => invoice.id);
      const jobPayments = allPayments.filter((payment: any) => 
        jobInvoiceIds.includes(payment.invoiceId)
      );
      
      console.log('🎯 Filtered data for job:', {
        jobInvoices: jobInvoices?.length || 0,
        jobPayments: jobPayments?.length || 0,
        jobBookings: jobBookings?.length || 0
      });
      
      setInvoices(jobInvoices || []);
      setPayments(jobPayments || []);
      setBookings(jobBookings || []);
    } catch (err) {
      console.error('❌ Failed to load job data:', err);
      setError('Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
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
  };

  // Calculate financial metrics
  const totalInvoiced = invoices.reduce((sum: number, invoice: any) => sum + (invoice.total || 0), 0);
  
  // Calculate total paid from actual payment records (most accurate)
  const totalPaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  
  // IMPORTANT: For jobs created directly (without quote), use job.total (includes VAT)
  // For jobs from quotes, use quote total. estimatedValue is now subtotal (before VAT)
  // Use currentJob for most recent data, fallback to job prop
  const activeJob = currentJob || job;
  const jobValue = originalQuote?.total || activeJob?.total || activeJob?.value || activeJob?.estimatedValue || 0;
  
  // Calculate outstanding amount accounting for partial payments on each invoice
  const outstanding = invoices
    .filter((invoice: any) => invoice.status !== 'paid')
    .reduce((sum: number, invoice: any) => {
      const invoiceTotal = invoice.total || 0;
      const amountPaid = invoice.amountPaid || 0;
      return sum + Math.max(0, invoiceTotal - amountPaid);
    }, 0);
  const remainingToInvoice = Math.max(0, jobValue - totalInvoiced); // Amount of job work not yet invoiced
  
  // Calculate progress percentages for visual indicators
  const invoicedPercentage = jobValue > 0 ? (totalInvoiced / jobValue) * 100 : 0;
  const paidPercentage = jobValue > 0 ? (totalPaid / jobValue) * 100 : 0;

  // Action handlers
  const handleWhatsApp = () => {
    if (clientData?.phone && job?.title) {
      const message = `Hi ${clientData.name}, regarding your ${job.title} job...`;
      window.open(`https://wa.me/${clientData.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleCall = () => {
    if (clientData?.phone) {
      window.open(`tel:${clientData.phone}`, '_self');
    }
  };

  const handleNavigate = () => {
    const address = job?.address || clientData?.address;
    if (address) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const handleDeleteJob = async () => {
    if (!job?.id) return;
    
    try {
      setLoading(true);
      const result = await api.deleteJob(job.id);
      
      if (result.success) {
        toast.success('Job deleted successfully!');
        
        // Clear navigation history to prevent returning to deleted item
        const { useAppStore } = await import('../../hooks/useAppStore');
        useAppStore.getState().clearNavigationHistory();
        
        // Force refresh dashboard
        useAppStore.getState().refreshDashboard();
        
        onBack(); // Navigate back to previous screen
      } else {
        toast.error(result.message || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
      toast.error('Failed to delete job');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Generate timeline activities
  const getTimelineActivities = () => {
    const activities: any[] = [];
    
    invoices.forEach(invoice => {
      // Use invoice number instead of confusing ID strings
      const invoiceNumber = invoice.number || invoice.invoiceNumber || 'DRAFT';
      
      // Determine invoice type for better display
      let invoiceTypeLabel = '';
      // Enhanced invoice type detection with multiple fallbacks
      if (invoice.billType) {
        const typeLabels = {
          deposit: 'Deposit',
          remaining: 'Remaining Balance',
          selected: 'Partial',
          custom: ''
        };
        invoiceTypeLabel = typeLabels[invoice.billType] || '';
      } else if (invoice.isDepositInvoice === true) {
        // Explicit deposit flag
        invoiceTypeLabel = 'Deposit';
      } else if (invoice.type === 'deposit') {
        // Type field fallback
        invoiceTypeLabel = 'Deposit';
      } else {
        // Try to infer from invoice data using comprehensive text analysis
        const searchText = `${invoice.notes || ''} ${invoice.description || ''} ${invoice.paymentTerms || ''} ${invoiceNumber}`.toLowerCase();
        
        if (searchText.includes('deposit')) {
          invoiceTypeLabel = 'Deposit';
        } else if (searchText.includes('remaining') || searchText.includes('balance')) {
          invoiceTypeLabel = 'Remaining Balance';
        } else {
          // Smart detection: If this is a smaller invoice compared to others for the same job
          const jobInvoices = invoices.filter(inv => inv.jobId === invoice.jobId);
          if (jobInvoices.length >= 2) {
            const invoiceAmount = invoice.total || 0;
            const otherAmounts = jobInvoices
              .filter(inv => inv.id !== invoice.id)
              .map(inv => inv.total || 0);
            
            const isSmallest = otherAmounts.every(amount => invoiceAmount < amount);
            if (isSmallest && invoiceAmount > 0) {
              invoiceTypeLabel = 'Deposit';
            } else if (otherAmounts.some(amount => amount < invoiceAmount)) {
              invoiceTypeLabel = 'Remaining Balance';
            }
          }
        }
      }
      
      const title = invoiceTypeLabel 
        ? `${invoiceTypeLabel} Invoice ${invoiceNumber}`
        : `Invoice ${invoiceNumber}`;
      
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        icon: FileText,
        title,
        description: `Invoice created`,
        date: invoice.createdAt,
        amount: invoice.total,
        status: invoice.status,
        data: invoice
      });
    });

    payments.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        icon: Receipt,
        title: 'Payment received',
        description: `${payment.method} payment`,
        date: payment.createdAt,
        amount: payment.amount,
        data: payment
      });
    });

    bookings.forEach(booking => {
      activities.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        icon: Calendar,
        title: booking.title || 'Appointment',
        description: `Scheduled for ${formatDate(booking.scheduledDate)}`,
        date: booking.createdAt,
        data: booking
      });
    });

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const timelineActivities = getTimelineActivities();

  // Auto-complete job when fully paid (if not already completed)
  useEffect(() => {
    // Safety check: ensure job exists before accessing properties
    if (!job || loading || job.status === 'completed' || !job.id) {
      return;
    }

    const autoCompleteJob = async () => {
      // FIXED: Job should only be completed when total paid equals full job value
      // Get the actual job total value
      const jobTotalValue = activeJob.estimatedValue || activeJob.value || activeJob.total || 0;
      
      // Calculate total amount actually paid
      const totalPaid = totalInvoiced - outstanding;
      
      // Job is only complete when the full job value has been paid
      const isJobFullyPaid = totalPaid >= jobTotalValue && jobTotalValue > 0;
      
      console.log('🔍 Job completion check:', {
        jobTotalValue,
        totalInvoiced,
        outstanding,
        totalPaid,
        isJobFullyPaid,
        allInvoicesPaid: outstanding === 0,
        jobStatus: activeJob.status
      });
      
      if (isJobFullyPaid && activeJob.status !== 'completed') {
        try {
          console.log('🎯 Auto-completing job - full job value has been paid');
          await api.updateJob(activeJob.id, { ...activeJob, status: 'completed' });
          toast.success('Job completed - full payment received!');
          // Update local state to prevent re-triggering
          setCurrentJob({ ...activeJob, status: 'completed' });
          // Refresh data after a short delay
          setTimeout(() => loadJobData(), 1000);
        } catch (error) {
          console.error('Failed to auto-complete job:', error);
        }
      }
    };

    // Only run auto-completion if conditions are met
    if (outstanding === 0 && totalInvoiced > 0 && activeJob?.status !== 'completed') {
      autoCompleteJob();
    }
  }, [outstanding, totalInvoiced, activeJob?.status, loading, activeJob?.id]);

  const handleManualCompleteJob = async () => {
    if (!activeJob || activeJob.status === 'completed' || loading) return;
    
    try {
      console.log('👤 Manually completing job', activeJob.id);
      setLoading(true);
      
      const updatedJob = { ...activeJob, status: 'completed' };
      await api.updateJob(activeJob.id, updatedJob);
      
      toast.success('Job marked as completed!');
      
      // Update job data immediately to prevent button flickering
      setCurrentJob({ ...activeJob, status: 'completed' });
      
      // Then refresh full data
      await loadJobData();
    } catch (error) {
      console.error('Failed to complete job:', error);
      toast.error('Failed to mark job as completed');
    } finally {
      setLoading(false);
    }
  };

  // Show error state if there's an error
  if (error) {
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
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Error</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="trades-body text-red-600 mb-4">{error}</p>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
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
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Job Not Found</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="trades-body text-gray-600">Job data not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Job Details</h1>
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                {job.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-4 space-y-6">
          
          {/* Job & Client Info */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            {/* Job Title */}
            <h1 className="trades-h1 text-gray-900 mb-4">
              {job.title}
            </h1>
            
            {/* Client Info */}
            <div className="mb-4">
              <p className="trades-body text-gray-900 font-medium mb-1">
                {clientData?.name || 'Unknown Client'}
              </p>
              {(job.address || clientData?.address) && (
                <p className="trades-caption text-gray-600">
                  {job.address || clientData?.address}
                </p>
              )}
            </div>

            {/* Multi-user attribution (Phase 4b) */}
            <AttributionDisplay
              createdByName={currentJob?.created_by_name}
              createdAt={currentJob?.created_at}
              updatedByName={currentJob?.updated_by_name}
              updatedAt={currentJob?.updated_at}
              className="mb-4 pb-4 border-b border-gray-100"
            />
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleWhatsApp}
                disabled={!clientData?.phone}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 px-3 py-2.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <WhatsAppIcon size={14} color="#15803d" />
                <span className="trades-caption">WhatsApp</span>
              </button>
              
              <button
                onClick={handleCall}
                disabled={!clientData?.phone}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone size={14} />
                <span className="trades-caption">Call</span>
              </button>
              
              <button
                onClick={handleNavigate}
                disabled={!job.address && !clientData?.address}
                className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-2.5 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapPin size={14} />
                <span className="trades-caption">Navigate</span>
              </button>
            </div>
          </div>

          {/* Job Items */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="trades-h2 text-gray-900">Job Items</h2>
              {originalQuote && (
                <span className="trades-caption text-gray-500">
                  From Quote {originalQuote.number}
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="trades-caption text-gray-600">Loading job items...</p>
              </div>
            ) : originalQuote?.lineItems?.length > 0 ? (
              <div className="space-y-3">
                {originalQuote.lineItems.map((item: any, index: number) => (
                  <div key={item.id || index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="trades-body text-gray-900 mb-1">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="trades-caption text-gray-600">
                          Qty: {item.qty || item.quantity || 1}
                        </span>
                        <span className="trades-caption text-gray-600">
                          @ {formatCurrency(item.price || item.rate || 0)}
                        </span>
                        {item.type && (
                          <span className="trades-caption text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {item.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="trades-body text-gray-900 font-medium">
                        {formatCurrency(item.total || item.amount || ((item.qty || 1) * (item.price || 0)))}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Subtotal, VAT & Total Breakdown */}
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="trades-body text-gray-600">Subtotal</span>
                    <span className="trades-body text-gray-900">
                      {formatCurrency(originalQuote?.subtotal || 0)}
                    </span>
                  </div>
                  
                  {/* VAT (if applicable) */}
                  {originalQuote?.vatEnabled && (
                    <div className="flex justify-between items-center">
                      <span className="trades-body text-gray-600">
                        VAT ({originalQuote.vatRate || 20}%)
                      </span>
                      <span className="trades-body text-gray-900">
                        {formatCurrency(originalQuote?.vatAmount || 0)}
                      </span>
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="trades-body text-gray-900 font-medium">Total Job Value</span>
                    <span className="trades-h2 text-gray-900">
                      {formatCurrency(jobValue)}
                    </span>
                  </div>
                </div>
              </div>
            ) : job?.materials?.length > 0 || job?.labour?.length > 0 ? (
              <div className="space-y-3">
                {/* Show materials and labour from job data if no quote items */}
                {job.materials?.map((item: any, index: number) => (
                  <div key={`material-${index}`} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="trades-body text-gray-900 mb-1">
                        {item.name || item.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="trades-caption text-gray-600">
                          Qty: {item.quantity || item.qty || 1}
                        </span>
                        <span className="trades-caption text-gray-600">
                          @ {formatCurrency(item.rate || item.price || 0)}
                        </span>
                        <span className="trades-caption text-gray-500 bg-blue-100 px-2 py-1 rounded">
                          Material
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="trades-body text-gray-900 font-medium">
                        {formatCurrency(item.total || ((item.quantity || item.qty || 1) * (item.rate || item.price || 0)))}
                      </p>
                    </div>
                  </div>
                ))}
                
                {job.labour?.map((item: any, index: number) => (
                  <div key={`labour-${index}`} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="trades-body text-gray-900 mb-1">
                        {item.name || item.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="trades-caption text-gray-600">
                          Hours: {item.hours || item.qty || 1}
                        </span>
                        <span className="trades-caption text-gray-600">
                          @ {formatCurrency(item.rate || item.price || 0)}/hr
                        </span>
                        <span className="trades-caption text-gray-500 bg-green-100 px-2 py-1 rounded">
                          Labour
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="trades-body text-gray-900 font-medium">
                        {formatCurrency(item.total || ((item.hours || item.qty || 1) * (item.rate || item.price || 0)))}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Subtotal, VAT & Total Breakdown */}
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="trades-body text-gray-600">Subtotal</span>
                    <span className="trades-body text-gray-900">
                      {formatCurrency(activeJob?.subtotal || activeJob?.estimatedValue || 0)}
                    </span>
                  </div>
                  
                  {/* VAT (if applicable) */}
                  {activeJob?.vatEnabled && (
                    <div className="flex justify-between items-center">
                      <span className="trades-body text-gray-600">
                        VAT ({activeJob.vatRate || 20}%)
                      </span>
                      <span className="trades-body text-gray-900">
                        {formatCurrency(activeJob?.vatAmount || 0)}
                      </span>
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="trades-body text-gray-900 font-medium">Total Job Value</span>
                    <span className="trades-h2 text-gray-900">
                      {formatCurrency(jobValue)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="trades-body text-gray-500 mb-1">No items found</p>
                <p className="trades-caption text-gray-400">
                  {originalQuote ? 'The original quote has no line items' : 'This job was not created from a quote and has no items'}
                </p>
                {originalQuote && (
                  <button
                    onClick={() => onNavigate('quote-detail', originalQuote)}
                    className="trades-caption text-blue-600 hover:text-blue-700 mt-2"
                  >
                    View original quote →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="trades-h2 text-gray-900">Financial Summary</h2>
            </div>
            
            {/* Progress Overview */}
            <div className="p-4 bg-gray-50">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="trades-caption text-gray-600">Job Progress</span>
                  <span className="trades-caption text-gray-500">{Math.round(paidPercentage)}% completed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full relative" style={{ width: `${paidPercentage}%` }}>
                    <div 
                      className="bg-blue-500 h-2 rounded-full absolute top-0 left-0" 
                      style={{ width: `${Math.min(100, (invoicedPercentage / paidPercentage) * 100 || 0)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="trades-caption text-gray-600">Invoiced</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="trades-caption text-gray-600">Paid</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Job Value */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="trades-body text-gray-900 font-medium">Total Job Value</p>
                    <p className="trades-caption text-gray-500">Full project scope</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="trades-body text-gray-900 font-semibold">{formatCurrency(jobValue)}</p>
                </div>
              </div>

              {/* Invoiced Amount */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FileText size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="trades-body text-gray-900 font-medium">Invoiced</p>
                    <p className="trades-caption text-blue-600">{Math.round(invoicedPercentage)}% of job</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="trades-body text-blue-600 font-semibold">{formatCurrency(totalInvoiced)}</p>
                </div>
              </div>

              {/* Remaining to Invoice */}
              {remainingToInvoice > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Clock size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="trades-body text-gray-900 font-medium">Remaining to Invoice</p>
                      <p className="trades-caption text-orange-600">{Math.round((remainingToInvoice / jobValue) * 100)}% pending</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="trades-body text-orange-600 font-semibold">{formatCurrency(remainingToInvoice)}</p>
                  </div>
                </div>
              )}

              {/* Paid Amount */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <CreditCard size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="trades-body text-gray-900 font-medium">Paid</p>
                    <p className="trades-caption text-green-600">{Math.round(paidPercentage)}% received</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="trades-body text-green-600 font-semibold">{formatCurrency(totalPaid)}</p>
                </div>
              </div>

              {/* Outstanding Amount */}
              {outstanding > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                      <DollarSign size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="trades-body text-gray-900 font-medium">Outstanding</p>
                      <p className="trades-caption text-red-600">Invoiced but unpaid</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="trades-body text-red-600 font-semibold">{formatCurrency(outstanding)}</p>
                  </div>
                </div>
              )}

              {/* Payment Status Indicators */}
              {/* Show "All invoices paid" only when all current invoices are paid */}
              {outstanding === 0 && totalInvoiced > 0 && totalPaid < jobValue && (
                <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <p className="trades-body text-green-700 font-medium">All invoices paid</p>
                  </div>
                </div>
              )}
              
              {/* Show "Job fully paid" when total paid equals job value */}
              {totalPaid >= jobValue && jobValue > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <p className="trades-body text-green-700 font-medium">Job fully paid</p>
                    </div>
                  </div>
                  
                  {/* Job Completion Button - only show when job is fully paid */}
                  {job.status === 'completed' ? (
                    <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle size={14} className="text-white" />
                        </div>
                        <p className="trades-body text-blue-700 font-medium">Job completed</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleManualCompleteJob}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 rounded-lg py-3"
                    >
                      <CheckCircle size={18} />
                      <span className="trades-body font-medium">
                        {loading ? 'Processing...' : 'Mark as Completed'}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h2 className="trades-h2 text-gray-900 mb-4">Activity Timeline</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="trades-caption text-gray-600">Loading timeline...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="trades-body text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadJobData}
                  className="text-blue-600 trades-caption hover:text-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : timelineActivities.length > 0 ? (
              <div className="space-y-4">
                {timelineActivities.map((activity) => {
                  const Icon = activity.icon;
                  
                  // For invoices, make the entire card clickable
                  if (activity.type === 'invoice') {
                    return (
                      <button
                        key={activity.id}
                        onClick={() => onNavigate('invoice-detail', activity.data)}
                        className="w-full flex items-start gap-3 p-3 border rounded-lg border-gray-200 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={14} className="text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="trades-body text-gray-900 mb-1">{activity.title}</p>
                              <p className="trades-caption text-gray-600">{activity.description}</p>
                            </div>
                            
                            <div className="text-right flex-shrink-0 ml-4">
                              {activity.amount && (
                                <p className="trades-body text-gray-900 font-medium mb-1">
                                  {formatCurrency(activity.amount)}
                                </p>
                              )}
                              <p className="trades-caption text-gray-500">
                                {formatDate(activity.date)}
                              </p>
                              {activity.status && (
                                <StatusBadge status={activity.status} />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* View arrow - now part of the clickable area */}
                        <div className="trades-caption text-blue-600 p-1 flex-shrink-0">
                          View →
                        </div>
                      </button>
                    );
                  }
                  
                  // For other activity types (payments, bookings), keep as non-clickable div
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg border-gray-200 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon size={14} className="text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="trades-body text-gray-900 mb-1">{activity.title}</p>
                            <p className="trades-caption text-gray-600">{activity.description}</p>
                          </div>
                          
                          <div className="text-right flex-shrink-0 ml-4">
                            {activity.amount && (
                              <p className="trades-body text-gray-900 font-medium mb-1">
                                {formatCurrency(activity.amount)}
                              </p>
                            )}
                            <p className="trades-caption text-gray-500">
                              {formatDate(activity.date)}
                            </p>
                            {activity.status && (
                              <StatusBadge status={activity.status} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="trades-body text-gray-500 mb-1">No activity yet</p>
                <p className="trades-caption text-gray-400">
                  Create an invoice or book an appointment to get started
                </p>
              </div>
            )}
          </div>


          {/* Delete Job Section */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h2 className="trades-h2 text-red-600 mb-3">Danger Zone</h2>
            <p className="trades-caption text-gray-600 mb-4">
              Delete this job and all related data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              style={{ 
                backgroundColor: '#DC2626',
                color: 'white',
                height: '48px',
                borderRadius: '12px'
              }}
            >
              <Trash2 size={20} />
              <span className="trades-body">Delete Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Use currentJob if available (freshly loaded data with VAT fields), otherwise fallback to job prop
              const jobToPass = currentJob || job;
              onNavigate('generate-invoice', { 
                ...jobToPass, 
                clientId: jobToPass?.clientId || clientData?.id,
                client: clientData 
              });
            }}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: '#0A84FF',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            <Plus size={20} />
            <span className="trades-body">Invoice</span>
          </button>
          <button
            onClick={() => onNavigate('add-booking', { 
              job: job,
              client: clientData 
            })}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: '#16A34A',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            <Calendar size={20} />
            <span className="trades-body">Booking</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h3 className="trades-h2" style={{ color: '#111827' }}>Delete Job</h3>
                <p className="trades-caption" style={{ color: '#6B7280' }}>
                  {job?.title || 'Job'}
                </p>
              </div>
            </div>
            
            <p className="trades-body mb-6" style={{ color: '#6B7280' }}>
              Are you sure you want to delete this job? This will also delete all related invoices, payments, and bookings. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: '#F9FAFB',
                  color: '#111827',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB'
                }}
              >
                <span className="trades-body">Cancel</span>
              </button>
              
              <button
                onClick={handleDeleteJob}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: '#DC2626',
                  color: 'white',
                  height: '44px',
                  borderRadius: '12px'
                }}
              >
                <Trash2 size={16} />
                <span className="trades-body">Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}