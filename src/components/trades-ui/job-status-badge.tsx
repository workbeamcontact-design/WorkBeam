import { cn } from "../ui/utils";

interface JobStatusBadgeProps {
  job: any;
  quotes?: any[];
  invoices?: any[];
  className?: string;
}

type JobStatus = 
  | "quote_sent"
  | "quote_approved" 
  | "awaiting_deposit"
  | "deposit_paid"
  | "in_progress"
  | "awaiting_balance"
  | "completed"
  | "no_quote";

export function JobStatusBadge({ job, quotes = [], invoices = [], className }: JobStatusBadgeProps) {
  
  // Determine the job's current status
  const determineStatus = (): JobStatus => {
    // Find related quote
    const relatedQuote = quotes.find(q => 
      q.id === job.originalQuoteId || q.id === job.quoteId
    );

    // Find related invoices
    const relatedInvoices = invoices.filter(inv => inv.jobId === job.id);

    // Debug logging
    console.log('🔍 Job Status Debug:', {
      jobId: job.id,
      jobTitle: job.title,
      jobStatus: job.status,
      originalQuoteId: job.originalQuoteId,
      quoteId: job.quoteId,
      quotesArrayLength: quotes?.length || 0,
      quotesInArray: quotes?.map(q => ({ id: q.id, status: q.status })) || [],
      relatedQuoteFound: !!relatedQuote,
      relatedQuoteStatus: relatedQuote?.status,
      relatedInvoicesCount: relatedInvoices.length,
      invoiceStatuses: relatedInvoices.map(inv => ({ id: inv.id, status: inv.status, billType: inv.billType }))
    });

    // If job is explicitly marked as completed
    if (job.status === 'completed') {
      // Check if all invoices are paid
      const allInvoicesPaid = relatedInvoices.length > 0 && 
        relatedInvoices.every(inv => inv.status === 'paid');
      
      if (allInvoicesPaid || relatedInvoices.length === 0) {
        return "completed";
      }
      // If marked complete but invoices not all paid, show awaiting balance
      return "awaiting_balance";
    }

    // If no quote linked
    if (!relatedQuote) {
      // Fallback: Check job's own status field
      if (job.status === 'quote_approved') {
        // Job was created from approved quote but we can't find the quote
        if (relatedInvoices.length === 0) {
          return "quote_approved";
        }
      }
      
      // Check if has any invoices
      if (relatedInvoices.length > 0) {
        // Check for deposit invoice
        const depositInvoice = relatedInvoices.find(inv => 
          inv.billType === 'deposit' || inv.is_deposit_invoice
        );
        const remainingInvoice = relatedInvoices.find(inv => inv.billType === 'remaining');
        
        // If there's a deposit invoice
        if (depositInvoice) {
          if (depositInvoice.status === 'paid') {
            // Deposit paid - check if remaining invoice exists
            if (remainingInvoice) {
              if (remainingInvoice.status === 'paid') {
                return "completed";
              }
              return "awaiting_balance";
            }
            // Deposit paid, no remaining invoice yet
            return "deposit_paid";
          } else if (depositInvoice.status === 'partial') {
            return "in_progress";
          } else {
            // Deposit invoice exists but not paid
            return "awaiting_deposit";
          }
        }
        
        // If there's a remaining invoice only
        if (remainingInvoice) {
          if (remainingInvoice.status === 'paid') {
            return "completed";
          }
          if (remainingInvoice.status === 'partial') {
            return "in_progress";
          }
          return "awaiting_balance";
        }
        
        // No clear invoice types - use general logic
        const allPaid = relatedInvoices.every(inv => inv.status === 'paid');
        const anyPaid = relatedInvoices.some(inv => inv.status === 'paid');
        
        if (allPaid) return "completed";
        if (anyPaid) return "in_progress";
        return "awaiting_deposit";
      }
      return "no_quote";
    }

    // Quote exists - check its status
    // Handle both 'approved', 'accepted', and 'converted' as valid approval states
    const isQuoteApproved = 
      relatedQuote.status === 'approved' || 
      relatedQuote.status === 'accepted' ||
      relatedQuote.status === 'converted' ||
      job.status === 'quote_approved'; // Trust the job's status if it says quote is approved
    
    if (!isQuoteApproved) {
      return "quote_sent";
    }

    // Quote is approved - now check invoice/payment status
    if (relatedInvoices.length === 0) {
      // Quote approved but no invoices yet
      return "quote_approved";
    }

    // Check for deposit invoice
    const depositInvoice = relatedInvoices.find(inv => 
      inv.billType === 'deposit' || inv.is_deposit_invoice
    );

    const fullInvoice = relatedInvoices.find(inv => inv.billType === 'full');
    const remainingInvoice = relatedInvoices.find(inv => inv.billType === 'remaining');

    // If there's a full invoice
    if (fullInvoice) {
      if (fullInvoice.status === 'paid') {
        return "completed";
      }
      if (fullInvoice.status === 'partial') {
        return "in_progress";
      }
      return "awaiting_deposit";
    }

    // Check deposit payment status
    if (depositInvoice) {
      if (depositInvoice.status === 'paid') {
        // Deposit paid - check if remaining invoice exists
        if (remainingInvoice) {
          if (remainingInvoice.status === 'paid') {
            return "completed";
          }
          return "awaiting_balance";
        }
        // Deposit paid, no remaining invoice yet
        return "deposit_paid";
      } else if (depositInvoice.status === 'partial') {
        return "in_progress";
      } else {
        // Deposit invoice exists but not paid
        return "awaiting_deposit";
      }
    }

    // Check remaining invoice only
    if (remainingInvoice) {
      if (remainingInvoice.status === 'paid') {
        return "completed";
      }
      if (remainingInvoice.status === 'partial') {
        return "in_progress";
      }
      return "awaiting_balance";
    }

    // Quote approved, invoices exist but unclear type
    const allPaid = relatedInvoices.every(inv => inv.status === 'paid');
    const anyPaid = relatedInvoices.some(inv => inv.status === 'paid' || inv.status === 'partial');

    if (allPaid) return "completed";
    if (anyPaid) return "in_progress";
    
    // Has invoices but none paid
    return "awaiting_deposit";
  };

  const status = determineStatus();

  const getStatusConfig = (status: JobStatus) => {
    switch (status) {
      case "quote_sent":
        return {
          label: "Quote Sent",
          backgroundColor: '#F9FAFB',
          color: '#6B7280',
          borderColor: '#E5E7EB'
        };
      case "quote_approved":
        return {
          label: "Quote Approved",
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          borderColor: '#DBEAFE'
        };
      case "awaiting_deposit":
        return {
          label: "Awaiting Deposit",
          backgroundColor: '#FFF7E6',
          color: '#F59E0B',
          borderColor: '#FDE68A'
        };
      case "deposit_paid":
        return {
          label: "Deposit Paid",
          backgroundColor: '#ECFDF5',
          color: '#059669',
          borderColor: '#A7F3D0'
        };
      case "in_progress":
        return {
          label: "In Progress",
          backgroundColor: '#EFF6FF',
          color: '#2563EB',
          borderColor: '#DBEAFE'
        };
      case "awaiting_balance":
        return {
          label: "Awaiting Balance",
          backgroundColor: '#FFF7E6',
          color: '#F59E0B',
          borderColor: '#FDE68A'
        };
      case "completed":
        return {
          label: "Completed",
          backgroundColor: '#ECFDF5',
          color: '#059669',
          borderColor: '#A7F3D0'
        };
      case "no_quote":
        return {
          label: "No Quote",
          backgroundColor: '#F9FAFB',
          color: '#6B7280',
          borderColor: '#E5E7EB'
        };
      default:
        return {
          label: "Unknown",
          backgroundColor: '#F9FAFB',
          color: '#6B7280',
          borderColor: '#E5E7EB'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div
      className={cn("inline-flex items-center px-2 py-1 rounded-full border", className)}
      style={{
        backgroundColor: config.backgroundColor,
        color: config.color,
        borderColor: config.borderColor
      }}
    >
      <span className="trades-caption font-medium whitespace-nowrap">
        {config.label}
      </span>
    </div>
  );
}
