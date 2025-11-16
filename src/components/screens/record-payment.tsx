import { ChevronLeft, CreditCard, Banknote, Smartphone, CheckCircle, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";
import { useAppStore } from "../../hooks/useAppStore";

interface RecordPaymentProps {
  invoice: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

type PaymentMethod = "cash" | "bank" | "other";

interface PaymentData {
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string;
}

export function RecordPayment({ invoice, onNavigate, onBack }: RecordPaymentProps) {
  // Get refresh functions from app store
  const { refreshClientDetail, refreshJobDetail, refreshDashboard } = useAppStore();
  
  // Auto-redirect if no invoice data - this happens when navigating back incorrectly
  useEffect(() => {
    if (!invoice) {
      console.warn('⚠️ RecordPayment: No invoice data provided - auto-redirecting');
      // Automatically go back after a brief delay
      const timer = setTimeout(() => {
        onBack();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [invoice, onBack]);
  
  // Validate invoice data and provide fallbacks
  if (!invoice) {
    // Show minimal loading state while auto-redirecting
    return (
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // Validate required invoice fields
  const invoiceId = invoice.id;
  const invoiceTotal = invoice.total || invoice.amount || 0;
  
  if (!invoiceId) {
    console.warn('⚠️ RecordPayment: Invoice missing required id field - showing error screen', invoice);
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="header bg-white p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="trades-h1" style={{ color: 'var(--ink)' }}>Error</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <h2 className="trades-h2 text-gray-900 mb-4">Invalid Invoice</h2>
            <p className="trades-body text-gray-600 mb-6">The invoice data is incomplete or corrupted.</p>
            <button onClick={onBack} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ RecordPayment: Valid invoice data loaded', {
    id: invoiceId,
    total: invoiceTotal,
    number: invoice.number
  });

  const [paymentData, setPaymentData] = useState<PaymentData>({
    amount: invoice?.suggestedAmount || 0, // Pre-fill with suggested amount if provided (e.g., from "Mark as Paid" button)
    method: "bank",
    reference: invoice?.suggestedAmount ? "Full payment" : "", // Add reference if it's a full payment suggestion
    date: new Date().toISOString().split('T')[0]
  });

  const [existingPayments, setExistingPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);

  // Load existing payments for this invoice
  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoadingPayments(true);
        const payments = await api.getInvoicePayments(invoiceId);
        setExistingPayments(payments || []);
      } catch (error) {
        console.error('Error loading payments:', error);
        setExistingPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    loadPayments();
  }, [invoiceId]);

  // Close date picker when scrolling to prevent overlap issues
  useEffect(() => {
    const contentScroll = document.querySelector('.content_scroll');
    
    const handleScroll = () => {
      if (isDatePickerOpen) {
        setIsDatePickerOpen(false);
      }
    };

    if (contentScroll) {
      contentScroll.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (contentScroll) {
        contentScroll.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isDatePickerOpen]);

  // Calculate current balance (total minus already paid amounts)
  const totalPaid = existingPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const currentBalance = Math.max(0, invoiceTotal - totalPaid);
  const halfAmount = Math.round(currentBalance / 2);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleAmountChip = (amount: number) => {
    setPaymentData(prev => ({ ...prev, amount }));
  };

  const handleSave = async () => {
    if (!paymentData.amount || paymentData.amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (paymentData.amount > currentBalance) {
      toast.error("Payment amount cannot exceed outstanding balance");
      return;
    }

    try {
      // Calculate new status
      const newTotalPaid = totalPaid + paymentData.amount;
      const newStatus = newTotalPaid >= invoiceTotal ? "paid" : "part-paid";
      const isPaidInFull = newStatus === "paid";

      console.log('💰 Recording payment:', {
        invoiceId: invoiceId,
        amount: paymentData.amount,
        clientName: typeof invoice.client === 'string' ? invoice.client : invoice.client?.name || invoice.clientName || 'Unknown Client',
        invoiceNumber: invoice.number || 'Draft',
        newStatus,
        totalPaid: newTotalPaid,
        invoiceTotal
      });

      // Record the payment via API
      const payment = await api.recordPayment({
        invoiceId: invoiceId,
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference || '',
        date: paymentData.date,
        notes: ''
      });

      if (!payment) {
        throw new Error('Failed to record payment');
      }
      
      // Show success message
      toast.success(`Payment of ${formatCurrency(paymentData.amount)} recorded successfully`);
      
      // Trigger refresh for all screens that display financial data
      refreshClientDetail();
      refreshJobDetail();
      refreshDashboard();
      
      console.log('🔄 Triggered refresh for client detail, job detail, and dashboard screens');
      
      // Reload the invoice from the API to get the latest data
      const updatedInvoice = await api.getInvoice(invoiceId);
      
      if (updatedInvoice) {
        // Navigate back to invoice detail with fresh data from server
        onNavigate("invoice-detail", updatedInvoice);
      } else {
        // Fallback: use local update if API call fails
        const localUpdatedInvoice = {
          ...invoice,
          status: newStatus,
          amountPaid: newTotalPaid,
          // Set payment date for both full and partial payments
          paidAt: new Date().toISOString(),
          paidAtISO: new Date().toISOString()
        };
        onNavigate("invoice-detail", localUpdatedInvoice);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const isValidAmount = paymentData.amount > 0 && paymentData.amount <= currentBalance;
  const remainingBalance = currentBalance - paymentData.amount;

  return (
    <div className="screen_root flex flex-col h-full" style={{ backgroundColor: 'var(--surface-alt)' }}>
      {/* Header */}
      <div className="header flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} style={{ color: 'var(--ink)' }} />
        </button>
        <div>
          <h1 className="trades-h2" style={{ color: 'var(--ink)' }}>Record Payment</h1>
          <p className="trades-caption" style={{ color: 'var(--muted)' }}>
            {invoice.number || "Draft"} • {typeof invoice.client === 'string' ? invoice.client : invoice.client?.name || invoice.clientName || 'Unknown Client'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="content_scroll flex-1 overflow-y-auto p-4 pb-32 space-y-6">
        {/* Info banner when amount is pre-filled from "Mark as Paid" */}
        {invoice?.suggestedAmount && invoice.suggestedAmount === currentBalance && (
          <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: 'rgba(10, 132, 255, 0.05)', border: '1px solid rgba(10, 132, 255, 0.2)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--primary)' }}>
              <CheckCircle size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="trades-label mb-1" style={{ color: 'var(--ink)' }}>Full Payment Ready</div>
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                The full outstanding amount has been pre-filled. Review the details below and click "Record Payment" to mark this invoice as paid.
              </p>
            </div>
          </div>
        )}
        
        {/* Outstanding Balance */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-center">
            <div className="trades-caption mb-1" style={{ color: 'var(--muted)' }}>Outstanding Balance</div>
            <div className="trades-h1" style={{ color: 'var(--ink)' }}>
              {loadingPayments ? '...' : formatCurrency(currentBalance)}
            </div>
            {!loadingPayments && totalPaid > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: 'var(--muted)' }}>Invoice Total:</span>
                  <span style={{ color: 'var(--ink)' }}>{formatCurrency(invoiceTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span style={{ color: 'var(--muted)' }}>Already Paid:</span>
                  <span className="text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Amount Selection */}
        <div className="space-y-4">
          <div>
            <Label className="trades-label" style={{ color: 'var(--ink)' }}>Payment Amount</Label>
            <p className="trades-caption mb-3" style={{ color: 'var(--muted)' }}>
              Choose a quick amount or enter a custom amount
            </p>
          </div>

          {/* Quick Amount Chips */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "£50", amount: 50 },
              { label: "£100", amount: 100 },
              { label: "Half", amount: halfAmount },
              { label: "Full", amount: currentBalance }
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleAmountChip(chip.amount)}
                className="p-3 rounded-lg border text-center transition-all"
                style={{
                  backgroundColor: paymentData.amount === chip.amount ? 'rgba(10, 132, 255, 0.05)' : 'var(--surface)',
                  borderColor: paymentData.amount === chip.amount ? 'var(--primary)' : 'var(--border)',
                  color: paymentData.amount === chip.amount ? 'var(--primary)' : 'var(--ink)'
                }}
                disabled={chip.amount > currentBalance}
              >
                <div className="trades-label">{chip.label}</div>
                <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                  {formatCurrency(chip.amount)}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div>
            <Label>Custom Amount (£)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={paymentData.amount || ""}
              onChange={(e) => setPaymentData(prev => ({ 
                ...prev, 
                amount: parseFloat(e.target.value) || 0 
              }))}
              min="0"
              max={currentBalance}
              step="0.01"
            />
          </div>

          {/* Remaining Balance Preview */}
          {paymentData.amount > 0 && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-alt)' }}>
              <div className="flex justify-between items-center">
                <span className="trades-body" style={{ color: 'var(--ink)' }}>Remaining Balance</span>
                <span className="trades-body" style={{ 
                  color: remainingBalance === 0 ? 'var(--success)' : 'var(--ink)' 
                }}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>
              {remainingBalance === 0 && (
                <Badge className="mt-2" style={{ 
                  backgroundColor: 'rgba(22, 163, 74, 0.1)', 
                  color: 'var(--success)' 
                }}>
                  Invoice will be marked as PAID
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-4">
          <Label className="trades-label" style={{ color: 'var(--ink)' }}>Payment Method</Label>
          
          <div className="space-y-3">
            {[
              { key: "bank", label: "Bank Transfer", desc: "Direct bank transfer", icon: CreditCard },
              { key: "cash", label: "Cash", desc: "Cash payment", icon: Banknote },
              { key: "other", label: "Other", desc: "Cheque, card, etc.", icon: Smartphone }
            ].map((method) => (
              <button
                key={method.key}
                onClick={() => setPaymentData(prev => ({ ...prev, method: method.key as PaymentMethod }))}
                className="w-full p-4 rounded-xl border text-left transition-all"
                style={{
                  backgroundColor: paymentData.method === method.key ? 'rgba(10, 132, 255, 0.05)' : 'var(--surface)',
                  borderColor: paymentData.method === method.key ? 'var(--primary)' : 'var(--border)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg" 
                       style={{ backgroundColor: 'var(--surface-alt)' }}>
                    <method.icon size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="trades-label" style={{ color: 'var(--ink)' }}>{method.label}</div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>{method.desc}</div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                       style={{ 
                         borderColor: paymentData.method === method.key ? 'var(--primary)' : 'var(--border)',
                         backgroundColor: paymentData.method === method.key ? 'var(--primary)' : 'transparent'
                       }}>
                    {paymentData.method === method.key && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary-foreground)' }} />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Details */}
        <div className="space-y-4">
          <div>
            <Label>Reference (Optional)</Label>
            <Input
              placeholder="e.g. Transfer reference, receipt number"
              value={paymentData.reference}
              onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
            />
          </div>

          {/* Payment Date Section - Calendar Popover */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mb-3">
              <h3 className="trades-label" style={{ color: 'var(--ink)' }}>Payment Date</h3>
              <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                When the payment was received
              </p>
            </div>
            
            {/* Popover with Calendar */}
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <div 
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border" 
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <span className="trades-body" style={{ color: paymentData.date ? 'var(--ink)' : 'var(--muted)' }}>
                    {paymentData.date ? formatDate(paymentData.date) : 'Select payment date'}
                  </span>
                  <Calendar size={20} className="text-blue-600 flex-shrink-0" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <CalendarComponent
                  mode="single"
                  selected={paymentData.date ? new Date(paymentData.date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const formattedDate = date.toISOString().split('T')[0];
                      setPaymentData(prev => ({ ...prev, date: formattedDate }));
                      setIsDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {paymentData.date && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-alt)' }}>
                <div className="flex justify-between items-center">
                  <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                    Payment received:
                  </span>
                  <span className="trades-caption font-medium" style={{ color: 'var(--ink)' }}>
                    {formatDate(paymentData.date)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {paymentData.amount > 0 && (
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="trades-label mb-3" style={{ color: 'var(--ink)' }}>Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="trades-body" style={{ color: 'var(--muted)' }}>Amount</span>
                <span className="trades-body" style={{ color: 'var(--ink)' }}>{formatCurrency(paymentData.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="trades-body" style={{ color: 'var(--muted)' }}>Method</span>
                <span className="trades-body" style={{ color: 'var(--ink)' }}>
                  {paymentData.method.charAt(0).toUpperCase() + paymentData.method.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="trades-body" style={{ color: 'var(--muted)' }}>Date</span>
                <span className="trades-body" style={{ color: 'var(--ink)' }}>
                  {new Date(paymentData.date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              {paymentData.reference && (
                <div className="flex justify-between">
                  <span className="trades-body" style={{ color: 'var(--muted)' }}>Reference</span>
                  <span className="trades-body" style={{ color: 'var(--ink)' }}>{paymentData.reference}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Buttons - Fixed at bottom, floating over content */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <div className="flex gap-3">
          {/* Cancel FAB - Red */}
          <button
            onClick={onBack}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: '#DC2626', 
              color: '#ffffff',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            <span className="trades-body">Cancel</span>
          </button>
          
          {/* Record Payment FAB - Green */}
          <button
            onClick={handleSave}
            disabled={!isValidAmount}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: '#16A34A', 
              color: '#ffffff',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            <span className="trades-body">Record Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
}