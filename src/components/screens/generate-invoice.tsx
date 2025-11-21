import { ChevronLeft, Check, Calculator, FileText, Send, Eye, Calendar, Receipt } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { TemplateRenderer } from "../ui/invoice-templates/template-renderer";
import { InvoicePreviewCard } from "../ui/invoice-preview-card";
import { A4FitWrapper } from "../ui/a4-fit-wrapper";
import { InvoiceA4Page } from "../ui/invoice-a4-page";
import { InvoiceA4Viewer } from "../ui/invoice-a4-viewer";
import { useBranding } from "../../utils/branding-context";
import { api } from "../../utils/api";
import { toast } from "sonner@2.0.3";
import { downloadTemplatePDF, downloadInvoiceWithTemplateAndOpenWhatsApp } from "../../utils/template-pdf-generator";
import { formatPhoneForWhatsApp } from "../../utils/phone-utils";
import { invoiceSchema, validate, formatValidationErrors } from "../../utils/validation.tsx";
import { sanitizeCurrency, sanitizeText } from "../../utils/sanitization";
import { 
  generateDocumentNumber, 
  getNextSequenceNumber, 
  generateFileName, 
  formatClientName,
  formatJobTitle 
} from "../../utils/document-naming";
import { formatCurrencyInput } from "../../utils/currency-input";

interface GenerateInvoiceProps {
  job: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

type BillType = "deposit" | "remaining" | "full";

interface LineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  type: "labour" | "materials";
  totalAmount: number;
  billedAmount: number;
  remainingAmount: number;
}



interface InvoiceData {
  billType: BillType;
  depositAmount?: number;
  depositType?: "percentage" | "fixed";
  // VAT settings removed - they come from job/quote only, never added during invoicing
  dueDate: string;
  termsAndConditions: string;
}

