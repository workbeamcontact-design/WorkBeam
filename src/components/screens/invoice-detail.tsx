import { ArrowLeft, Share, CheckCircle, Download, Eye, User, Calendar, FileText, DollarSign, Send, Receipt, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

import { Card } from "../ui/card";
import { TemplateRenderer } from "../ui/invoice-templates/template-renderer";
import { A4FitWrapper } from "../ui/a4-fit-wrapper";
import { InvoiceA4Page } from "../ui/invoice-a4-page";
import { InvoiceA4Viewer } from "../ui/invoice-a4-viewer";
import { useBranding } from "../../utils/branding-context";
import { api } from "../../utils/api";
import { generateTemplatePDF } from "../../utils/template-pdf-generator";
import { formatPhoneForWhatsApp } from "../../utils/phone-utils";
import { toast } from "sonner@2.0.3";
import { WhatsAppIcon } from "../ui/whatsapp-icon";
import { AttributionDisplay } from "../ui/attribution-display";

interface InvoiceDetailProps {
  invoice: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface Payment {
  id: string;
  amount: number;
  method: "cash" | "bank" | "other";
  date: string;
  reference?: string;
}

export function InvoiceDetail({ invoice, onNavigate, onBack }: InvoiceDetailProps) {
  const { branding } = useBranding();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [businessData, setBusinessData] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFullSizeViewer, setShowFullSizeViewer] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [originalQuote, setOriginalQuote] = useState<any>(null);
  const [jobData, setJobData] = useState<any>(null);

  // Early return if invoice is null/undefined - don't show error, just gracefully redirect
  if (!invoice) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-muted" />
            </button>
            <h1 className="trades-h1 text-ink">Invoice Detail</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt size={32} className="text-gray-400" />
            </div>
            <p className="trades-body text-ink mb-2">Invoice Not Found</p>
            <p className="trades-caption text-muted mb-6">This invoice may have been deleted or doesn't exist.</p>
            <button
              onClick={onBack}
              className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Enhanced total calculation that handles multiple possible field names
  const invoiceTotal = (() => {
    const possibleTotalFields = [
      invoice?.total, 
      invoice?.amount, 
      invoice?.subtotal, 
      invoice?.finalTotal,
      invoice?.grandTotal
    ];
    
    for (const field of possibleTotalFields) {
      const value = Number(field);
      if (!isNaN(value) && value > 0) {
        return value;
      }
    }
    
    console.error('❌ No valid total found in invoice:', {
      id: invoice.id,
      number: invoice.number,
      total: invoice.total,
      amount: invoice.amount,
      subtotal: invoice.subtotal,
      allFields: Object.keys(invoice)
    });
    
    // Show user-friendly error for corrupted invoices
    setTimeout(() => {
      console.error('This invoice appears to be corrupted with zero totals. This should not happen with the latest fixes.');
    }, 100);
    
    return 0;
  })();
  
  const balance = invoiceTotal - totalPayments;

  // Load business details and bank details on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Log invoice data on load
        console.log('📋 Invoice Detail - Loaded invoice:', {
          id: invoice.id,
          number: invoice.number,
          createdAt: invoice.createdAt,
          hasTemplateData: !!invoice.templateData,
          templateDataKeys: invoice.templateData ? Object.keys(invoice.templateData) : [],
          selectedTemplate: invoice.selectedTemplate,
          status: invoice.status,
          isOlderInvoice: !invoice.templateData ? 'YES (will reconstruct)' : 'NO'
        });
        
        const [business, bank, invoicePayments] = await Promise.all([
          api.getBusinessDetails(),
          api.getBankDetails(),
          api.getInvoicePayments(invoice.id)
        ]);
        setBusinessData(business);
        setBankDetails(bank);
        setPayments(invoicePayments || []);
        
        console.log('💰 Loaded invoice payments:', {
          invoiceId: invoice.id,
          paymentCount: invoicePayments?.length || 0,
          totalPaid: invoicePayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
        });

        // Use client data from invoice context if available (from payment status buttons)
        if (invoice?.client && typeof invoice.client === 'object') {
          console.log('✅ Using client data from invoice context:', invoice.client);
          setClientData(invoice.client);
        }
        // Otherwise try to load client data from API
        else if (invoice?.clientId) {
          try {
            const client = await api.getClient(invoice.clientId);
            if (client) {
              console.log('✅ Client loaded for invoice detail:', {
                id: client.id,
                name: client.name,
                address: client.address
              });
              setClientData(client);
            }
          } catch (clientError) {
            console.error('❌ Failed to load client data:', clientError);
          }
        }

        // Load job data if available to get detailed line items
        if (invoice?.jobId) {
          try {
            const job = await api.getJob(invoice.jobId);
            if (job) {
              console.log('✅ Job loaded for invoice detail:', {
                id: job.id,
                title: job.title,
                materials: job.materials?.length || 0,
                labour: job.labour?.length || 0
              });
              setJobData(job);

              // If job has an original quote, load that too for detailed line items
              if (job.originalQuoteId || job.quoteId) {
                try {
                  const quoteId = job.originalQuoteId || job.quoteId;
                  const quote = await api.getQuote(quoteId);
                  if (quote) {
                    console.log('✅ Original quote loaded for invoice detail:', {
                      number: quote.number,
                      lineItems: quote.lineItems?.length || 0
                    });
                    setOriginalQuote(quote);
                  }
                } catch (quoteError) {
                  console.error('❌ Failed to load original quote:', quoteError);
                }
              }
            }
          } catch (jobError: any) {
            const errorStatus = jobError?.status || jobError?.response?.status;
            if (errorStatus === 404) {
              console.warn('⚠️ Job not found (404) - job may have been deleted:', {
                jobId: invoice.jobId,
                invoiceId: invoice.id
              });
              // Continue gracefully - invoice can still be viewed without job data
            } else {
              console.error('❌ Failed to load job data:', jobError);
            }
          }
        }
      } catch (error) {
        // Silently handle errors - invoice will use defaults
        // Only log in development mode for debugging
        if (process.env.NODE_ENV === 'development') {
          console.debug('Invoice data loading error (using defaults):', error);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [invoice]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return { bg: "rgba(107, 114, 128, 0.1)", text: "var(--muted)" };
      case "sent":
        return { bg: "rgba(10, 132, 255, 0.1)", text: "var(--primary)" };
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

  const statusColor = getStatusColor(invoice?.status || 'draft');

  const formatCurrency = useCallback((amount: number | undefined | null) => {
    // Handle invalid amounts gracefully
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return '£0.00';
    }
    
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(Number(amount));
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Memoized template data to prevent expensive recalculations
  const templateData = useMemo(() => {
    if (loading) {
      return null;
    }

    // CRITICAL: Always use stored templateData if it exists (preserves original invoice)
    if (invoice?.templateData) {
      console.log('✅ Using stored templateData from original invoice:', {
        invoiceNumber: invoice.templateData.invoice_number,
        lineItemsCount: invoice.templateData.line_items?.length,
        hasAllData: !!(invoice.templateData.business && invoice.templateData.client),
        hasPayments: !!payments && payments.length > 0
      });
      // Add payments to templateData if they exist
      return {
        ...invoice.templateData,
        payments: payments.length > 0 ? payments : undefined
      };
    }
    
    // NOTE: This is expected for older invoices created before templateData was implemented
    console.log('ℹ️ No templateData found (older invoice), reconstructing from invoice data:', {
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.number,
      hasJob: !!invoice?.jobId,
      hasClient: !!invoice?.clientId
    });

    // Format business address properly
    let businessAddress = '123 Trade Street, Manchester, M1 1AA';
    if (businessData?.registeredAddress) {
      const address = businessData.tradingAddressDifferent 
        ? businessData.tradingAddress 
        : businessData.registeredAddress;
        
      if (address) {
        const parts = [
          address.line1,
          address.line2,
          address.city,
          address.postcode,
          address.country !== 'United Kingdom' ? address.country : ''
        ].filter(Boolean);
        
        businessAddress = parts.join(', ');
      }
    }

    // Format business phone properly
    let businessPhone = '0161 123 4567';
    if (businessData?.phoneCountryCode && businessData?.phoneNumber) {
      businessPhone = `${businessData.phoneCountryCode} ${businessData.phoneNumber}`;
    }

    // Format client address properly
    let clientAddress = '';
    if (clientData?.address) {
      clientAddress = clientData.address;
    } else if (typeof clientData === 'object' && clientData !== null) {
      // Try to construct address from client object
      const addressParts = [
        clientData.line1,
        clientData.line2,
        clientData.city,
        clientData.postcode,
        clientData.country !== 'United Kingdom' ? clientData.country : ''
      ].filter(Boolean);
      clientAddress = addressParts.join(', ');
    }

    // Use actual line items if available, otherwise create from invoice data
    let lineItems = [];
    
    // First priority: Check if invoice has templateData with line_items (new invoice format)
    if (invoice?.templateData?.line_items && invoice.templateData.line_items.length > 0) {
      lineItems = invoice.templateData.line_items;
    } 
    // Second priority: Check if invoice has direct lineItems property
    else if (invoice?.lineItems && invoice.lineItems.length > 0) {
      lineItems = invoice.lineItems.map((item: any, index: number) => ({
        id: item.id || `item-${index}`,
        description: item.description,
        quantity: item.qty || item.quantity || 1,
        rate: item.price || item.rate || 0,
        amount: item.total || item.amount || ((item.qty || item.quantity || 1) * (item.price || item.rate || 0))
      }));
    }
    // Third priority: Use original quote line items if available
    else if (originalQuote?.lineItems && originalQuote.lineItems.length > 0) {
      lineItems = originalQuote.lineItems.map((item: any, index: number) => ({
        id: item.id || `quote-item-${index}`,
        description: item.description,
        quantity: item.qty || item.quantity || 1,
        rate: item.price || item.rate || 0,
        amount: item.total || item.amount || ((item.qty || item.quantity || 1) * (item.price || item.rate || 0))
      }));
    }
    // Fourth priority: Generate from job materials and labour
    else if (jobData && (jobData.materials?.length > 0 || jobData.labour?.length > 0)) {
      // Add materials
      if (jobData.materials) {
        jobData.materials.forEach((material: any, index: number) => {
          lineItems.push({
            id: `material-${index}`,
            description: material.name || material.description || 'Material',
            quantity: material.quantity || material.qty || 1,
            rate: material.rate || material.price || 0,
            amount: material.total || ((material.quantity || material.qty || 1) * (material.rate || material.price || 0))
          });
        });
      }
      
      // Add labour
      if (jobData.labour) {
        jobData.labour.forEach((labour: any, index: number) => {
          lineItems.push({
            id: `labour-${index}`,
            description: labour.name || labour.description || 'Labour',
            quantity: labour.hours || labour.qty || 1,
            rate: labour.rate || labour.price || 0,
            amount: labour.total || ((labour.hours || labour.qty || 1) * (labour.rate || labour.price || 0))
          });
        });
      }
    }
    // Fifth priority: Try to reconstruct from invoice properties if it's a simple invoice
    else if (invoice?.job && invoice?.subtotal) {
      // Check if this looks like a deposit invoice
      if (invoice.job.toLowerCase().includes('deposit')) {
        lineItems = [
          {
            id: '1',
            description: invoice.job,
            quantity: 1,
            rate: invoice.subtotal,
            amount: invoice.subtotal
          }
        ];
      }
      // Check if this is a specific work description
      else if (!invoice.job.toLowerCase().includes('job')) {
        lineItems = [
          {
            id: '1',
            description: invoice.job,
            quantity: 1,
            rate: invoice.subtotal,
            amount: invoice.subtotal
          }
        ];
      }
      // Generic fallback with better description
      else {
        lineItems = [
          {
            id: '1',
            description: `${invoice.job || 'Completed work'}`,
            quantity: 1,
            rate: invoice.subtotal,
            amount: invoice.subtotal
          }
        ];
      }
    }
    // Final fallback: Create a generic line item
    else {
      lineItems = [
        {
          id: '1',
          description: 'Professional services',
          quantity: 1,
          rate: invoice?.subtotal || invoice?.total || 0,
          amount: invoice?.subtotal || invoice?.total || 0
        }
      ];
    }

    // Generate template data from legacy invoice
    return {
      id: invoice?.id || 'draft',
      invoice_number: invoice?.number || 'DRAFT',
      issue_date: invoice?.issueDate,
      due_date: invoice?.dueDate,
      status: invoice?.status,
      client: {
        id: clientData?.id || invoice?.clientId || 'unknown',
        name: clientData?.name || invoice?.client || 'Unknown Client',
        email: clientData?.email || '',
        phone: clientData?.phone || '',
        address: clientAddress
      },
      business: {
        name: branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business',
        address: businessAddress,
        phone: businessPhone,
        email: businessData?.email || 'info@yourbusiness.co.uk'
      },
      line_items: lineItems,
      subtotal: invoice?.subtotal,
      vat_amount: invoice?.vatEnabled ? invoice?.vatAmount : undefined,
      total: invoice?.total,
      payment_terms: invoice?.paymentTerms,
      notes: invoice?.notes,
      payments: payments.length > 0 ? payments : undefined
    };
  }, [
    loading,
    invoice,
    businessData,
    clientData,
    originalQuote,
    jobData,
    branding?.business_name,
    payments
  ]);

  const handleResend = useCallback(async () => {
    try {
      if (!templateData) {
        toast.error('Invoice data not loaded yet');
        return;
      }
      
      console.log('📤 Resending invoice with templateData:', {
        invoiceNumber: templateData.invoice_number,
        lineItems: templateData.line_items?.length,
        total: templateData.total,
        hasStoredData: !!invoice?.templateData
      });
      
      const selectedTemplate = invoice?.selectedTemplate || branding?.selected_template || 'classic';
      
      // Generate PDF using template system
      const pdfBlob = await generateTemplatePDF(
        selectedTemplate,
        templateData,
        'invoice',
        branding,
        bankDetails
      );

      // Create download link with "Resent" suffix
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateData.invoice_number} - Resent.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Open WhatsApp with pre-filled message
      let clientPhone = clientData?.phone;
      if (!clientPhone) {
        toast.error('Client phone number not available');
        return;
      }

      // Format phone for WhatsApp
      if (!clientPhone.startsWith('+')) {
        clientPhone = '+44' + clientPhone.replace(/^0/, ''); // UK default
      }

      const businessName = branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business';
      
      // Check if there are any payments
      const hasPayments = payments && payments.length > 0;
      const totalPaid = hasPayments ? payments.reduce((sum, p) => sum + p.amount, 0) : 0;
      const balanceDue = (templateData.total || 0) - totalPaid;
      
      // Helper to format payment method for WhatsApp
      const formatPaymentMethodForMessage = (method: string) => {
        const methodMap: { [key: string]: string } = {
          'bank': 'Bank Transfer',
          'cash': 'Cash',
          'other': 'Other'
        };
        return methodMap[method.toLowerCase()] || method.charAt(0).toUpperCase() + method.slice(1);
      };
      
      // Create message based on payment status
      let whatsappMessage = '';
      
      if (hasPayments && balanceDue > 0) {
        // Partial payment scenario
        whatsappMessage = `Hi ${templateData.client.name.split(' ')[0]},

I'm sending you an updated invoice reflecting your recent payment${payments.length > 1 ? 's' : ''}.

*INVOICE DETAILS*
Invoice Number: ${templateData.invoice_number}
Issue Date: ${formatDate(templateData.issue_date)}

*PAYMENT UPDATE*
Original Amount: ${formatCurrency(templateData.total)}
Total Paid: ${formatCurrency(totalPaid)}
${payments.length === 1 ? `(${formatDate(payments[0].date)} - ${formatPaymentMethodForMessage(payments[0].method)})` : `(${payments.length} payments received)`}

*BALANCE DUE*
${formatCurrency(balanceDue)}

*DUE DATE*
${formatDate(templateData.due_date)}

────────────────

Thank you for your payment${payments.length > 1 ? 's' : ''}! Please see the attached invoice PDF for full details.

${businessName}`;
      } else if (hasPayments && balanceDue <= 0) {
        // Fully paid scenario
        whatsappMessage = `Hi ${templateData.client.name.split(' ')[0]},

Thank you for your payment! Here's your final invoice showing payment received.

*INVOICE DETAILS*
Invoice Number: ${templateData.invoice_number}
Issue Date: ${formatDate(templateData.issue_date)}

*PAID IN FULL*
Amount: ${formatCurrency(templateData.total)}
${payments.length === 1 ? `Paid on: ${formatDate(payments[0].date)}` : `${payments.length} payments received`}

────────────────

Please see the attached invoice PDF for your records.

Thank you for your business!

${businessName}`;
      } else {
        // No payments - standard invoice
        whatsappMessage = `Hi ${templateData.client.name.split(' ')[0]},

I'm resending your invoice for your recent work.

*INVOICE DETAILS*
Invoice Number: ${templateData.invoice_number}
Issue Date: ${formatDate(templateData.issue_date)}

*TOTAL AMOUNT*
${formatCurrency(templateData.total)}

*DUE DATE*
${formatDate(templateData.due_date)}

────────────────

Please see the attached invoice PDF for full details.

Thank you for your business!

${businessName}`;
      }

      const whatsappUrl = `https://wa.me/${formatPhoneForWhatsApp(clientPhone, '+44')}?text=${encodeURIComponent(whatsappMessage)}`;
      
      // Small delay to allow download to start
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);
      
      // Update status if it was draft
      if (invoice?.status === 'draft') {
        invoice.status = "sent";
        invoice.sentAt = new Date().toISOString();
      }
      
      toast.success('Invoice sent via WhatsApp!');
    } catch (error) {
      console.error('Failed to resend invoice:', error);
      toast.error('Failed to generate invoice PDF');
    }
  }, [templateData, branding, bankDetails, clientData, formatDate, formatCurrency, invoice?.selectedTemplate, invoice?.status, businessData?.companyName, businessData?.company_name, payments]);

  const handleDownloadPDF = useCallback(async () => {
    try {
      if (!templateData) {
        toast.error('Invoice data not loaded yet');
        return;
      }
      
      const selectedTemplate = invoice?.selectedTemplate || branding?.selected_template || 'classic';
      
      const pdfBlob = await generateTemplatePDF(
        selectedTemplate,
        templateData,
        'invoice',
        branding,
        bankDetails
      );

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateData.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Invoice PDF downloaded!');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download invoice PDF');
    }
  }, [templateData, branding, bankDetails, invoice?.selectedTemplate]);

  const handleRecordPayment = useCallback(() => {
    // Guard: Don't navigate if invoice is null
    if (!invoice) {
      console.error('❌ Cannot record payment: invoice is null');
      toast.error('Invoice data not available');
      return;
    }
    onNavigate("record-payment", invoice);
  }, [onNavigate, invoice]);

  const handleMarkPaid = useCallback(() => {
    // Guard: Don't navigate if invoice is null
    if (!invoice) {
      console.error('❌ Cannot mark as paid: invoice is null');
      toast.error('Invoice data not available');
      return;
    }
    
    // Navigate to record payment screen with the full outstanding balance pre-filled
    // This ensures payment is recorded properly through the API and all financial sections update
    console.log('💰 Opening record payment screen to mark invoice as paid:', {
      invoiceId: invoice.id,
      outstandingBalance: balance
    });
    
    // Pass invoice data to record payment screen
    // The record payment screen will show the full balance and allow user to confirm
    onNavigate("record-payment", {
      ...invoice,
      // Pre-fill with full balance amount so user can just click "Record Payment"
      suggestedAmount: balance
    });
  }, [invoice, balance, onNavigate]);

  const canEdit = invoice.status === "draft";

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-muted" />
            </button>
            <h1 className="trades-h1 text-ink">Invoice Detail</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="trades-body text-muted">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-5 shadow-sm">
        <div className="flex items-start gap-4 mb-5">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] mt-1"
          >
            <ArrowLeft size={20} className="text-muted" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="trades-h1 text-ink font-semibold">
                {invoice?.number || "Draft Invoice"}
              </h1>
              <Badge 
                className="shrink-0"
                style={{ 
                  backgroundColor: statusColor.bg, 
                  color: statusColor.text,
                  textTransform: 'capitalize',
                  fontWeight: '500'
                }}
              >
                {invoice?.status === 'part-paid' ? 'Partial' : (invoice?.status || 'draft')}
              </Badge>
            </div>
          </div>
        </div>
        

      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 pb-24">
          {/* Payment Status Hero Card */}
          {balance > 0 && invoice?.status !== 'paid' ? (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Receipt size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="trades-caption text-white/80 mb-1">Payment Outstanding</div>
                    <div className="trades-h1 text-white font-semibold">{formatCurrency(balance)}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={14} className="text-white/80" />
                <span className="trades-caption text-white/90">Due {formatDate(invoice.dueDate)}</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between trades-caption text-white/90">
                  <span>Paid: {formatCurrency(totalPayments)}</span>
                  <span>{totalPayments > 0 ? Math.round((totalPayments / invoiceTotal) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${totalPayments > 0 ? (totalPayments / invoiceTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ) : invoice?.status === 'paid' ? (
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <CheckCircle size={24} className="text-white" />
                </div>
                <div>
                  <div className="trades-caption text-white/80 mb-1">Invoice Paid</div>
                  <div className="trades-h1 text-white font-semibold">{formatCurrency(invoiceTotal)}</div>
                </div>
              </div>
              {invoice?.paidAt && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-white/80" />
                  <span className="trades-caption text-white/90">Paid on {formatDate(invoice.paidAt)}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleResend}
              className="bg-primary text-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center gap-3"
              style={{ minHeight: '64px' }}
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Send size={20} />
              </div>
              <div className="flex-1 text-left">
                <div className="trades-label text-white font-medium">Resend Invoice</div>
                <div className="trades-caption text-white/80">Via WhatsApp</div>
              </div>
            </button>

            {invoice?.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center gap-3"
                style={{ minHeight: '64px' }}
              >
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="trades-label text-ink font-medium">Mark Paid</div>
                  <div className="trades-caption text-muted">Record full payment</div>
                </div>
              </button>
            )}

            {invoice?.status === 'paid' && (
              <button
                onClick={handleDownloadPDF}
                className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 flex items-center gap-3"
                style={{ minHeight: '64px' }}
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Download size={20} className="text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="trades-label text-ink font-medium">Download</div>
                  <div className="trades-caption text-muted">Save as PDF</div>
                </div>
              </button>
            )}
          </div>

          {/* Invoice Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="trades-label text-ink font-medium">Invoice Details</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Client Info */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="trades-caption text-muted mb-0.5">Client</div>
                  <div className="trades-body text-ink font-medium">{clientData?.name || invoice?.client || 'Unknown'}</div>
                  {clientData?.email && (
                    <div className="trades-caption text-muted mt-0.5">{clientData.email}</div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-muted" />
                  </div>
                  <div>
                    <div className="trades-caption text-muted">Issued</div>
                    <div className="trades-label text-ink">{invoice?.issueDate ? formatDate(invoice.issueDate) : 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={16} className="text-muted" />
                  </div>
                  <div>
                    <div className="trades-caption text-muted">Due</div>
                    <div className="trades-label text-ink">{invoice?.dueDate ? formatDate(invoice.dueDate) : 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {templateData?.line_items && templateData.line_items.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-muted" />
                    <span className="trades-caption text-muted">{templateData.line_items.length} line item{templateData.line_items.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="trades-label text-muted">Subtotal</span>
                  <span className="trades-body text-ink">{formatCurrency(invoice?.subtotal)}</span>
                </div>
                
                {invoice?.vatEnabled && invoice?.vatAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="trades-label text-muted">VAT (20%)</span>
                    <span className="trades-body text-ink">{formatCurrency(invoice.vatAmount)}</span>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="trades-body text-ink font-medium">Total</span>
                  <span className="trades-h2 text-ink font-semibold">{formatCurrency(invoiceTotal)}</span>
                </div>
              </div>

              {/* Multi-user attribution (Phase 4b) */}
              <AttributionDisplay
                createdByName={invoice?.created_by_name}
                createdAt={invoice?.created_at}
                updatedByName={invoice?.updated_by_name}
                updatedAt={invoice?.updated_at}
                className="pt-3 border-t border-gray-100"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="trades-label text-ink font-medium">Quick Actions</h3>
            </div>
            
            <div className="p-3 space-y-2">
              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-98"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Download size={18} className="text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="trades-body text-ink font-medium">Download PDF</div>
                  <div className="trades-caption text-muted">Save invoice to device</div>
                </div>
              </button>

              <button
                onClick={() => setShowFullSizeViewer(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-98"
              >
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Eye size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="trades-body text-ink font-medium">Preview Invoice</div>
                  <div className="trades-caption text-muted">View full-size PDF</div>
                </div>
              </button>

              <button
                onClick={() => {
                  if (clientData) {
                    onNavigate("client-detail", clientData);
                  } else {
                    toast.error("Client information not available");
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-98"
              >
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <User size={18} className="text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="trades-body text-ink font-medium">View Client</div>
                  <div className="trades-caption text-muted">See client details</div>
                </div>
              </button>

              {invoice?.status !== 'paid' && (
                <button
                  onClick={handleRecordPayment}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors active:scale-98"
                >
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                    <DollarSign size={18} className="text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="trades-body text-ink font-medium">Record Payment</div>
                    <div className="trades-caption text-muted">Track partial payment</div>
                  </div>
                </button>
              )}
            </div>
          </div>



          {/* Payment History */}
          {payments.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="trades-h2 text-ink mb-4">Payment History</h3>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <div className="trades-body text-ink font-medium mb-1">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="trades-caption text-muted">
                        {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)} • {formatDate(payment.date)}
                        {payment.reference && ` • ${payment.reference}`}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Received
                    </Badge>
                  </div>
                ))}
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="trades-label text-muted">Total Payments:</span>
                    <span className="trades-body text-ink font-medium">{formatCurrency(totalPayments)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="trades-label text-muted">Remaining Balance:</span>
                    <span className="trades-body text-ink font-medium">{formatCurrency(balance)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* Bottom spacing for scroll */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Full-size A4 Invoice Viewer */}
      <InvoiceA4Viewer
        isOpen={showFullSizeViewer}
        onClose={() => setShowFullSizeViewer(false)}
        title={`Invoice ${invoice.number || 'Draft'}`}
        onExport={handleDownloadPDF}
        onShare={handleResend}
      >
        {templateData && (
          <div className="pdf-optimized">
            <TemplateRenderer
              templateId={invoice.selectedTemplate || branding.selected_template || 'classic'}
              document={templateData}
              documentType="invoice"
              branding={branding}
              logoPosition={branding.invoice_logo_position || 'left'}
              preview={true}
              bankDetails={bankDetails}
            />
          </div>
        )}
      </InvoiceA4Viewer>
    </div>
  );
}