import { 
  Calendar, Clock, TrendingUp, Users, FileText, DollarSign, Plus, Eye, 
  AlertTriangle, CheckCircle, Phone, MapPin, ArrowRight, Star, 
  MessageSquare, Building2, ChevronRight, Bell, Briefcase, ClipboardList,
  CheckCircle2, XCircle, Palette
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { JobStatusBadge } from "../trades-ui/job-status-badge";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { api } from "../../utils/api";
import { ApiStatus } from "../ui/api-status";
import { LoadingWrapper, DashboardSkeleton } from "../ui/loading-states";
import { useAuth } from "../../utils/auth-context";

interface DashboardProps {
  onNavigate: (screen: string, data?: any) => void;
  refreshKey?: number;
}

// Simple and reliable date parsing for revenue calculation
const getPaymentDate = (invoice: any): Date | null => {
  // Priority: paidAtISO > paidAt (DD/MM/YYYY) > updatedAt (if status is paid)
  if (invoice.paidAtISO) {
    const date = new Date(invoice.paidAtISO);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (invoice.paidAt && typeof invoice.paidAt === 'string' && invoice.paidAt.includes('/')) {
    const [day, month, year] = invoice.paidAt.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Fallback for legacy invoices (both paid and partial)
  if ((invoice.status === 'paid' || invoice.status === 'partial') && invoice.updatedAt) {
    const date = new Date(invoice.updatedAt);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
};

export function DashboardClean({ onNavigate, refreshKey = 0 }: DashboardProps) {
  const { user, sessionReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState({
    clients: [] as any[],
    jobs: [] as any[],
    invoices: [] as any[],
    bookings: [] as any[],
    quotes: [] as any[],
    payments: [] as any[]
  });

  // Load dashboard data when user is authenticated AND session is ready
  useEffect(() => {
    if (user && sessionReady) {
      console.log('📊 Dashboard: User and session ready - loading data (refreshKey:', refreshKey, ')');
      loadDashboardData();
    } else if (user && !sessionReady) {
      console.log('⏳ Dashboard: User authenticated but session not ready yet...');
    } else {
      console.log('ℹ️ Dashboard: No user, skipping data load');
    }
  }, [refreshKey, user, sessionReady]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Dashboard: Starting data load...');
      
      // Skip health check - app already verified connectivity on init
      // Just load data directly for faster performance
      const [clients, jobs, invoices, bookings, quotes, payments] = await Promise.all([
        api.getClients(),
        api.getJobs(),
        api.getInvoices(),
        api.getBookings(),
        api.getQuotes(),
        api.getPayments()
      ]);
      
      console.log('📊 Dashboard: Data loaded:', {
        clients: clients?.length || 0,
        jobs: jobs?.length || 0,
        invoices: invoices?.length || 0,
        bookings: bookings?.length || 0,
        quotes: quotes?.length || 0,
        payments: payments?.length || 0
      });

      // Filter out orphaned data - jobs and quotes without valid client references
      const clientIds = new Set(clients.map(c => c.id));
      
      const orphanedJobIds: string[] = [];
      const validJobs = jobs.filter(job => {
        // Keep jobs that have a valid client reference OR no client reference yet
        if (!job.clientId) return true; // New jobs without client yet
        const isValid = clientIds.has(job.clientId);
        if (!isValid) {
          console.warn(`⚠️ Filtered orphaned job: ${job.id} - ${job.title} (client ${job.clientId} not found)`);
          orphanedJobIds.push(job.id);
        }
        return isValid;
      });
      
      const orphanedQuoteIds: string[] = [];
      const validQuotes = quotes.filter(quote => {
        if (!quote.clientId) return true; // New quotes without client yet
        const isValid = clientIds.has(quote.clientId);
        if (!isValid) {
          console.warn(`⚠️ Filtered orphaned quote: ${quote.id} - ${quote.title} (client ${quote.clientId} not found)`);
          orphanedQuoteIds.push(quote.id);
        }
        return isValid;
      });

      // If orphaned data detected, silently delete it in the background
      if (orphanedJobIds.length > 0 || orphanedQuoteIds.length > 0) {
        console.log(`🧹 Auto-cleanup: Removing ${orphanedJobIds.length} orphaned jobs and ${orphanedQuoteIds.length} orphaned quotes...`);
        
        // Delete orphaned jobs silently in background
        orphanedJobIds.forEach(jobId => {
          api.deleteJob(jobId).catch(err => {
            console.warn(`Failed to cleanup orphaned job ${jobId}:`, err);
          });
        });
        
        // Delete orphaned quotes silently in background
        orphanedQuoteIds.forEach(quoteId => {
          api.deleteQuote(quoteId).catch(err => {
            console.warn(`Failed to cleanup orphaned quote ${quoteId}:`, err);
          });
        });
      }

      setData({ 
        clients, 
        jobs: validJobs, 
        invoices, 
        bookings, 
        quotes: validQuotes,
        payments
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Safe navigation to job detail - verify job exists first
  const handleJobClick = async (job: any) => {
    try {
      // Try to fetch the job to verify it still exists
      const existingJob = await api.getJob(job.id);
      if (existingJob) {
        onNavigate('job-detail', job);
      } else {
        // Job no longer exists, refresh dashboard data
        console.log('Job not found, refreshing dashboard...');
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Failed to verify job:', err);
      // Refresh dashboard data on error
      await loadDashboardData();
    }
  };

  // Safe navigation to quote detail - verify quote exists first
  const handleQuoteClick = async (quote: any) => {
    try {
      // Try to fetch the quote to verify it still exists
      const existingQuote = await api.getQuote(quote.id);
      if (existingQuote) {
        onNavigate('quote-detail', quote);
      } else {
        // Quote no longer exists, refresh dashboard data
        console.log('Quote not found, refreshing dashboard...');
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Failed to verify quote:', err);
      // Refresh dashboard data on error
      await loadDashboardData();
    }
  };

  // Clean and simple metrics calculation
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Basic counts
    const totalClients = data.clients.length;
    const activeJobs = data.jobs.filter(job => 
      ['quote_pending', 'quote_approved', 'in_progress'].includes(job.status)
    ).length;
    
    // Financial calculations - account for partial payments
    const outstandingInvoices = data.invoices.filter(inv => inv.status !== 'paid');
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => {
      const invoiceTotal = inv.total || 0;
      const amountPaid = inv.amountPaid || 0;
      return sum + (invoiceTotal - amountPaid);
    }, 0);
    
    const overdueInvoices = outstandingInvoices.filter(inv => {
      if (!inv.dueDate) return false;
      return new Date(inv.dueDate) < now;
    });
    const totalOverdue = overdueInvoices.reduce((sum, inv) => {
      const invoiceTotal = inv.total || 0;
      const amountPaid = inv.amountPaid || 0;
      return sum + (invoiceTotal - amountPaid);
    }, 0);
    
    // Monthly revenue using payment records (includes partial payments)
    const allPayments = data.payments || [];
    const thisMonthRevenue = allPayments
      .filter(payment => {
        // Parse payment date
        let paymentDate: Date | null = null;
        if (payment.date) {
          paymentDate = new Date(payment.date);
        } else if (payment.createdAt) {
          paymentDate = new Date(payment.createdAt);
        }
        
        if (!paymentDate || isNaN(paymentDate.getTime())) return false;
        
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0);

    return {
      totalClients,
      activeJobs,
      totalOutstanding,
      totalOverdue,
      monthlyRevenue: thisMonthRevenue,
      outstandingCount: outstandingInvoices.length,
      overdueCount: overdueInvoices.length
    };
  }, [data]);

  // Helper function to format booking time display
  const formatBookingTime = (booking: any) => {
    if (booking.isAllDay) {
      return 'All day';
    }
    if (booking.startTime && booking.endTime) {
      return `${booking.startTime} - ${booking.endTime}`;
    }
    return booking.startTime || booking.time || '';
  };

  // Today's schedule - simple and functional
  const todaysSchedule = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysBookings = data.bookings.filter(booking => booking.date === today);
    
    // Recent jobs for context
    // Filter out any jobs that might be invalid or deleted
    const recentJobs = data.jobs
      .filter(job => job && job.id && job.title) // Only include valid jobs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);

    // Recent quotes
    const recentQuotes = data.quotes
      .filter(quote => quote && quote.id) // Only include valid quotes
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
      .slice(0, 3);

    return { todaysBookings, recentJobs, recentQuotes };
  }, [data]);

  // Priority alerts - only real, actionable items
  const priorityAlerts = useMemo(() => {
    const alerts = [];
    
    if (metrics.totalOverdue > 0) {
      alerts.push({
        id: 'overdue-payments',
        type: 'urgent',
        title: `${metrics.overdueCount} Overdue Payment${metrics.overdueCount > 1 ? 's' : ''}`,
        description: `£${metrics.totalOverdue.toFixed(0)} overdue`,
        action: () => onNavigate('invoice-list'),
        actionText: 'Review'
      });
    }

    if (metrics.activeJobs > 5) {
      alerts.push({
        id: 'busy-schedule',
        type: 'info',
        title: 'Busy Period',
        description: `${metrics.activeJobs} active jobs`,
        action: () => onNavigate('job-list'),
        actionText: 'Manage'
      });
    }

    return alerts.slice(0, 2); // Max 2 alerts
  }, [metrics, onNavigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };



  if (error) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <h1 className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>Dashboard</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <ApiStatus onStatusChange={(isOnline) => {
            if (isOnline) loadDashboardData();
          }} />
        </div>
      </div>
    );
  }

  // Empty state - clean and encouraging (only show if not loading AND no clients)
  if (!loading && data.clients.length === 0) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <h1 className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>Welcome to WorkBeam</h1>
          <p className="trades-body" style={{ color: 'var(--muted)' }}>
            Let's get your business started
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 size={36} className="text-blue-600" />
            </div>
            <h2 className="trades-h2 mb-3" style={{ color: 'var(--ink)' }}>
              Ready to Grow Your Trade Business?
            </h2>
            <p className="trades-body mb-8" style={{ color: 'var(--muted)' }}>
              Start by adding your first client and begin managing jobs, quotes, and invoices professionally
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => onNavigate('new-client')}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white gap-3"
              >
                <Plus size={20} />
                Add Your First Client
              </Button>
              
              <Button 
                onClick={() => onNavigate('business-details')}
                variant="outline"
                className="w-full h-12 gap-3"
              >
                <Star size={20} />
                Setup Business Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoadingWrapper isLoading={loading} type="dashboard">
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Clean Header */}
        <div className="header bg-white p-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="trades-h1 mb-1" style={{ color: 'var(--ink)' }}>Dashboard</h1>
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              {new Date().toLocaleDateString('en-GB', { 
                weekday: 'long', day: 'numeric', month: 'long' 
              })}
            </p>
          </div>
          <Button 
            onClick={() => onNavigate('notifications-settings')}
            variant="ghost" 
            size="sm"
            className="gap-2"
          >
            <Bell size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-6 pb-24">
        
        {/* Financial Summary - Clean and prominent */}
        {metrics.totalOutstanding > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm -mt-2 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="trades-caption text-blue-700 mb-1">Outstanding Revenue</p>
                <div className="trades-h1 text-blue-900">
                  {formatCurrency(metrics.totalOutstanding)}
                </div>
                {metrics.totalOverdue > 0 && (
                  <p className="trades-caption text-orange-600 mt-1">
                    {formatCurrency(metrics.totalOverdue)} overdue
                  </p>
                )}
              </div>
              <Button 
                onClick={() => onNavigate('invoice-list')}
                size="sm"
                className="gap-2"
              >
                <FileText size={16} />
                View Invoices
              </Button>
            </div>
          </div>
        )}
        
        
        {/* Priority Alerts - Only when needed */}
        {priorityAlerts.length > 0 && (
          <div className="space-y-3">
            {priorityAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  alert.type === 'urgent' 
                    ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                }`}
                onClick={alert.action}
              >
                <div className={`p-2 rounded-lg ${
                  alert.type === 'urgent' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle size={20} className={
                    alert.type === 'urgent' ? 'text-red-600' : 'text-blue-600'
                  } />
                </div>
                <div className="flex-1">
                  <h3 className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>
                    {alert.title}
                  </h3>
                  <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                    {alert.description}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  {alert.actionText}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Business Overview - Clean 2x2 grid */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => onNavigate('clients')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-blue-600" />
              </div>
              <span className="trades-label font-medium" style={{ color: 'var(--ink)' }}>Clients</span>
            </div>
            <div className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>{metrics.totalClients}</div>
            <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              Total clients
            </p>
          </div>

          <div 
            className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => onNavigate('job-list')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <span className="trades-label font-medium" style={{ color: 'var(--ink)' }}>Active Jobs</span>
            </div>
            <div className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>{metrics.activeJobs}</div>
            <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              In progress
            </p>
          </div>

          <div 
            className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => onNavigate('invoice-list')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-orange-600" />
              </div>
              <span className="trades-label font-medium" style={{ color: 'var(--ink)' }}>Invoices</span>
            </div>
            <div className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>{metrics.outstandingCount}</div>
            <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              Outstanding
            </p>
          </div>

          <div 
            className="bg-white rounded-xl p-4 border border-gray-200 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => onNavigate('business-analytics')}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <DollarSign size={20} className="text-purple-600" />
              </div>
              <span className="trades-label font-medium" style={{ color: 'var(--ink)' }}>This Month</span>
            </div>
            <div className="trades-h1 mb-2" style={{ color: 'var(--ink)' }}>
              {formatCurrency(metrics.monthlyRevenue)}
            </div>
            <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              Revenue earned
            </p>
          </div>
        </div>

        {/* Today's Schedule - Clean and functional */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar size={16} className="text-blue-600" />
              </div>
              <h2 className="trades-h2" style={{ color: 'var(--ink)' }}>Today's Schedule</h2>
            </div>
            <Button 
              onClick={() => onNavigate('calendar')}
              variant="ghost" 
              size="sm"
              className="gap-1 text-blue-600"
            >
              View All
              <ArrowRight size={14} />
            </Button>
          </div>

          {todaysSchedule.todaysBookings.length === 0 ? (
            <div className="text-center py-6">
              <Clock size={32} className="text-gray-300 mx-auto mb-3" />
              <h3 className="trades-body font-medium mb-2" style={{ color: 'var(--ink)' }}>
                No bookings today
              </h3>
              <p className="trades-caption text-gray-600 mb-4">
                Great time to follow up with clients or plan future work
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => onNavigate('add-booking')}
                  size="sm"
                  className="gap-2"
                >
                  <Plus size={14} />
                  Add Booking
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysSchedule.todaysBookings.map((booking, index) => (
                <div
                  key={index}
                  onClick={() => onNavigate('booking-detail', booking)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                >
                  <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="trades-body font-medium mb-1" style={{ color: 'var(--ink)' }}>
                      {formatBookingTime(booking)} • {booking.title}
                    </div>
                    <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                      {booking.client || 'General booking'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity - Simple and useful */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <h2 className="trades-h2" style={{ color: 'var(--ink)' }}>Recent Jobs</h2>
            </div>
            <Button 
              onClick={() => onNavigate('job-list')}
              variant="ghost" 
              size="sm"
              className="gap-1 text-blue-600"
            >
              View All
              <ArrowRight size={14} />
            </Button>
          </div>

          {todaysSchedule.recentJobs.length === 0 ? (
            <div className="text-center py-6">
              <FileText size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="trades-body" style={{ color: 'var(--muted)' }}>No jobs yet</p>
              <Button 
                onClick={() => onNavigate('clients')}
                size="sm"
                className="mt-3 gap-2"
              >
                <Plus size={14} />
                Create First Job
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysSchedule.recentJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => handleJobClick(job)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>
                        {job.title}
                      </span>
                      <JobStatusBadge 
                        job={job} 
                        quotes={data.quotes}
                        invoices={data.invoices}
                      />
                    </div>
                    <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                      {data.clients.find(client => client.id === job.clientId)?.name || 'Unknown Client'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotes Section */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClipboardList size={16} className="text-purple-600" />
              </div>
              <h2 className="trades-h2" style={{ color: 'var(--ink)' }}>Recent Quotes</h2>
            </div>
            <Button 
              onClick={() => onNavigate('quote-list')}
              variant="ghost" 
              size="sm"
              className="gap-1 text-blue-600"
            >
              View All
              <ArrowRight size={14} />
            </Button>
          </div>

          {todaysSchedule.recentQuotes.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="trades-body" style={{ color: 'var(--muted)' }}>No quotes yet</p>
              <Button 
                onClick={() => onNavigate('clients')}
                size="sm"
                className="mt-3 gap-2"
              >
                <Plus size={14} />
                Create First Quote
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysSchedule.recentQuotes.map((quote) => {
                const client = data.clients.find(c => c.id === quote.clientId);
                const isApproved = quote.status === 'approved';
                const isRejected = quote.status === 'rejected';
                // Check if this quote has been converted to a job
                // Support both quoteId (server) and originalQuoteId (local storage)
                const convertedToJob = data.jobs.some(job => {
                  const matches = job.originalQuoteId === quote.id || job.quoteId === quote.id;
                  return matches;
                });
                
                const showStatus = isApproved || isRejected || convertedToJob;
                
                return (
                  <div
                    key={quote.id}
                    onClick={() => handleQuoteClick(quote)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="trades-body font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {quote.title || 'Untitled Quote'}
                        </span>
                        {showStatus && (
                          <div className="flex-shrink-0">
                            {convertedToJob && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded-full">
                                <Briefcase size={12} className="text-blue-600" />
                                <span className="trades-caption text-blue-700">Converted</span>
                              </div>
                            )}
                            {!convertedToJob && isApproved && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 rounded-full">
                                <CheckCircle2 size={12} className="text-green-600" />
                                <span className="trades-caption text-green-700">Approved</span>
                              </div>
                            )}
                            {!convertedToJob && isRejected && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full">
                                <XCircle size={12} className="text-red-600" />
                                <span className="trades-caption text-red-700">Rejected</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                          {client?.name || 'Unknown Client'}
                        </span>
                        <span className="trades-body font-semibold ml-2 flex-shrink-0" style={{ color: 'var(--primary)' }}>
                          {formatCurrency(quote.total || 0)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 ml-2 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions - Clean workflow actions */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h2 className="trades-h2 mb-4" style={{ color: 'var(--ink)' }}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Add Client - Primary business action */}
            <button
              onClick={() => onNavigate('new-client')}
              className="h-20 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <Plus size={24} className="text-blue-600" />
              <span className="trades-label font-medium text-blue-700">Add Client</span>
            </button>
            
            {/* Schedule Work - Important for planning */}
            <button
              onClick={() => onNavigate('add-booking')}
              className="h-20 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <Calendar size={24} className="text-green-600" />
              <span className="trades-label font-medium text-green-700">Schedule Work</span>
            </button>

            {/* Branding & Logo - Customization */}
            <button
              onClick={() => onNavigate('branding-logo')}
              className="h-20 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <Palette size={24} className="text-purple-600" />
              <span className="trades-label font-medium text-purple-700">Branding</span>
            </button>

            {/* View Jobs - Monitor active work */}
            <button
              onClick={() => onNavigate('job-list')}
              className="h-20 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 transition-all duration-200 flex flex-col items-center justify-center gap-2"
            >
              <Briefcase size={24} className="text-orange-600" />
              <span className="trades-label font-medium text-orange-700">View Jobs</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </LoadingWrapper>
  );
}