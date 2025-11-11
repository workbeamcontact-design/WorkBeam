import { ChevronLeft, Search, Filter, Plus, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { api } from "../../utils/api";
import { EmptyStateIllustration } from "../ui/empty-state-illustration";
import { LoadingWrapper, ListSkeleton } from "../ui/loading-states";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../utils/auth-context";

interface InvoiceListProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  client?: {
    id: string;
    name: string;
  };
  clientId?: string;
  clientName?: string;
}

interface Invoice {
  id: string;
  number: string;
  clientName?: string;
  clientId?: string;
  jobTitle?: string;
  jobRef?: string;
  jobId?: string;
  amountDue?: number;
  total: number;
  dueDate?: string;
  issueDate?: string;
  status: "draft" | "sent" | "part-paid" | "paid" | "overdue" | "pending";
  type?: string;
  description?: string;
}

type FilterType = "all" | "unpaid" | "overdue" | "paid";

export function InvoiceList({ onNavigate, onBack, client, clientId, clientName }: InvoiceListProps) {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is a client-specific view
  const filterClientId = client?.id || clientId;
  const filterClientName = client?.name || clientName;
  const isClientSpecific = !!filterClientId;

  // Load invoices when user logs in
  useEffect(() => {
    if (user) {
      console.log('📋 Invoice List: Loading data (user authenticated)');
      loadInvoices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filterClientId, filterClientName]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load invoices, clients, jobs, and payments in parallel
      const [allInvoices, allClients, allJobs, allPayments] = await Promise.all([
        api.getInvoices(),
        api.getClients(),
        api.getJobs(),
        api.getPayments()
      ]);
      
      let filteredInvoices = allInvoices || [];

      // If viewing invoices for a specific client, filter them
      if (filterClientId) {
        console.log('📋 Filtering invoices for client:', filterClientId, filterClientName);
        console.log('📊 Total invoices before filter:', filteredInvoices.length);
        
        filteredInvoices = filteredInvoices.filter((invoice: any) => {
          const invoiceClientId = invoice.clientId || invoice.client_id;
          
          // Compare as strings to handle type mismatches
          const matches = String(invoiceClientId) === String(filterClientId);
          
          if (matches) {
            console.log('✅ Match found:', invoice.number, 'for client', invoiceClientId);
          }
          
          return matches;
        });
        
        console.log('📊 Filtered invoices count:', filteredInvoices.length);
      }

      // Create lookup maps for efficient data resolution
      const clientMap = new Map();
      const jobMap = new Map();
      
      (allClients || []).forEach((client: any) => {
        clientMap.set(client.id, client);
        clientMap.set(String(client.id), client); // Handle string/number ID mismatch
      });
      
      (allJobs || []).forEach((job: any) => {
        jobMap.set(job.id, job);
        jobMap.set(String(job.id), job); // Handle string/number ID mismatch
      });

      // Normalize invoice data with proper client and job resolution and partial payment calculation
      const normalizedInvoices = filteredInvoices.map((invoice: any) => {
        // Resolve client data
        const clientId = invoice.clientId || invoice.client_id;
        const resolvedClient = clientMap.get(clientId) || clientMap.get(String(clientId));
        const clientName = invoice.clientName || invoice.client_name || invoice.client || 
                          resolvedClient?.name || filterClientName || 'Unknown Client';
        
        // Resolve job data
        const jobId = invoice.jobId || invoice.job_id;
        const resolvedJob = jobMap.get(jobId) || jobMap.get(String(jobId));
        const jobTitle = invoice.jobTitle || invoice.job_title || invoice.job || 
                        resolvedJob?.title || resolvedJob?.description || 
                        invoice.description || invoice.notes || 'Untitled Job';
        
        // Determine invoice type from billType or description
        let invoiceType = '';
        if (invoice.billType === 'deposit' || invoice.isDepositInvoice === true || invoice.is_deposit_invoice === true) {
          invoiceType = 'deposit';
        } else if (invoice.billType === 'remaining') {
          invoiceType = 'remaining';
        } else if (invoice.billType === 'full') {
          invoiceType = 'full';
        } else if (invoice.type) {
          invoiceType = invoice.type;
        } else if (invoice.description?.toLowerCase().includes('deposit')) {
          invoiceType = 'deposit';
        }

        console.log(`🔍 Resolved invoice ${invoice.number || invoice.id}:`, {
          originalClient: invoice.clientName || invoice.client_name || invoice.client,
          resolvedClient: resolvedClient?.name,
          finalClientName: clientName,
          originalJob: invoice.jobTitle || invoice.job_title || invoice.job,
          resolvedJob: resolvedJob?.title,
          finalJobTitle: jobTitle,
          invoiceType
        });

        // Calculate amount due to determine if partially paid
        const amountDue = calculateAmountDue(invoice, allPayments || []);
        const total = invoice.total || invoice.amount || 0;
        const hasPaid = total > 0 && amountDue < total;
        const isFullyPaid = total > 0 && amountDue === 0;
        
        // Determine the correct status
        let finalStatus = normalizeStatus(invoice.status);
        if (hasPaid && !isFullyPaid) {
          finalStatus = "part-paid";
        } else if (isFullyPaid) {
          finalStatus = "paid";
        }

        return {
          id: invoice.id,
          number: invoice.number || invoice.invoiceNumber || `INV-${invoice.id}`,
          clientName,
          clientId,
          jobTitle,
          jobRef: invoice.jobRef || invoice.job_ref || resolvedJob?.title || jobTitle,
          jobId,
          amountDue,
          total,
          dueDate: invoice.dueDate || invoice.due_date,
          issueDate: invoice.issueDate || invoice.issue_date || invoice.createdAt || invoice.created_at,
          status: finalStatus,
          type: invoiceType,
          description: invoice.description || invoice.notes
        };
      });

      setInvoices(normalizedInvoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateAmountDue = (invoice: any, payments: any[]): number => {
    const total = invoice.total || invoice.amount || 0;
    
    // If invoice has amountPaid field, use it
    if (typeof invoice.amountPaid === 'number') {
      return Math.max(0, total - invoice.amountPaid);
    }
    
    // Calculate from payment records
    const invoicePayments = (payments || []).filter(
      (payment: any) => payment.invoiceId === invoice.id
    );
    const totalPaid = invoicePayments.reduce(
      (sum: number, payment: any) => sum + (payment.amount || 0),
      0
    );
    
    return Math.max(0, total - totalPaid);
  };

  const normalizeStatus = (status: string): "draft" | "sent" | "part-paid" | "paid" | "overdue" | "pending" => {
    if (!status) return "draft";
    
    const lowerStatus = status.toLowerCase();
    
    // Check for part-paid first before general "paid"
    if (lowerStatus.includes('part-paid') || lowerStatus.includes('part_paid') || lowerStatus.includes('partial')) return "part-paid";
    if (lowerStatus.includes('paid')) return "paid";
    if (lowerStatus.includes('sent')) return "sent";
    if (lowerStatus.includes('draft')) return "draft";
    if (lowerStatus.includes('overdue')) return "overdue";
    if (lowerStatus.includes('pending')) return "pending";
    
    // Default mapping
    switch (lowerStatus) {
      case 'completed': return "paid";
      case 'active': return "sent";
      default: return "draft";
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Filter and search invoices
  const filteredInvoices = invoices.filter(invoice => {
    // Apply status filter
    let passesFilter = true;
    
    switch (activeFilter) {
      case "unpaid":
        passesFilter = (invoice.amountDue || 0) > 0 && invoice.status !== "overdue" && invoice.status !== "part-paid";
        break;
      case "overdue":
        passesFilter = invoice.status === "overdue" || 
          ((invoice.amountDue || 0) > 0 && invoice.dueDate && invoice.dueDate < today);
        break;
      case "paid":
        passesFilter = invoice.status === "paid" || (invoice.amountDue || 0) === 0;
        break;
      default:
        passesFilter = true;
    }

    // Apply search filter
    if (searchQuery && passesFilter) {
      const query = searchQuery.toLowerCase();
      passesFilter = 
        (invoice.clientName?.toLowerCase().includes(query)) ||
        (invoice.jobRef?.toLowerCase().includes(query)) ||
        (invoice.jobTitle?.toLowerCase().includes(query)) ||
        (invoice.number?.toLowerCase().includes(query)) ||
        (invoice.description?.toLowerCase().includes(query));
    }

    return passesFilter;
  });

  // Intelligent sorting: overdue first, then unpaid by due date, then paid by date
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const aIsPaid = a.status === "paid" || (a.amountDue || 0) === 0;
    const bIsPaid = b.status === "paid" || (b.amountDue || 0) === 0;
    const aOverdue = a.status === "overdue" || (a.dueDate && a.dueDate < today && (a.amountDue || 0) > 0);
    const bOverdue = b.status === "overdue" || (b.dueDate && b.dueDate < today && (b.amountDue || 0) > 0);
    
    // 1. Overdue invoices first (highest priority)
    if (aOverdue && !bOverdue) return -1;
    if (bOverdue && !aOverdue) return 1;
    
    // 2. Unpaid before paid
    if (!aIsPaid && bIsPaid) return -1;
    if (aIsPaid && !bIsPaid) return 1;
    
    // 3. Within same payment status, sort by due date (earliest first for unpaid)
    if (!aIsPaid && !bIsPaid) {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
    }
    
    // 4. For paid invoices, sort by issue date (newest first)
    if (aIsPaid && bIsPaid) {
      if (a.issueDate && b.issueDate) {
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      }
    }
    
    // 5. Fallback: sort by invoice number
    return (a.number || '').localeCompare(b.number || '');
  });

  const getStatusColor = (status: string, dueDate?: string) => {
    // Check if overdue by date
    if (status !== "paid" && dueDate && dueDate < today) {
      return { bg: "rgba(220, 38, 38, 0.1)", text: "var(--error)" };
    }
    
    switch (status) {
      case "draft":
        return { bg: "rgba(107, 114, 128, 0.1)", text: "var(--muted)" };
      case "sent":
        return { bg: "rgba(10, 132, 255, 0.1)", text: "var(--primary)" };
      case "pending":
        return { bg: "rgba(245, 158, 11, 0.1)", text: "var(--warning)" };
      case "part-paid":
        return { bg: "rgba(245, 158, 11, 0.1)", text: "var(--warning)" };
      case "paid":
        return { bg: "rgba(22, 163, 74, 0.1)", text: "var(--success)" };
      case "overdue":
        return { bg: "rgba(220, 38, 38, 0.1)", text: "var(--error)" };
      default:
        return { bg: "rgba(107, 114, 128, 0.1)", text: "var(--muted)" };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date';
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

  const getDisplayStatus = (invoice: Invoice) => {
    // If invoice is overdue (past due date and still has amount due)
    if (invoice.status !== "paid" && invoice.dueDate && invoice.dueDate < today && (invoice.amountDue || 0) > 0) {
      return "overdue";
    }
    
    // If invoice is in draft status but has a due date and amount due, it's actually "unpaid"
    // This happens when an invoice is created and sent but status wasn't updated from "draft"
    if (invoice.status === "draft" && invoice.dueDate && (invoice.amountDue || 0) > 0) {
      return "sent"; // Show as "sent" (unpaid) instead of draft
    }
    
    return invoice.status;
  };

  const getInvoiceDisplayText = (invoice: Invoice) => {
    if (invoice.type === 'deposit') {
      return 'Deposit invoice';
    } else if (invoice.type === 'remaining') {
      return 'Remaining balance invoice';
    } else if (invoice.type === 'full') {
      return 'Full invoice';
    } else {
      return invoice.jobTitle || invoice.jobRef || invoice.description || 'Untitled Job';
    }
  };

  const handleInvoiceClick = async (invoice: Invoice) => {
    console.log('📋 Loading full invoice data for:', invoice.id);
    
    // Guard: Ensure invoice has an ID
    if (!invoice?.id) {
      console.error('❌ Cannot load invoice: missing ID');
      toast.error('Invalid invoice data');
      return;
    }
    
    try {
      // Load the full invoice data from the API to ensure we have templateData
      const fullInvoice = await api.getInvoice(invoice.id);
      if (fullInvoice) {
        console.log('✅ Full invoice loaded with templateData:', !!fullInvoice.templateData);
        onNavigate("invoice-detail", fullInvoice);
      } else {
        console.warn('⚠️ Could not load full invoice, using list data');
        // Only navigate if we have the list invoice data as fallback
        if (invoice) {
          onNavigate("invoice-detail", invoice);
        } else {
          console.error('❌ No invoice data available');
          toast.error('Invoice not found');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load full invoice:', error);
      // Only fallback to list data if it exists
      if (invoice) {
        onNavigate("invoice-detail", invoice);
      } else {
        toast.error('Failed to load invoice');
      }
    }
  };

  const handleNewInvoice = () => {
    // FIXED: If viewing client-specific invoices, redirect to client detail to select a job
    if (filterClientId && client) {
      console.log('📋 Creating invoice for specific client - redirecting to client detail to select job');
      onNavigate('client-detail', client);
    } else {
      // For general invoice creation, redirect to dashboard to select a job
      console.log('📋 Creating general invoice - redirecting to dashboard to select job');
      onNavigate('dashboard');
    }
  };

  // Calculate filter counts
  const filterCounts = {
    all: invoices.length,
    unpaid: invoices.filter(i => (i.amountDue || 0) > 0 && i.status !== "overdue" && i.status !== "part-paid").length,
    overdue: invoices.filter(i => i.status === "overdue" || 
      ((i.amountDue || 0) > 0 && i.dueDate && i.dueDate < today)).length,
    paid: invoices.filter(i => i.status === "paid" || (i.amountDue || 0) === 0).length
  };



  return (
    <div className="screen_root flex flex-col h-full" style={{ backgroundColor: 'var(--surface-alt)' }}>
      <LoadingWrapper isLoading={loading} fallback={<ListSkeleton count={6} />}>
        {/* Header */}
        <div className="header flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} style={{ color: 'var(--ink)' }} />
          </button>
          <div>
            <h1 className="trades-h2" style={{ color: 'var(--ink)' }}>
              {isClientSpecific ? `${filterClientName} - Invoices` : 'Invoices'}
            </h1>
            <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              {sortedInvoices.length} invoice{sortedInvoices.length !== 1 ? 's' : ''}
              {isClientSpecific && ` for ${filterClientName}`}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search_section p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <Input
            placeholder={isClientSpecific ? `Search ${filterClientName}'s invoices...` : "Search invoices, clients, jobs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter_section p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="flex gap-3 overflow-x-auto">
          {[
            { key: "all", label: "All", count: filterCounts.all },
            { key: "unpaid", label: "Unpaid", count: filterCounts.unpaid },
            { key: "overdue", label: "Overdue", count: filterCounts.overdue },
            { key: "paid", label: "Paid", count: filterCounts.paid }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as FilterType)}
              className="flex-shrink-0 trades-label transition-all flex items-center justify-center gap-2 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: activeFilter === filter.key ? 'var(--primary)' : 'var(--surface-alt)',
                color: activeFilter === filter.key ? 'var(--primary-foreground)' : 'var(--muted)',
                border: `1px solid ${activeFilter === filter.key ? 'var(--primary)' : 'var(--border)'}`,
                fontWeight: '500'
              }}
            >
              {filter.label}
              <Badge variant="secondary" style={{
                backgroundColor: activeFilter === filter.key ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                color: activeFilter === filter.key ? 'var(--primary-foreground)' : 'var(--muted)',
                fontSize: '10px'
              }}>
                {filter.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <div className="content_scroll flex-1 overflow-y-auto p-4 pb-24">
        {error ? (
          <div className="empty_state flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" 
                 style={{ backgroundColor: 'var(--surface-alt)' }}>
              <Receipt size={24} style={{ color: 'var(--error)' }} />
            </div>
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>Failed to load invoices</h3>
            <p className="trades-body text-center" style={{ color: 'var(--muted)' }}>
              {error}
            </p>
            <Button onClick={loadInvoices} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : sortedInvoices.length === 0 ? (
          <div className="empty_state flex flex-col items-center justify-center py-16">
            <EmptyStateIllustration />
            <h3 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>
              {searchQuery || activeFilter !== 'all' 
                ? "No invoices found" 
                : isClientSpecific 
                  ? `No invoices for ${filterClientName}` 
                  : "No invoices yet"
              }
            </h3>
            <p className="trades-body text-center mb-6" style={{ color: 'var(--muted)' }}>
              {searchQuery || activeFilter !== 'all' 
                ? "Try adjusting your search or filters" 
                : isClientSpecific
                  ? `Create the first invoice for ${filterClientName} from a job`
                  : "Create your first invoice from a job"
              }
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <Button onClick={handleNewInvoice} className="gap-2">
                <Plus size={16} />
                Create Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedInvoices.map((invoice) => {
              const displayStatus = getDisplayStatus(invoice);
              const isPaid = displayStatus === "paid" || (invoice.amountDue || 0) === 0;
              const isPartPaid = displayStatus === "part-paid";
              const isOverdue = displayStatus === "overdue" || (!isPaid && !isPartPaid && invoice.dueDate && invoice.dueDate < today);
              
              // Determine card background color
              let cardBgColor = 'rgba(255, 255, 255, 1)'; // Default white
              if (isPaid) {
                cardBgColor = 'rgba(22, 163, 74, 0.08)'; // Green tint for paid
              } else if (isPartPaid) {
                cardBgColor = 'rgba(245, 158, 11, 0.08)'; // Orange tint for part-paid
              } else if (isOverdue || (displayStatus === "sent" && (invoice.amountDue || 0) > 0)) {
                // Red tint for overdue OR unpaid invoices with amount due
                cardBgColor = 'rgba(220, 38, 38, 0.08)';
              }
              
              // Status badges are always blue
              const badgeBgColor = 'rgba(10, 132, 255, 0.15)';
              const badgeTextColor = '#0A84FF';
              
              return (
                <Card 
                  key={invoice.id} 
                  className="p-4 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleInvoiceClick(invoice)}
                  style={{ backgroundColor: cardBgColor }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Top row: Invoice number + Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="trades-label" style={{ color: 'var(--ink)' }}>
                          {invoice.number || "DRAFT"}
                        </span>
                        <span
                          className="inline-flex items-center justify-center rounded-md px-2 py-0.5"
                          style={{ 
                            backgroundColor: badgeBgColor,
                            color: badgeTextColor,
                            textTransform: 'capitalize',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          {displayStatus === "part-paid" ? "Partial" : 
                           displayStatus === "sent" ? "Due" : 
                           displayStatus === "overdue" ? "Overdue" : 
                           displayStatus}
                        </span>
                        {invoice.type && (
                          <Badge variant="outline" style={{ fontSize: '9px' }}>
                            {invoice.type}
                          </Badge>
                        )}
                      </div>

                      {/* Second row: Client + Job */}
                      <div className="mb-2">
                        {!isClientSpecific && (
                          <span className="trades-body" style={{ color: 'var(--ink)' }}>
                            {invoice.clientName}
                            <span className="trades-caption ml-2" style={{ color: 'var(--muted)' }}>
                              • 
                            </span>
                          </span>
                        )}
                        <span className={`trades-${isClientSpecific ? 'body' : 'caption'} ${isClientSpecific ? '' : 'ml-1'}`} style={{ 
                          color: isClientSpecific ? 'var(--ink)' : 'var(--muted)' 
                        }}>
                          {invoice.jobTitle || invoice.jobRef || invoice.description || 'Untitled Job'}
                        </span>
                      </div>

                      {/* Third row: Due date */}
                      <div className="trades-caption" style={{ 
                        color: isOverdue ? '#DC2626' : 'var(--muted)' 
                      }}>
                        {invoice.dueDate ? (
                          <>
                            Due {formatDate(invoice.dueDate)}
                            {isOverdue && " (Overdue)"}
                          </>
                        ) : (
                          "No due date"
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right ml-4">
                      <div className="trades-label" style={{ 
                        color: isPaid ? '#16A34A' : (invoice.amountDue || 0) > 0 ? '#DC2626' : 'var(--ink)'
                      }}>
                        {formatCurrency(invoice.amountDue || invoice.total)}
                      </div>
                      {invoice.amountDue !== invoice.total && invoice.amountDue !== undefined && (
                        <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                          of {formatCurrency(invoice.total)}
                        </div>
                      )}
                      <div className="trades-caption" style={{ 
                        color: isPaid ? '#16A34A' : (invoice.amountDue || 0) > 0 ? '#DC2626' : 'var(--muted)'
                      }}>
                        {isPaid ? "Paid" : "Due"}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </LoadingWrapper>
    </div>
  );
}