export function GenerateInvoice({ job, onNavigate, onBack }: GenerateInvoiceProps) {
  const { branding } = useBranding();
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [originalQuote, setOriginalQuote] = useState<any>(null);
  const [jobLineItems, setJobLineItems] = useState<LineItem[]>([]);
  const [showFullSizeViewer, setShowFullSizeViewer] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [previousInvoicesTotal, setPreviousInvoicesTotal] = useState<number>(0);
  const [existingInvoices, setExistingInvoices] = useState<any[]>([]);
  const [hasDepositInvoice, setHasDepositInvoice] = useState<boolean>(false);
  const [hasFullInvoice, setHasFullInvoice] = useState<boolean>(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);
  
  // CRITICAL: Validate job data on mount - only log once
  useEffect(() => {
    if (!job) {
      console.error('❌ CRITICAL: No job data provided to GenerateInvoice');
      toast.error('No job data available', {
        description: 'Returning to previous screen...'
      });
      setTimeout(() => onBack(), 1000);
    } else {
      console.log('✅ Job data received:', {
        id: job.id,
        title: job.title,
        estimatedValue: job.estimatedValue,
        value: job.value,
        total: job.total,
        subtotal: job.subtotal,
        hasQuoteId: !!(job.originalQuoteId || job.quoteId),
        allFields: Object.keys(job)
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Early return if no job
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
        <h2 className="trades-h2 text-gray-900 mb-4">No Job Data</h2>
        <p className="trades-body text-gray-600 mb-6">
          Unable to generate invoice without job data.
        </p>
      </div>
    );
  }
  
  // Helper function to generate professional terms and conditions based on invoice type
  const getDefaultTermsAndConditions = (billType: BillType): string => {
    switch (billType) {
      case "deposit":
        return "Payment is due within 14 days of the invoice date. Work will commence upon receipt of this deposit payment.";
      case "remaining":
        return "Payment is due within 14 days of the invoice date. This represents the final payment for the completed project work.";
      case "full":
        return "Payment is due within 14 days of the invoice date. This invoice covers the complete project as agreed.";
      default:
        return "Payment is due within 14 days of the invoice date.";
    }
  };
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    billType: "deposit",
    depositType: "percentage",
    depositAmount: 20, // Default 20% deposit
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    termsAndConditions: getDefaultTermsAndConditions("deposit")
  });

  // Autosave configuration
  const formData = useMemo(() => ({
    invoiceData,
    invoiceNumber
  }), [invoiceData, invoiceNumber]);

  const autosave = useAutosave(formData, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only
      console.log('Invoice draft saved');
    },
    storageKey: `generate-invoice-draft-${job?.id || 'new'}`,
    enabled: currentStep > 1 // Only save after step 1
  });

  // Format currency helper function
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

  // Get total of previous invoices for this job
  const getPreviousInvoicesTotal = async (): Promise<number> => {
    try {
      if (!job?.id) {
        console.warn('⚠️ No job ID available for previous invoices check. Job data:', {
          hasJob: !!job,
          jobKeys: job ? Object.keys(job) : []
        });
        return 0;
      }
      
      const allInvoices = await api.getInvoices();
      const jobInvoices = allInvoices?.filter(invoice => 
        invoice.jobId === job.id && invoice.status !== 'draft'
      ) || [];
      
      const total = jobInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
      console.log(`💼 Previous invoices for job ${job.id}:`, {
        count: jobInvoices.length,
        total: formatCurrency(total),
        invoices: jobInvoices.map(inv => ({ number: inv.number, total: formatCurrency(inv.total || 0) }))
      });
      
      return total;
    } catch (error) {
      console.error('Failed to get previous invoices:', error);
      return 0;
    }
  };

  // Load business details and job data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [business, bank] = await Promise.all([
          api.getBusinessDetails(),
          api.getBankDetails()
        ]);
        setBusinessData(business);
        // Only set bank details if show_on_invoice is enabled
        setBankDetails(bank?.show_on_invoice ? bank : null);

        // Generate proper sequential invoice number using unified naming system
        try {
          const existingInvoices = await api.getInvoices();
          const currentYear = new Date().getFullYear();
          const nextSequence = getNextSequenceNumber(existingInvoices || [], 'invoice', currentYear);
          const newInvoiceNumber = generateDocumentNumber('invoice', { 
            year: currentYear, 
            sequence: nextSequence 
          });
          setInvoiceNumber(newInvoiceNumber);
          console.log('📧 Generated sequential invoice number:', newInvoiceNumber, `(sequence ${nextSequence} for ${currentYear})`);
        } catch (invoiceError) {
          console.error('Failed to get invoice count, using fallback:', invoiceError);
          // Fallback to first invoice of current year
          const fallbackNumber = generateDocumentNumber('invoice', { 
            year: new Date().getFullYear(), 
            sequence: 1 
          });
          setInvoiceNumber(fallbackNumber);
          console.log('📧 Using fallback invoice number:', fallbackNumber);
        }

        console.log('🔍 Invoice Generation - Job data received:', {
          id: job?.id,
          title: job?.title,
          estimatedValue: job?.estimatedValue,
          value: job?.value,
          total: job?.total,
          clientId: job?.clientId,
          client: job?.client,
          materials: job?.materials?.length || 0,
          labour: job?.labour?.length || 0,
          originalQuoteId: job?.originalQuoteId,
          quoteId: job?.quoteId,
          allFields: Object.keys(job || {})
        });

        // Load previous invoices total for this job and detect invoice types
        try {
          if (job?.id) {
            const allInvoices = await api.getInvoices();
            const jobInvoices = allInvoices?.filter(invoice => 
              invoice.jobId === job.id && invoice.status !== 'draft'
            ) || [];
            
            setExistingInvoices(jobInvoices);
            
            // Detect invoice types
            const hasDeposit = jobInvoices.some(inv => inv.billType === 'deposit' || inv.is_deposit_invoice);
            const hasFull = jobInvoices.some(inv => inv.billType === 'full');
            
            setHasDepositInvoice(hasDeposit);
            setHasFullInvoice(hasFull);
            
            const previousTotal = jobInvoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
            setPreviousInvoicesTotal(previousTotal);
            
            console.log('📊 Invoice Analysis:', {
              totalInvoices: jobInvoices.length,
              hasDeposit,
              hasFull,
              previousTotal: formatCurrency(previousTotal),
              invoices: jobInvoices.map(inv => ({
                number: inv.invoice_number || inv.number,
                type: inv.billType,
                total: formatCurrency(inv.total || 0)
              }))
            });
            
            // Smart default selection based on existing invoices
            if (hasDeposit && !hasFull) {
              // If deposit exists, default to remaining balance
              setInvoiceData(prev => ({
                ...prev,
                billType: 'remaining',
                termsAndConditions: getDefaultTermsAndConditions('remaining')
              }));
              console.log('✅ Auto-selected: Remaining Balance (deposit already exists)');
            } else if (!hasDeposit && !hasFull) {
              // First invoice - default to deposit
              setInvoiceData(prev => ({
                ...prev,
                billType: 'deposit',
                termsAndConditions: getDefaultTermsAndConditions('deposit')
              }));
              console.log('✅ Auto-selected: Deposit (first invoice)');
            }
          }
        } catch (error) {
          console.error('Failed to load previous invoices:', error);
        }

        // Load client data
        if (job?.clientId) {
          try {
            const client = await api.getClient(job.clientId);
            if (client) {
              console.log('✅ Client loaded for invoicing:', {
                id: client.id,
                name: client.name,
                address: client.address
              });
              setClientData(client);
            }
          } catch (clientError) {
            console.error('❌ Failed to load client data:', clientError);
            // Use fallback client data from job
            setClientData(job.client);
          }
        } else if (job?.client) {
          // Use client data from job object
          setClientData(job.client);
        }

        // Load original quote if job was converted from a quote
        if (job?.originalQuoteId || job?.quoteId) {
          try {
            const quoteId = job.originalQuoteId || job.quoteId;
            console.log('🔄 Loading original quote for invoice generation:', quoteId);
            
            // VALIDATION: Ensure quote ID is valid before making API call
            if (!quoteId || typeof quoteId !== 'string' || quoteId.trim() === '') {
              console.warn('⚠️ Invalid quote ID format, skipping quote loading:', { 
                quoteId, 
                type: typeof quoteId,
                jobId: job.id 
              });
              throw new Error('Invalid quote ID format');
            }
            
            const quote = await api.getQuote(quoteId);
            if (quote) {
              console.log('✅ Original quote loaded for invoicing:', {
                number: quote.number,
                total: quote.total,
                lineItems: quote.lineItems?.length || 0,
                vatEnabled: quote.vatEnabled,
                vatRate: quote.vatRate || 20
              });
              setOriginalQuote(quote);
              
              // Convert quote line items to job line items format
              const convertedItems: LineItem[] = quote.lineItems?.map((item: any, index: number) => ({
                id: item.id || `quote-item-${index}`,
                description: item.description,
                qty: item.qty || item.quantity || 1,
                unitPrice: item.price || item.rate || 0,
                type: item.type || "materials",
                totalAmount: item.total || item.amount || ((item.qty || 1) * (item.price || 0)),
                billedAmount: 0, // No previous billing
                remainingAmount: item.total || item.amount || ((item.qty || 1) * (item.price || 0))
              })) || [];
              
              console.log('📋 Converted quote items to job line items:', convertedItems.length, 'items');
              setJobLineItems(convertedItems);
            } else {
              console.log('ℹ️ Quote not found - using job data instead (quote may have been deleted):', quoteId);
              // Fallback to job materials and labour
              setJobLineItems(generateJobLineItemsFromJob());
            }
          } catch (quoteError: any) {
            // ENHANCED ERROR HANDLING: Better error categorization and user feedback
            const errorMessage = quoteError?.message || 'Unknown error';
            const errorStatus = quoteError?.status || quoteError?.response?.status;
            
            if (errorStatus === 404) {
              console.log('ℹ️ Quote not found (quote may have been deleted) - using job data instead:', {
                quoteId: job.originalQuoteId || job.quoteId,
                jobId: job.id,
                jobTitle: job.title
              });
              
              // For 404 errors, silently fall back without showing error to user
              // This is expected behavior when quotes are cleaned up
            } else {
              console.error('❌ Error loading original quote for invoicing:', {
                error: errorMessage,
                status: errorStatus,
                quoteId: job.originalQuoteId || job.quoteId,
                jobId: job.id
              });
              
              // Only show error toast for unexpected errors (not 404)
              if (errorStatus !== 404) {
                console.warn('Non-404 quote loading error - continuing with job data');
              }
            }
            
            // Always fallback to job materials and labour
            console.log('🔄 Using job materials and labour for invoice');
            setJobLineItems(generateJobLineItemsFromJob());
          }
        } else {
          console.log('💼 No original quote ID found, using job data directly');
          // No original quote, use job materials and labour
          setJobLineItems(generateJobLineItemsFromJob());
          
          // CRITICAL FIX: Auto-configure VAT settings from standalone job data
          // For standalone jobs (NOT created from quotes)
          if (job?.vatEnabled === true) {
            console.log('🔧 Auto-configuring VAT from standalone job (VAT was ENABLED):', {
              vatEnabled: true,
              vatRate: job.vatRate || 20,
              action: 'Locking VAT settings - amounts already include VAT'
            });
            
            // Job had VAT enabled - amounts already include VAT
            // Disable VAT on invoice to prevent double charging
            setInvoiceData(prev => ({
              ...prev,
              vatEnabled: false, // Disable to prevent double charging
              vatRate: job.vatRate || 20
            }));
          } else if (job?.vatEnabled === false) {
            console.log('🔧 Job had VAT DISABLED - allowing user to add VAT on invoice:', {
              vatEnabled: false,
              action: 'User can toggle VAT on invoice'
            });
            
            // Job had NO VAT - allow user to add VAT on invoice
            setInvoiceData(prev => ({
              ...prev,
              vatEnabled: true, // Default to enabled, user can toggle
              vatRate: 20 // Default UK VAT rate
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load invoice data:', error);
        toast.error('Failed to load invoice settings');
        // Fallback to job data
        setJobLineItems(generateJobLineItemsFromJob());
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [job]);

  // Handler for bill type changes with guaranteed terms update
  const handleBillTypeChange = (newBillType: BillType) => {
    console.log(`🔄 Bill type changed to: ${newBillType}`);
    setInvoiceData(prev => {
      // Check if current terms are still default (not user-customized)
      const isDefaultTerm = 
        prev.termsAndConditions.includes("Payment is due within 14 days of the invoice date") ||
        prev.termsAndConditions.includes("Due in 14 days") ||
        prev.termsAndConditions.includes("Payment of this deposit invoice");
      
      return {
        ...prev,
        billType: newBillType,
        // Always update terms for default terms, or when switching to deposit
        termsAndConditions: (isDefaultTerm || newBillType === "deposit") 
          ? getDefaultTermsAndConditions(newBillType)
          : prev.termsAndConditions
      };
    });
  };

  // Update terms and conditions when bill type changes (backup for direct state updates)
  useEffect(() => {
    // Only update if the current terms match a default pattern (not user-customized)
    const isDefaultTerm = 
      invoiceData.termsAndConditions.includes("Payment is due within 14 days of the invoice date") ||
      invoiceData.termsAndConditions.includes("Due in 14 days") ||
      invoiceData.termsAndConditions.includes("Payment of this deposit invoice");
    
    // Always update terms when bill type changes if it's still a default term
    // This ensures deposit invoices get the correct terms
    if (isDefaultTerm) {
      console.log(`🔄 useEffect: Updating terms for bill type: ${invoiceData.billType}`);
      setInvoiceData(prev => ({
        ...prev,
        termsAndConditions: getDefaultTermsAndConditions(prev.billType)
      }));
    }
  }, [invoiceData.billType]);

  // Generate line items from job materials and labour
  const generateJobLineItemsFromJob = (): LineItem[] => {
    const items: LineItem[] = [];
    
    console.log('🔧 Generating job line items from job data:', {
      materials: job?.materials?.length || 0,
      labour: job?.labour?.length || 0,
      estimatedValue: job?.estimatedValue,
      value: job?.value,
      total: job?.total
    });
    
    // Add materials
    if (job?.materials) {
      job.materials.forEach((material: any, index: number) => {
        // Try multiple property names for price/rate
        const unitPrice = material.rate || material.price || material.cost || material.unitPrice || material.unit_price || 0;
        const quantity = material.quantity || material.qty || 1;
        const total = material.total || material.amount || material.value || (quantity * unitPrice);
        
        // Debug logging for materials with 0 total
        if (total === 0) {
          console.warn('⚠️ Material with zero total found:', {
            name: material.name || material.description,
            rawMaterial: material,
            calculatedUnitPrice: unitPrice,
            calculatedQuantity: quantity,
            calculatedTotal: total
          });
        }
        
        const item = {
          id: `material-${index}`,
          description: material.name || material.description || 'Material',
          qty: quantity,
          unitPrice: unitPrice,
          type: "materials" as const,
          totalAmount: total,
          billedAmount: 0,
          remainingAmount: total
        };
        items.push(item);
        console.log('➕ Added material:', item.description, formatCurrency(item.totalAmount));
      });
    }
    
    // Add labour
    if (job?.labour) {
      job.labour.forEach((labour: any, index: number) => {
        const item = {
          id: `labour-${index}`,
          description: labour.name || labour.description || 'Labour',
          qty: labour.hours || labour.qty || 1,
          unitPrice: labour.rate || labour.price || 0,
          type: "labour" as const,
          totalAmount: labour.total || ((labour.hours || labour.qty || 1) * (labour.rate || labour.price || 0)),
          billedAmount: 0,
          remainingAmount: labour.total || ((labour.hours || labour.qty || 1) * (labour.rate || labour.price || 0))
        };
        items.push(item);
        console.log('➕ Added labour:', item.description, formatCurrency(item.totalAmount));
      });
    }
    
    // CRITICAL FIX: If no items found, create a single item for the job value
    // Try multiple fields to find a valid value
    if (items.length === 0) {
      const jobValue = job?.estimatedValue || job?.value || job?.total || job?.subtotal || 0;
      
      if (jobValue > 0) {
        const item = {
          id: 'job-total',
          description: job?.title || job?.description || 'Job Work',
          qty: 1,
          unitPrice: jobValue,
          type: "materials" as const,
          totalAmount: jobValue,
          billedAmount: 0,
          remainingAmount: jobValue
        };
        items.push(item);
        console.log('💰 Added job total as single item:', formatCurrency(jobValue));
      } else {
        console.error('❌ Cannot create line items - no valid job value found:', {
          estimatedValue: job?.estimatedValue,
          value: job?.value,
          total: job?.total,
          subtotal: job?.subtotal,
          hasJob: !!job
        });
      }
    }
    
    const totalValue = items.reduce((sum, item) => sum + item.remainingAmount, 0);
    console.log('📊 Generated job line items total:', formatCurrency(totalValue));
    
    // Warn if we have items but total is 0
    if (items.length > 0 && totalValue === 0) {
      console.error('❌ Line items exist but all have zero value! Items:', items.map(item => ({
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: item.totalAmount
      })));
      console.error('💡 This usually means materials/labour were added without prices. Please add prices to all items in the job.');
    }
    
    return items;
  };

  // Removed: isVatAddedDuringInvoicing - VAT is now only set at quote/job creation

  /**
   * CLEAN CALCULATION LOGIC
   * 
   * KEY PRINCIPLES:
   * - Jobs/quotes store: subtotal (pre-VAT), vatEnabled, vatRate, vatAmount, total (with VAT)
   * - Invoice calculations NEVER add VAT - it's already in the job/quote
   * - Deposit invoices: Calculate % of job.total (which already includes VAT if applicable)
   * - Remaining balance: job.total - previousInvoices.total (both include VAT)
   * - Full invoice: Use job.total directly (already includes VAT if applicable)
   */
  const calculateTotals = () => {
    const jobVatEnabled = originalQuote?.vatEnabled ?? job?.vatEnabled ?? false;
    const jobVatRate = originalQuote?.vatRate ?? job?.vatRate ?? 20;
    
    let invoiceTotal = 0;
    let invoiceSubtotal = 0;
    let invoiceVatAmount = 0;
    let labourSubtotal = 0;
    let materialsSubtotal = 0;

    // Calculate the invoice total based on bill type
    switch (invoiceData.billType) {
      case "deposit":
        // Deposit = percentage of TOTAL project value (which includes VAT if applicable)
        const projectTotal = getActualJobTotal();
        
        if (projectTotal <= 0) {
          console.error('❌ Project total is 0, cannot calculate deposit');
          invoiceTotal = 0;
        } else if (invoiceData.depositType === "percentage" && invoiceData.depositAmount) {
          invoiceTotal = (projectTotal * invoiceData.depositAmount) / 100;
          console.log(`💰 Deposit: ${invoiceData.depositAmount}% of ${formatCurrency(projectTotal)} = ${formatCurrency(invoiceTotal)}`);
        } else if (invoiceData.depositType === "fixed" && invoiceData.depositAmount) {
          invoiceTotal = invoiceData.depositAmount;
          console.log(`💰 Fixed deposit: ${formatCurrency(invoiceTotal)}`);
        } else {
          // Default to 20% if not specified
          invoiceTotal = (projectTotal * 20) / 100;
          console.warn('⚠️ No deposit amount, defaulting to 20%');
        }
        
        // For deposits, subtotal = total (VAT is proportionally included)
        invoiceSubtotal = invoiceTotal;
        invoiceVatAmount = 0;
        break;

      case "full":
        // CRITICAL FIX: For full invoices, properly break down subtotal and VAT
        // Use job's stored subtotal and vatAmount values
        invoiceSubtotal = job?.subtotal || originalQuote?.subtotal || getActualJobSubtotal();
        invoiceVatAmount = jobVatEnabled ? (job?.vatAmount || (invoiceSubtotal * jobVatRate / 100)) : 0;
        invoiceTotal = invoiceSubtotal + invoiceVatAmount;
        
        console.log(`💰 Full invoice breakdown:`, {
          subtotal: formatCurrency(invoiceSubtotal),
          vatAmount: formatCurrency(invoiceVatAmount),
          total: formatCurrency(invoiceTotal),
          jobVatEnabled,
          jobVatRate
        });
        break;

      case "remaining":
        // Remaining = project total - previous invoices (both include VAT)
        const fullTotal = getActualJobTotal();
        invoiceTotal = Math.max(0, fullTotal - previousInvoicesTotal);
        invoiceSubtotal = invoiceTotal; // VAT proportionally included
        invoiceVatAmount = 0;
        console.log(`💰 Remaining: ${formatCurrency(fullTotal)} - ${formatCurrency(previousInvoicesTotal)} = ${formatCurrency(invoiceTotal)}`);
        break;
    }

    // Ensure invoice total is never negative
    invoiceTotal = Math.max(0, invoiceTotal);
    invoiceSubtotal = Math.max(0, invoiceSubtotal);

    // Calculate labour vs materials split (kept for potential future use)
    const totalLineItemsAmount = jobLineItems.reduce((sum, item) => sum + item.totalAmount, 0);
    if (totalLineItemsAmount > 0) {
      const labourRatio = jobLineItems.reduce((sum, item) => 
        item.type === "labour" ? sum + item.totalAmount : sum, 0) / totalLineItemsAmount;
      labourSubtotal = invoiceSubtotal * labourRatio;
      materialsSubtotal = invoiceSubtotal * (1 - labourRatio);
    } else {
      // Fallback: Estimate 30% labour, 70% materials
      labourSubtotal = invoiceSubtotal * 0.3;
      materialsSubtotal = invoiceSubtotal * 0.7;
    }

    const total = invoiceTotal;

    console.log('📊 Invoice Calculation:', {
      billType: invoiceData.billType,
      subtotal: formatCurrency(invoiceSubtotal),
      vatAmount: formatCurrency(invoiceVatAmount),
      finalTotal: formatCurrency(total),
      jobHasVAT: jobVatEnabled,
      jobVATRate: jobVatRate
    });

    // Return values with proper breakdown
    return {
      subtotal: invoiceSubtotal,
      labourSubtotal,
      materialsSubtotal,
      vatAmount: invoiceVatAmount,
      total
    };
  };

  // Get the actual job SUBTOTAL value (before VAT) - used for calculating deposits and invoices
  // This returns the subtotal so that VAT can be calculated correctly in the invoice
  const getActualJobSubtotal = (): number => {
    // First priority: Original quote subtotal (if quote exists)
    if (originalQuote?.subtotal && originalQuote.subtotal > 0) {
      console.log('📋 Using original quote subtotal:', formatCurrency(originalQuote.subtotal));
      return originalQuote.subtotal;
    }
    
    // CRITICAL FIX: Try original quote total if subtotal not available (for quotes without VAT)
    if (originalQuote?.total && originalQuote.total > 0) {
      console.log('📋 Using original quote total as subtotal (no VAT in quote):', formatCurrency(originalQuote.total));
      return originalQuote.total;
    }
    
    // Second priority: Sum of job line items (materials only, before VAT)
    if (jobLineItems.length > 0) {
      const lineItemsTotal = jobLineItems.reduce((sum, item) => sum + item.remainingAmount, 0);
      const totalAmountSum = jobLineItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
      
      console.log('📊 Checking job line items:', {
        count: jobLineItems.length,
        lineItemsTotalFromRemaining: formatCurrency(lineItemsTotal),
        lineItemsTotalFromTotal: formatCurrency(totalAmountSum),
        items: jobLineItems.map(item => ({
          description: item.description,
          remainingAmount: item.remainingAmount,
          totalAmount: item.totalAmount,
          billedAmount: item.billedAmount
        }))
      });
      
      // Use totalAmount if remainingAmount is 0 (e.g., fully billed items that still need to show)
      const calculatedTotal = lineItemsTotal > 0 ? lineItemsTotal : totalAmountSum;
      
      if (calculatedTotal > 0) {
        console.log('📊 Using job line items total (subtotal):', formatCurrency(calculatedTotal));
        return calculatedTotal;
      }
    }
    
    // Third priority: Job estimatedValue/subtotal/total/value (before VAT)
    const jobSubtotal = job?.estimatedValue || job?.subtotal || job?.total || job?.value || 0;
    console.log('💼 Using job subtotal:', formatCurrency(jobSubtotal), {
      estimatedValue: job?.estimatedValue,
      subtotal: job?.subtotal,
      total: job?.total,
      value: job?.value
    });
    
    // Validation: Ensure subtotal is valid
    if (jobSubtotal <= 0) {
      console.error('❌ No valid job subtotal found. Job data:', {
        id: job?.id,
        estimatedValue: job?.estimatedValue,
        subtotal: job?.subtotal,
        total: job?.total,
        value: job?.value,
        hasLineItems: jobLineItems.length > 0,
        lineItemsData: jobLineItems.map(item => ({
          description: item.description,
          totalAmount: item.totalAmount,
          remainingAmount: item.remainingAmount
        })),
        hasOriginalQuote: !!originalQuote,
        originalQuoteTotal: originalQuote?.total,
        originalQuoteSubtotal: originalQuote?.subtotal,
        hasMaterials: !!job?.materials?.length,
        hasLabour: !!job?.labour?.length
      });
      
      console.warn('⚠️ Using fallback minimum value to prevent broken invoice');
      
      // Show helpful message to user
      if (job?.materials?.length > 0 || job?.labour?.length > 0) {
        toast.error('⚠️ Materials/labour found but no prices set. Please add prices to all items in the job before creating an invoice.');
      } else {
        toast.error('⚠️ No job value found. Please set an estimated value or add materials/labour with prices to the job.');
      }
      
      // Last resort: Return a minimum value to prevent 0 totals
      return 100; // £100 minimum to prevent completely broken invoices
    }
    
    return jobSubtotal;
  };

  // Get the actual job TOTAL value (with VAT) - used for project breakdown display
  const getActualJobTotal = (): number => {
    // First priority: Original quote total (with VAT if applicable)
    if (originalQuote?.total && originalQuote.total > 0) {
      console.log('📋 Using original quote total:', formatCurrency(originalQuote.total));
      return originalQuote.total;
    }
    
    // Second priority: Job total (with VAT if applicable)
    if (job?.total && job.total > 0) {
      console.log('💼 Using job total:', formatCurrency(job.total));
      return job.total;
    }
    
    // CRITICAL FIX: Try job value or estimatedValue as fallback
    if (job?.value && job.value > 0) {
      console.log('💼 Using job value:', formatCurrency(job.value));
      return job.value;
    }
    
    if (job?.estimatedValue && job.estimatedValue > 0) {
      console.log('💼 Using job estimatedValue:', formatCurrency(job.estimatedValue));
      return job.estimatedValue;
    }
    
    // Fallback: Calculate from subtotal + VAT
    const subtotal = getActualJobSubtotal();
    const vatRate = job?.vatRate || originalQuote?.vatRate || 20;
    const hasVAT = job?.vatEnabled || originalQuote?.vatEnabled || false;
    const total = hasVAT ? subtotal * (1 + vatRate / 100) : subtotal;
    
    console.log('💼 Calculated total from subtotal:', formatCurrency(total), {
      subtotal: formatCurrency(subtotal),
      vatRate,
      hasVAT
    });
    
    return total;
  };

  const totals = calculateTotals();

  // Generate line items for template preview
  const generateLineItems = () => {
    const lineItems: any[] = [];

    switch (invoiceData.billType) {
      case "deposit":
        // NEW: For deposits, show ALL line items from the job/quote, not just a single deposit line
        if (originalQuote?.lineItems && originalQuote.lineItems.length > 0) {
          // Use original quote line items
          originalQuote.lineItems.forEach((item: any) => {
            lineItems.push({
              id: item.id,
              description: item.description,
              quantity: item.qty || item.quantity || 1,
              rate: item.price || item.rate || 0,
              amount: item.total || item.amount || ((item.qty || item.quantity || 1) * (item.price || item.rate || 0))
            });
          });
        } else if (jobLineItems.length > 0) {
          // Use job line items
          jobLineItems.forEach(item => {
            lineItems.push({
              id: item.id,
              description: item.description,
              quantity: item.qty,
              rate: item.unitPrice,
              amount: item.totalAmount
            });
          });
        } else {
          // Fallback to single item based on job subtotal (before VAT)
          const depositJobSubtotal = getActualJobSubtotal();
          lineItems.push({
            id: "job-total",
            description: job?.title || 'Project Work',
            quantity: 1,
            rate: depositJobSubtotal,
            amount: depositJobSubtotal
          });
        }
        break;

      case "full":
        // For full invoices, show all line items from the job/quote at full amounts
        if (originalQuote?.lineItems && originalQuote.lineItems.length > 0) {
          // Use original quote line items
          originalQuote.lineItems.forEach((item: any) => {
            lineItems.push({
              id: item.id,
              description: item.description,
              quantity: item.qty || item.quantity || 1,
              rate: item.price || item.rate || 0,
              amount: item.total || item.amount || ((item.qty || item.quantity || 1) * (item.price || item.rate || 0))
            });
          });
        } else if (jobLineItems.length > 0) {
          // Use job line items
          jobLineItems.forEach(item => {
            lineItems.push({
              id: item.id,
              description: item.description,
              quantity: item.qty,
              rate: item.unitPrice,
              amount: item.totalAmount
            });
          });
        } else {
          // Fallback to single item based on job total
          const fullJobTotal = getActualJobTotal();
          lineItems.push({
            id: "job-total",
            description: job?.title || 'Complete Project Work',
            quantity: 1,
            rate: fullJobTotal,
            amount: fullJobTotal
          });
        }
        break;

      case "remaining":
        // FIXED: For remaining invoices, show FULL amounts (not proportional)
        // The project breakdown will handle showing deposit vs remaining
        if (originalQuote?.lineItems && originalQuote.lineItems.length > 0) {
          // Use original quote line items at FULL amounts
          originalQuote.lineItems.forEach((item: any) => {
            lineItems.push({
              id: item.id,
              description: item.description,
              quantity: item.qty || item.quantity || 1,
              rate: item.price || item.rate || 0,
              amount: item.total || item.amount || ((item.qty || item.quantity || 1) * (item.price || item.rate || 0))
            });
          });
        } else if (jobLineItems.length > 0) {
          // Use job line items at FULL amounts
          jobLineItems.forEach(item => {
            lineItems.push({
              id: item.id,
              description: item.description,
              quantity: item.qty,
              rate: item.unitPrice,
              amount: item.totalAmount // FULL amount, not proportional
            });
          });
        } else {
          // Fallback to single item based on full job total
          const fullJobTotal = getActualJobTotal();
          lineItems.push({
            id: "job-total",
            description: job?.title || 'Project Work',
            quantity: 1,
            rate: fullJobTotal,
            amount: fullJobTotal
          });
        }
        
        console.log(`📋 Remaining balance invoice - showing FULL project line items:`, {
          lineItemsCount: lineItems.length,
          lineItemsTotal: lineItems.reduce((sum, item) => sum + (item.amount || 0), 0),
          previousInvoicesTotal: formatCurrency(previousInvoicesTotal)
        });
        break;
    }

    return lineItems;
  };

  // Generate template-compatible invoice data
  const generateTemplateInvoiceData = () => {
    const lineItems = generateLineItems();
    
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
    } else if (job?.client?.address) {
      clientAddress = job.client.address;
    } else if (typeof job?.client === 'object' && job?.client !== null) {
      // Try to construct address from client object
      const addressParts = [
        job.client.line1,
        job.client.line2,
        job.client.city,
        job.client.postcode,
        job.client.country !== 'United Kingdom' ? job.client.country : ''
      ].filter(Boolean);
      clientAddress = addressParts.join(', ');
    }
    
    return {
      id: "preview",
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: invoiceData.dueDate,
      status: "draft",
      client: {
        id: clientData?.id || job?.clientId || "unknown",
        name: clientData?.name || job?.client?.name || (typeof job?.client === 'string' ? job?.client : '') || "Unknown Client",
        email: clientData?.email || job?.client?.email || "",
        phone: clientData?.phone || job?.client?.phone || "",
        address: clientAddress
      },
      business: {
        name: branding?.business_name || businessData?.companyName || businessData?.company_name || "Your Business",
        address: businessAddress,
        phone: businessPhone,
        email: businessData?.email || 'info@yourbusiness.co.uk'
      },
      line_items: lineItems,
      subtotal: totals.subtotal,
      vat_amount: (totals.vatAmount && totals.vatAmount > 0) ? totals.vatAmount : undefined,
      vat_rate: (job?.vatEnabled || originalQuote?.vatEnabled) ? (job?.vatRate || originalQuote?.vatRate || 20) : undefined,
      total: totals.total,
      payment_terms: invoiceData.termsAndConditions,
      // Special deposit invoice fields
      is_deposit_invoice: invoiceData.billType === "deposit",
      billType: invoiceData.billType,
      project_subtotal: invoiceData.billType === "deposit" ? getActualJobSubtotal() : undefined,
      project_vat_amount: invoiceData.billType === "deposit" ? 
        (() => {
          const jobSubtotal = getActualJobSubtotal();
          const hasVAT = job?.vatEnabled || originalQuote?.vatEnabled;
          const vatRate = job?.vatRate || originalQuote?.vatRate || 20;
          const vatAmount = hasVAT ? (jobSubtotal * vatRate / 100) : 0;
          console.log('📊 Deposit - Project VAT:', {
            jobSubtotal: formatCurrency(jobSubtotal),
            hasVAT,
            vatRate,
            vatAmount: formatCurrency(vatAmount)
          });
          return vatAmount;
        })() : undefined,
      project_total: invoiceData.billType === "deposit" ? 
        (() => {
          const jobSubtotal = getActualJobSubtotal();
          const hasVAT = job?.vatEnabled || originalQuote?.vatEnabled;
          const vatRate = job?.vatRate || originalQuote?.vatRate || 20;
          const vatAmount = hasVAT ? (jobSubtotal * vatRate / 100) : 0;
          const projectTotal = jobSubtotal + vatAmount;
          console.log('📊 Deposit - Project Total:', {
            jobSubtotal: formatCurrency(jobSubtotal),
            vatAmount: formatCurrency(vatAmount),
            projectTotal: formatCurrency(projectTotal)
          });
          return projectTotal;
        })() : undefined,
      deposit_percentage: invoiceData.billType === "deposit" && invoiceData.depositType === "percentage" ? invoiceData.depositAmount : undefined,
      deposit_amount: invoiceData.billType === "deposit" ? totals.subtotal : undefined,
      deposit_amount_with_vat: invoiceData.billType === "deposit" ? totals.total : undefined,
      remaining_balance: invoiceData.billType === "deposit" ? 
        (() => {
          const projectTotal = getActualJobTotal();
          const depositTotal = totals.total;
          const remainingBalance = projectTotal - depositTotal;
          console.log('📊 Deposit - Remaining Balance:', {
            projectTotal: formatCurrency(projectTotal),
            depositTotal: formatCurrency(depositTotal),
            remainingBalance: formatCurrency(remainingBalance)
          });
          return remainingBalance;
        })() : undefined,
      // Remaining balance invoice data
      is_remaining_from_quote: invoiceData.billType === "remaining" && originalQuote?.vatEnabled,
      remaining_total_with_vat: invoiceData.billType === "remaining" && originalQuote?.vatEnabled ? totals.total : undefined,
      is_remaining_balance_invoice: invoiceData.billType === "remaining",
      project_subtotal_full: invoiceData.billType === "remaining" ? lineItems.reduce((sum, item) => sum + (item.amount || 0), 0) : undefined,
      project_vat_full: invoiceData.billType === "remaining" ? 
        (() => {
          const projectSubtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          const shouldShowVAT = job?.vatEnabled || originalQuote?.vatEnabled;
          const vatRate = job?.vatRate || originalQuote?.vatRate || 20;
          const vatAmount = shouldShowVAT ? (projectSubtotal * vatRate / 100) : 0;
          console.log('📊 Remaining - Project VAT:', {
            projectSubtotal: formatCurrency(projectSubtotal),
            shouldShowVAT,
            vatRate,
            vatAmount: formatCurrency(vatAmount)
          });
          return vatAmount;
        })() : undefined,
      project_total_full: invoiceData.billType === "remaining" ? 
        (() => {
          const projectSubtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
          const shouldShowVAT = job?.vatEnabled || originalQuote?.vatEnabled;
          const vatRate = job?.vatRate || originalQuote?.vatRate || 20;
          const vatAmount = shouldShowVAT ? (projectSubtotal * vatRate / 100) : 0;
          const projectTotal = projectSubtotal + vatAmount;
          console.log('📊 Remaining - Project Total:', {
            projectSubtotal: formatCurrency(projectSubtotal),
            vatAmount: formatCurrency(vatAmount),
            projectTotal: formatCurrency(projectTotal)
          });
          return projectTotal;
        })() : undefined,
      deposit_paid_amount: invoiceData.billType === "remaining" ? previousInvoicesTotal : undefined
    };
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        // CRITICAL FIX: Validate that job has a value before proceeding
        const jobTotal = getActualJobTotal();
        if (jobTotal <= 0) {
          console.error('❌ Cannot proceed: Job has no value');
          return false;
        }
        
        if (invoiceData.billType === "deposit") {
          return invoiceData.depositAmount && invoiceData.depositAmount > 0;
        }
        return true; // "remaining" and "full" always valid if job has value
      case 2:
        return invoiceData.dueDate && invoiceData.termsAndConditions && totals.total > 0;
      case 3:
        return totals.total > 0 && !loading;
      default:
        return false;
    }
  };

  const handleCreateInvoice = async () => {
    try {
      // Generate line items for validation
      const lineItems = generateLineItems();
      
      // Prepare invoice data for validation
      const invoiceToValidate = {
        number: sanitizeText(invoiceNumber, 50),
        clientId: job.clientId,
        jobId: job.id,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: invoiceData.dueDate,
        lineItems: lineItems.map(item => ({
          description: sanitizeText(item.description, 500),
          qty: sanitizeCurrency(item.quantity),
          price: sanitizeCurrency(item.rate),
          total: sanitizeCurrency(item.amount)
        })),
        subtotal: sanitizeCurrency(totals.subtotal),
        vatAmount: sanitizeCurrency(totals.vatAmount),
        total: sanitizeCurrency(totals.total),
        status: 'draft',
        type: invoiceData.billType,
        notes: sanitizeText(invoiceData.termsAndConditions, 2000)
      };

      // Validate with schema
      const validation = validate(invoiceSchema, invoiceToValidate);
      
      if (!validation.success) {
        const errorMessages = formatValidationErrors(validation.errors!);
        toast.error(errorMessages[0] || "Please check your invoice data");
        console.log('Validation errors:', validation.errors);
        return;
      }

      // Additional business logic validation
      if (totals.total <= 0) {
        console.error('❌ Cannot create invoice with zero or negative total:', {
          totals,
          invoiceData,
          jobTotal: getActualJobTotal()
        });
        
        toast.error('Cannot create invoice with zero amount');
        return;
      }

      // Generate invoice with validated data
      const invoice = {
        id: Date.now().toString(),
        number: validation.data!.number,
        jobId: job?.id || '',
        clientId: job?.clientId || '',
        client: clientData?.name || job?.client?.name || job?.client || 'Unknown Client',
        job: job?.title || 'Unknown Job',
        issueDate: validation.data!.issueDate,
        dueDate: validation.data!.dueDate,
        status: "draft" as const,
        ...totals,
        amount: totals.total,
        paymentTerms: validation.data!.notes,
        sentAt: null,
        paidAt: null,
        billType: invoiceData.billType,
        type: invoiceData.billType,
        isDepositInvoice: invoiceData.billType === 'deposit',
        description: invoiceData.billType === 'deposit' ? 'Deposit invoice' : 
                    invoiceData.billType === 'remaining' ? 'Remaining balance invoice' : 
                    'Invoice',
        projectTotal: invoiceData.billType === 'deposit' ? 
          (() => {
            const subtotal = getActualJobSubtotal();
            const hasVAT = job?.vatEnabled || originalQuote?.vatEnabled;
            const vatRate = invoiceData.vatRate || job?.vatRate || originalQuote?.vatRate || 20;
            const vat = hasVAT ? (subtotal * vatRate / 100) : 0;
            return subtotal + vat;
          })() : undefined,
        depositAmount: invoiceData.billType === 'deposit' ? totals.total : undefined,
        remainingBalance: invoiceData.billType === 'deposit' ? 
          (() => {
            const projectSubtotal = getActualJobSubtotal();
            const hasVAT = job?.vatEnabled || originalQuote?.vatEnabled;
            const vatRate = invoiceData.vatRate || job?.vatRate || originalQuote?.vatRate || 20;
            const projectVat = hasVAT ? (projectSubtotal * vatRate / 100) : 0;
            const projectTotal = projectSubtotal + projectVat;
            return projectTotal - totals.total;
          })() : undefined,
        templateData: generateTemplateInvoiceData(),
        selectedTemplate: branding.selected_template || 'classic'
      };

      // FINAL VALIDATION: Double-check invoice totals before saving
      console.log('📊 Final invoice validation:', {
        id: invoice.id,
        number: invoice.number,
        total: invoice.total,
        amount: invoice.amount,
        subtotal: invoice.subtotal,
        billType: invoice.billType,
        jobId: invoice.jobId,
        clientId: invoice.clientId
      });

      // Save invoice via API
      await api.createInvoice(invoice);
      
      // Clear autosave draft on success
      autosave.clearDraft();
      
      // Generate and download PDF with WhatsApp integration
      try {
        // Show loading toast
        const loadingToast = toast.loading('Generating invoice...');
        
        // Check if client has phone number for WhatsApp
        if (clientData?.phone) {
          const formattedPhone = formatPhoneForWhatsApp(clientData.phone, '+44');
          
          // Download PDF and open WhatsApp with pre-filled message
          await downloadInvoiceWithTemplateAndOpenWhatsApp(
            generateTemplateInvoiceData(),
            clientData,
            {
              logo_url: branding?.logo_url,
              primary_color: branding?.invoice_use_brand_colors ? branding?.primary_color : '#0A84FF',
              secondary_color: branding?.invoice_use_brand_colors ? branding?.accent_color : '#42A5F5',
              business_name: branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business',
              invoice_logo_position: branding?.invoice_logo_position || 'left',
              invoice_use_brand_colors: branding?.invoice_use_brand_colors || false,
              selected_template: branding?.selected_template || 'classic'
            },
            bankDetails,
            formattedPhone
          );
          
          toast.dismiss(loadingToast);
          toast.success('Invoice downloaded, redirecting to WhatsApp');
        } else {
          // Fallback to just downloading PDF if no phone number
          await downloadTemplatePDF(
            branding.selected_template || 'classic',
            generateTemplateInvoiceData(),
            'invoice',
            {
              logo_url: branding?.logo_url,
              primary_color: branding?.invoice_use_brand_colors ? branding?.primary_color : '#0A84FF',
              secondary_color: branding?.invoice_use_brand_colors ? branding?.accent_color : '#42A5F5',
              business_name: branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business',
              invoice_logo_position: branding?.invoice_logo_position || 'left',
              invoice_use_brand_colors: branding?.invoice_use_brand_colors || false
            },
            bankDetails
          );
          
          toast.dismiss(loadingToast);
          toast.success('Invoice downloaded');
        }
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        toast.error('PDF generation failed');
      }
      
      // Go back to previous screen
      onBack();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  if (loading) {
    return (
      <div className="screen_root flex flex-col h-full" style={{ backgroundColor: 'var(--surface-alt)' }}>
        <div className="header flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} style={{ color: 'var(--ink)' }} />
            </button>
            <h1 className="trades-h2" style={{ color: 'var(--ink)' }}>Generate Invoice</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Loading invoice data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Guard against null/undefined job
  if (!job) {
    return (
      <div className="screen_root flex flex-col h-full" style={{ backgroundColor: 'var(--surface-alt)' }}>
        <div className="header flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={20} style={{ color: 'var(--ink)' }} />
            </button>
            <h1 className="trades-h2" style={{ color: 'var(--ink)' }}>Generate Invoice</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="trades-h2 text-red-600 mb-2">Job Not Found</p>
            <p className="trades-body text-gray-600 mb-4">Unable to load job data for invoice generation.</p>
            <Button onClick={onBack} variant="outline">Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  // Generate template data for preview (AFTER job null check)
  const templateData = generateTemplateInvoiceData();
  
  // Generate branding object for preview with proper color logic (matching PDF generation)
  const previewBranding = {
    logo_url: branding?.logo_url,
    primary_color: branding?.invoice_use_brand_colors ? branding?.primary_color : '#0A84FF',
    secondary_color: branding?.invoice_use_brand_colors ? branding?.accent_color : '#F9FAFB',
    accent_color: branding?.invoice_use_brand_colors ? branding?.accent_color : '#F9FAFB', // Template compatibility
    business_name: branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business',
    invoice_logo_position: branding?.invoice_logo_position || 'left',
    invoice_use_brand_colors: branding?.invoice_use_brand_colors || false,
    selected_template: branding?.selected_template || 'classic'
  };

  return (
    <div className="screen_root flex flex-col h-full" style={{ backgroundColor: 'var(--surface-alt)' }}>
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
            <h1 className="trades-h2" style={{ color: 'var(--ink)' }}>Generate Invoice</h1>
            <p className="trades-caption" style={{ color: 'var(--muted)' }}>
              {job?.client?.name || job?.client || 'Client'} • {job?.title || 'Job'}
            </p>
          </div>
        </div>
        
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className="flex items-center justify-center w-8 h-8 rounded-full"
              style={{
                backgroundColor: step <= currentStep ? 'var(--primary)' : 'var(--border)',
                color: step <= currentStep ? 'var(--primary-foreground)' : 'var(--muted)'
              }}
            >
              {step < currentStep ? (
                <Check size={16} />
              ) : (
                <span className="trades-caption">{step}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="content_scroll flex-1 overflow-y-auto p-4 pb-36">
        {/* CRITICAL FIX: Show error message if job has no value */}
        {getActualJobTotal() <= 0 && (
          <div className="p-4 mb-6 rounded-xl border" style={{ 
            backgroundColor: '#FEF2F2', 
            borderColor: '#FECACA' 
          }}>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-xs">!</span>
              </div>
              <div>
                <h3 className="trades-label text-red-900 mb-1">Cannot create invoice</h3>
                <p className="trades-caption text-red-700 mb-2">
                  This job has no estimated value or line items. Please add a value to the job or quote before creating an invoice.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onNavigate('job-detail', job)}
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  Edit Job Details
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Bill What? */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>What would you like to bill?</h2>
              <p className="trades-body" style={{ color: 'var(--muted)' }}>
                Choose what to include on this invoice
              </p>
            </div>

            {/* Existing Invoices Summary - Show if invoices exist */}
            {existingInvoices.length > 0 && (
              <div className="p-4 rounded-xl border" style={{ 
                backgroundColor: 'rgba(10, 132, 255, 0.05)', 
                borderColor: 'rgba(10, 132, 255, 0.2)' 
              }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
                       style={{ backgroundColor: 'rgba(10, 132, 255, 0.15)' }}>
                    <Receipt size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="trades-label text-blue-900 mb-1">
                      {existingInvoices.length} {existingInvoices.length === 1 ? 'Invoice' : 'Invoices'} Already Created
                    </h3>
                    <p className="trades-caption text-blue-700 mb-2">
                      Total invoiced: {formatCurrency(previousInvoicesTotal)} of {formatCurrency(getActualJobTotal())}
                    </p>
                    <div className="space-y-1">
                      {existingInvoices.slice(0, 3).map((inv, idx) => (
                        <div key={idx} className="flex items-center justify-between trades-caption text-blue-700">
                          <span>{inv.invoice_number || inv.number}</span>
                          <span className="font-medium">{formatCurrency(inv.total || 0)}</span>
                        </div>
                      ))}
                      {existingInvoices.length > 3 && (
                        <p className="trades-caption text-blue-600">
                          +{existingInvoices.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Type Options - Smart filtering based on existing invoices */}
            <div className="space-y-3">
              {/* Deposit Option - Always available */}
              <button
                onClick={() => setInvoiceData(prev => ({ 
                  ...prev, 
                  billType: 'deposit',
                  termsAndConditions: getDefaultTermsAndConditions('deposit')
                }))}
                className="w-full p-4 rounded-xl border text-left transition-all hover:shadow-md"
                style={{
                  backgroundColor: invoiceData.billType === 'deposit' ? 'rgba(10, 132, 255, 0.08)' : 'var(--surface)',
                  borderColor: invoiceData.billType === 'deposit' ? 'var(--primary)' : 'var(--border)',
                  borderWidth: invoiceData.billType === 'deposit' ? '2px' : '1px'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl" 
                       style={{ 
                         backgroundColor: invoiceData.billType === 'deposit' ? 'rgba(10, 132, 255, 0.15)' : 'var(--surface-alt)'
                       }}>
                    <Calculator size={22} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="trades-body font-medium mb-0.5" style={{ color: 'var(--ink)' }}>
                      Deposit
                      {hasDepositInvoice && (
                        <span className="ml-2 trades-caption font-normal" style={{ color: 'var(--muted)' }}>
                          (Additional)
                        </span>
                      )}
                    </div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                      Request upfront payment before starting work
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                       style={{ 
                         borderColor: invoiceData.billType === 'deposit' ? 'var(--primary)' : 'var(--border)',
                         backgroundColor: invoiceData.billType === 'deposit' ? 'var(--primary)' : 'transparent'
                       }}>
                    {invoiceData.billType === 'deposit' && (
                      <Check size={14} style={{ color: 'white' }} />
                    )}
                  </div>
                </div>
              </button>

              {/* Remaining Balance - ONLY show if deposit exists */}
              {hasDepositInvoice && (
                <button
                  onClick={() => setInvoiceData(prev => ({ 
                    ...prev, 
                    billType: 'remaining',
                    termsAndConditions: getDefaultTermsAndConditions('remaining')
                  }))}
                  className="w-full p-4 rounded-xl border text-left transition-all hover:shadow-md"
                  style={{
                    backgroundColor: invoiceData.billType === 'remaining' ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface)',
                    borderColor: invoiceData.billType === 'remaining' ? '#10B981' : 'var(--border)',
                    borderWidth: invoiceData.billType === 'remaining' ? '2px' : '1px'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl" 
                         style={{ 
                           backgroundColor: invoiceData.billType === 'remaining' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-alt)'
                         }}>
                      <FileText size={22} style={{ color: '#10B981' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>
                          Remaining Balance
                        </span>
                        <span className="px-2 py-0.5 rounded-full trades-caption font-medium"
                              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669' }}>
                          Recommended
                        </span>
                      </div>
                      <div className="trades-caption mb-1" style={{ color: 'var(--muted)' }}>
                        Bill everything outstanding after deposit
                      </div>
                      <div className="trades-caption font-medium" style={{ color: '#059669' }}>
                        Outstanding: {formatCurrency(getActualJobTotal() - previousInvoicesTotal)}
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                         style={{ 
                           borderColor: invoiceData.billType === 'remaining' ? '#10B981' : 'var(--border)',
                           backgroundColor: invoiceData.billType === 'remaining' ? '#10B981' : 'transparent'
                         }}>
                      {invoiceData.billType === 'remaining' && (
                        <Check size={14} style={{ color: 'white' }} />
                      )}
                    </div>
                  </div>
                </button>
              )}

              {/* Full Invoice - Always available but with context */}
              <button
                onClick={() => setInvoiceData(prev => ({ 
                  ...prev, 
                  billType: 'full',
                  termsAndConditions: getDefaultTermsAndConditions('full')
                }))}
                className="w-full p-4 rounded-xl border text-left transition-all hover:shadow-md"
                style={{
                  backgroundColor: invoiceData.billType === 'full' ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface)',
                  borderColor: invoiceData.billType === 'full' ? '#3B82F6' : 'var(--border)',
                  borderWidth: invoiceData.billType === 'full' ? '2px' : '1px'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl" 
                       style={{ 
                         backgroundColor: invoiceData.billType === 'full' ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface-alt)'
                       }}>
                    <FileText size={22} style={{ color: '#3B82F6' }} />
                  </div>
                  <div className="flex-1">
                    <div className="trades-body font-medium mb-0.5" style={{ color: 'var(--ink)' }}>
                      Full Invoice
                    </div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                      {hasDepositInvoice 
                        ? 'Bill the complete project (creates duplicate of deposited amounts)'
                        : 'Bill the complete project in one invoice'
                      }
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                       style={{ 
                         borderColor: invoiceData.billType === 'full' ? '#3B82F6' : 'var(--border)',
                         backgroundColor: invoiceData.billType === 'full' ? '#3B82F6' : 'transparent'
                       }}>
                    {invoiceData.billType === 'full' && (
                      <Check size={14} style={{ color: 'white' }} />
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Deposit Configuration */}
            {invoiceData.billType === "deposit" && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <h3 className="trades-label mb-3" style={{ color: 'var(--ink)' }}>Deposit Amount</h3>
                
                <div className="space-y-4">
                  {/* Percentage or Fixed */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setInvoiceData(prev => ({ ...prev, depositType: "percentage" }))}
                      className="flex-1 p-3 rounded-lg border"
                      style={{
                        backgroundColor: invoiceData.depositType === "percentage" ? 'rgba(10, 132, 255, 0.05)' : 'var(--surface-alt)',
                        borderColor: invoiceData.depositType === "percentage" ? 'var(--primary)' : 'var(--border)'
                      }}
                    >
                      <span className="trades-label">Percentage</span>
                    </button>
                    <button
                      onClick={() => setInvoiceData(prev => ({ ...prev, depositType: "fixed" }))}
                      className="flex-1 p-3 rounded-lg border"
                      style={{
                        backgroundColor: invoiceData.depositType === "fixed" ? 'rgba(10, 132, 255, 0.05)' : 'var(--surface-alt)',
                        borderColor: invoiceData.depositType === "fixed" ? 'var(--primary)' : 'var(--border)'
                      }}
                    >
                      <span className="trades-label">Fixed Amount</span>
                    </button>
                  </div>

                  {/* Percentage Options */}
                  {invoiceData.depositType === "percentage" && (
                    <div className="space-y-3">
                      {/* Preset Percentage Options */}
                      <div>
                        <Label className="mb-2 block">Choose percentage</Label>
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {[10, 20, 30, 40, 50].map((percentage) => (
                            <button
                              key={percentage}
                              onClick={() => setInvoiceData(prev => ({ ...prev, depositAmount: percentage }))}
                              className="p-2 rounded-lg border text-center transition-all"
                              style={{
                                backgroundColor: invoiceData.depositAmount === percentage ? 'rgba(10, 132, 255, 0.1)' : 'var(--surface-alt)',
                                borderColor: invoiceData.depositAmount === percentage ? 'var(--primary)' : 'var(--border)',
                                color: invoiceData.depositAmount === percentage ? 'var(--primary)' : 'var(--ink)'
                              }}
                            >
                              <span className="trades-caption font-medium">{percentage}%</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Percentage Input */}
                      <div>
                        <Label>Custom percentage (%)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 25"
                          min="0"
                          max="100"
                          value={invoiceData.depositAmount && ![10, 20, 30, 40, 50].includes(invoiceData.depositAmount) ? invoiceData.depositAmount : ""}
                          onChange={(e) => setInvoiceData(prev => ({ 
                            ...prev, 
                            depositAmount: parseFloat(e.target.value) || 0 
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fixed Amount Input */}
                  {invoiceData.depositType === "fixed" && (
                    <div>
                      <Label>Amount (£)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 500"
                        min="0"
                        value={invoiceData.depositAmount || ""}
                        onChange={(e) => setInvoiceData(prev => ({ 
                          ...prev, 
                          depositAmount: parseFloat(e.target.value) || 0 
                        }))}
                        onBlur={(e) => {
                          // Format to 2 decimal places on blur
                          const formatted = formatCurrencyInput(e.target.value);
                          setInvoiceData(prev => ({ 
                            ...prev, 
                            depositAmount: formatted 
                          }));
                        }}
                        step="0.01"
                      />
                    </div>
                  )}

                  {/* Job Total Display */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-alt)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                        Job total value:
                      </span>
                      <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>
                        {formatCurrency(getActualJobTotal())}
                      </span>
                    </div>
                    
                    {originalQuote && (
                      <div className="flex justify-between items-center mb-2 text-xs">
                        <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                          From Quote {originalQuote.number}:
                        </span>
                        <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                          {originalQuote.lineItems?.length || 0} items
                        </span>
                      </div>
                    )}
                    
                    {/* Deposit Amount Preview */}
                    {invoiceData.depositAmount && invoiceData.depositAmount > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                          Deposit amount:
                        </span>
                        <span className="trades-body font-medium" style={{ color: 'var(--primary)' }}>
                          {formatCurrency(totals.subtotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


          </div>
        )}

        {/* Step 2: Tax & Terms */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>Tax & Terms</h2>
              <p className="trades-body" style={{ color: 'var(--muted)' }}>
                Configure VAT and payment terms
              </p>
            </div>

            {/* VAT Settings - Show toggle ONLY if VAT was NOT enabled in original quote/job */}
            {/* If quote/job had VAT=false or no quote/job exists, show the toggle */}
            {(originalQuote?.vatEnabled !== true && job?.vatEnabled !== true) && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="trades-label" style={{ color: 'var(--ink)' }}>VAT</div>
                    <div className="trades-caption" style={{ color: 'var(--muted)' }}>
                      Add VAT to this invoice
                    </div>
                  </div>
                  <Switch
                    checked={invoiceData.vatEnabled}
                    onCheckedChange={(checked) => setInvoiceData(prev => ({ ...prev, vatEnabled: checked }))}
                  />
                </div>

                {invoiceData.vatEnabled && (
                  <div className="space-y-4">

                  {/* Preset VAT Rate Options */}
                  <div>
                    <Label className="mb-2 block">Choose VAT rate</Label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[0, 20].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setInvoiceData(prev => ({ ...prev, vatRate: rate }))}
                          className="p-3 rounded-lg border text-center transition-all"
                          style={{
                            backgroundColor: invoiceData.vatRate === rate ? 'rgba(10, 132, 255, 0.1)' : 'var(--surface-alt)',
                            borderColor: invoiceData.vatRate === rate ? 'var(--primary)' : 'var(--border)',
                            color: invoiceData.vatRate === rate ? 'var(--primary)' : 'var(--ink)'
                          }}
                        >
                          <span className="trades-label font-medium">
                            {rate === 0 ? 'No VAT (0%)' : `Standard VAT (${rate}%)`}
                          </span>
                          <div className="trades-caption mt-1" style={{ color: 'var(--muted)' }}>
                            {rate === 0 ? 'Not VAT registered' : 'UK standard rate'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom VAT Rate Input */}
                  <div>
                    <Label>Custom VAT rate (%)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      min="0"
                      max="100"
                      step="0.1"
                      value={invoiceData.vatRate && ![0, 20].includes(invoiceData.vatRate) ? invoiceData.vatRate : ""}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="trades-caption mt-1" style={{ color: 'var(--muted)' }}>
                      Enter custom rate for reduced VAT items (e.g. 5% for energy-saving materials)
                    </p>
                  </div>

                  {/* VAT Amount Preview */}
                  {totals.vatAmount > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-alt)' }}>
                      <div className="flex justify-between items-center">
                        <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                          VAT amount ({invoiceData.vatRate}%):
                        </span>
                        <span className="trades-body font-medium" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(totals.vatAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            )}

            {/* VAT Already Included Info - ONLY show when VAT was ENABLED in original quote/job */}
            {/* This means the amounts already include VAT and user cannot change it */}
            {(originalQuote?.vatEnabled === true || job?.vatEnabled === true) && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                    <span className="text-xs" style={{ color: '#059669' }}>✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="trades-label" style={{ color: '#059669' }}>VAT Already Included</p>
                    <p className="trades-caption mt-1" style={{ color: '#047857' }}>
                      {originalQuote?.vatEnabled === true
                        ? `Your original quote included ${originalQuote.vatRate || 20}% VAT. All invoice amounts already include VAT and cannot be changed.`
                        : `This job was created with ${job?.vatRate || 20}% VAT included. All invoice amounts already include VAT and cannot be changed.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Due Date Section - Redesigned with Calendar Popover */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="mb-3">
                <h3 className="trades-label" style={{ color: 'var(--ink)' }}>Due Date</h3>
                <p className="trades-caption" style={{ color: 'var(--muted)' }}>
                  When payment is expected
                </p>
              </div>
              
              {/* Popover with Calendar */}
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border" 
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <span className="trades-body" style={{ color: invoiceData.dueDate ? 'var(--ink)' : 'var(--muted)' }}>
                      {invoiceData.dueDate ? formatDate(invoiceData.dueDate) : 'Select due date'}
                    </span>
                    <Calendar size={20} className="text-blue-600 flex-shrink-0" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <CalendarComponent
                    mode="single"
                    selected={invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const formattedDate = date.toISOString().split('T')[0];
                        setInvoiceData(prev => ({ ...prev, dueDate: formattedDate }));
                        setIsDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {invoiceData.dueDate && (
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-alt)' }}>
                  <div className="flex justify-between items-center">
                    <span className="trades-caption" style={{ color: 'var(--muted)' }}>
                      Payment due:
                    </span>
                    <span className="trades-caption font-medium" style={{ color: 'var(--ink)' }}>
                      {formatDate(invoiceData.dueDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Terms */}
            <div className="space-y-4">

              {/* Terms & Conditions Section */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="mb-3">
                  <h3 className="trades-h2" style={{ color: 'var(--ink)' }}>Terms & Conditions</h3>
                </div>
                
                <Textarea
                  value={invoiceData.termsAndConditions}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                  placeholder="Enter terms and conditions for this invoice..."
                  className="min-h-[80px] resize-none"
                  style={{ 
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)'
                  }}
                />
                
                <p className="trades-caption mt-2" style={{ color: 'var(--muted)' }}>
                  These terms will appear on the invoice for the client to review
                </p>
              </div>


            </div>
          </div>
        )}

        {/* Step 3: Template Preview */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="trades-h2 mb-2" style={{ color: 'var(--ink)' }}>Preview & Create</h2>
              <p className="trades-body" style={{ color: 'var(--muted)' }}>
                Using {branding.selected_template || 'classic'} template
              </p>
            </div>

            {/* Live Preview Section */}
            <div className="mb-6">
              <h3 className="trades-h2 mb-2 px-4" style={{ color: 'var(--ink)' }}>Live Preview</h3>
              <p className="trades-caption mb-4 px-4" style={{ color: 'var(--muted)' }}>
                See how your invoice will appear when printed or saved as PDF
              </p>

              <div className="px-4">
                <InvoicePreviewCard onViewFullSize={() => setShowFullSizeViewer(true)}>
                  <div className="bg-gray-100" style={{ height: '450px' }}>
                    {templateData && branding && (
                      <A4FitWrapper>
                        <InvoiceA4Page>
                          <div className="pdf-optimized">
                            <TemplateRenderer
                              templateId={branding?.selected_template || 'classic'}
                              document={templateData}
                              documentType="invoice"
                              branding={{
                                logo_url: branding?.logo_url,
                                primary_color: branding?.invoice_use_brand_colors ? branding?.primary_color : '#0A84FF',
                                secondary_color: branding?.invoice_use_brand_colors ? branding?.accent_color : '#42A5F5',
                                business_name: branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business',
                                invoice_use_brand_colors: branding?.invoice_use_brand_colors || false
                              }}
                              logoPosition={branding?.invoice_logo_position || 'left'}
                              preview={true}
                              bankDetails={bankDetails}
                            />
                          </div>
                        </InvoiceA4Page>
                      </A4FitWrapper>
                    )}
                    
                    {(!templateData || !branding) && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="trades-caption text-muted">Loading preview...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </InvoicePreviewCard>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="trades-label mb-3" style={{ color: 'var(--ink)' }}>Invoice Summary</h3>
              
              {/* Collapsed View - Amount Due */}
              {!showBreakdown && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="trades-h2" style={{ color: 'var(--ink)' }}>Amount Due</span>
                    <span className="trades-h2" style={{ color: 'var(--ink)' }}>{formatCurrency(totals.total)}</span>
                  </div>
                  <button
                    onClick={() => setShowBreakdown(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all hover:opacity-80 active:opacity-60"
                    style={{ color: 'var(--primary)', backgroundColor: 'transparent' }}
                  >
                    <span className="trades-body">View Breakdown</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 0.2s' }}>
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
              
              {/* Expanded View - Full Breakdown */}
              {showBreakdown && (
                <div className="space-y-4">
                  {/* Hide Breakdown Button */}
                  <button
                    onClick={() => setShowBreakdown(false)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all hover:opacity-80 active:opacity-60"
                    style={{ color: 'var(--primary)', backgroundColor: 'transparent' }}
                  >
                    <span className="trades-body">Hide Breakdown</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(180deg)', transition: 'transform 0.2s' }}>
                      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {/* Project Breakdown */}
                  <div className="space-y-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="trades-label" style={{ color: 'var(--ink)' }}>📊 Project Breakdown</span>
                    </div>
                    <div className="flex justify-between pl-4">
                      <span className="trades-body" style={{ color: 'var(--muted)' }}>Subtotal</span>
                      <span className="trades-body" style={{ color: 'var(--muted)' }}>{formatCurrency(job?.subtotal || originalQuote?.subtotal || getActualJobSubtotal())}</span>
                    </div>
                    {(job?.vatEnabled || originalQuote?.vatEnabled) && (
                      <div className="flex justify-between pl-4">
                        <span className="trades-body" style={{ color: 'var(--muted)' }}>VAT ({job?.vatRate || originalQuote?.vatRate || 20}%)</span>
                        <span className="trades-body" style={{ color: 'var(--muted)' }}>{formatCurrency(job?.vatAmount || originalQuote?.vatAmount || ((job?.subtotal || originalQuote?.subtotal || getActualJobSubtotal()) * (job?.vatRate || originalQuote?.vatRate || 20) / 100))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-1">
                      <span className="trades-body" style={{ color: 'var(--ink)' }}>Project Total</span>
                      <span className="trades-body" style={{ color: 'var(--ink)' }}>{formatCurrency(getActualJobTotal())}</span>
                    </div>
                  </div>
                  
                  {/* Previous Invoices (only show if > 0) */}
                  {previousInvoicesTotal > 0 && (
                    <div className="space-y-2 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between">
                        <span className="trades-body" style={{ color: 'var(--muted)' }}>Previous Invoices</span>
                        <span className="trades-body" style={{ color: 'var(--muted)' }}>-{formatCurrency(previousInvoicesTotal)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* This Invoice */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="trades-label" style={{ color: 'var(--ink)' }}>
                        📄 This Invoice
                        {invoiceData.billType === 'deposit' && invoiceData.depositType === 'percentage' && ` (${invoiceData.depositAmount}% Deposit)`}
                        {invoiceData.billType === 'deposit' && invoiceData.depositType === 'fixed' && ` (Deposit)`}
                        {invoiceData.billType === 'remaining' && ` (Remaining Balance)`}
                        {invoiceData.billType === 'full' && ` (Full Payment)`}
                      </span>
                    </div>
                    {invoiceData.billType === 'full' ? (
                      <>
                        <div className="flex justify-between pl-4">
                          <span className="trades-body" style={{ color: 'var(--ink)' }}>Subtotal</span>
                          <span className="trades-body" style={{ color: 'var(--ink)' }}>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        {totals.vatAmount > 0 && (
                          <div className="flex justify-between pl-4">
                            <span className="trades-body" style={{ color: 'var(--ink)' }}>VAT ({job?.vatRate || originalQuote?.vatRate || 20}%)</span>
                            <span className="trades-body" style={{ color: 'var(--ink)' }}>{formatCurrency(totals.vatAmount)}</span>
                          </div>
                        )}
                      </>
                    ) : null}
                    <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span className="trades-h2" style={{ color: 'var(--ink)' }}>Amount Due</span>
                      <span className="trades-h2" style={{ color: 'var(--ink)' }}>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                  
                  {/* Remaining Balance (only show if not full invoice and there's remaining amount) */}
                  {invoiceData.billType !== 'full' && (getActualJobTotal() - previousInvoicesTotal - totals.total) > 0 && (
                    <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between">
                        <span className="trades-body" style={{ color: 'var(--muted)' }}>💰 Remaining Balance</span>
                        <span className="trades-body" style={{ color: 'var(--muted)' }}>{formatCurrency(getActualJobTotal() - previousInvoicesTotal - totals.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="absolute bottom-20 left-0 right-0 px-4 pb-2">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex items-center justify-center px-6 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              style={{ 
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #E5E7EB',
                color: '#111827',
                minWidth: '100px'
              }}
            >
              <span className="trades-body">Back</span>
            </button>
          )}
          
          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceedToNextStep()}
              className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition-all disabled:opacity-50"
              style={{ 
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#0A84FF',
                color: '#FFFFFF',
                border: 'none'
              }}
            >
              <span className="trades-body">Continue</span>
            </button>
          ) : (
            <button 
              onClick={handleCreateInvoice} 
              className="flex-1 flex items-center justify-center gap-3 hover:opacity-90 active:opacity-80 transition-all"
              style={{ 
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#0A84FF',
                color: '#FFFFFF',
                border: 'none'
              }}
            >
              <Send size={20} />
              <span className="trades-body">Create & Send</span>
            </button>
          )}
        </div>
      </div>

      {/* Full-Size A4 Invoice Viewer Modal */}
      {templateData && branding && (
        <InvoiceA4Viewer
          isOpen={showFullSizeViewer}
          onClose={() => setShowFullSizeViewer(false)}
          title="Invoice Preview"
          onExport={() => {
            // Use existing download handler
            toast.success('Export feature coming soon');
          }}
        >
          <div className="pdf-optimized">
            <TemplateRenderer
              templateId={branding?.selected_template || 'classic'}
              document={templateData}
              documentType="invoice"
              branding={{
                logo_url: branding?.logo_url,
                primary_color: branding?.invoice_use_brand_colors ? branding?.primary_color : '#0A84FF',
                secondary_color: branding?.invoice_use_brand_colors ? branding?.accent_color : '#42A5F5',
                business_name: branding?.business_name || businessData?.companyName || businessData?.company_name || 'Your Business',
                invoice_use_brand_colors: branding?.invoice_use_brand_colors || false
              }}
              logoPosition={branding?.invoice_logo_position || 'left'}
              preview={true}
              bankDetails={bankDetails}
            />
          </div>
        </InvoiceA4Viewer>
      )}
    </div>
  );
}