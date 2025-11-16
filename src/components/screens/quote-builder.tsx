import { Plus, Trash2, Send, ArrowLeft } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AppBar } from "../trades-ui/app-bar";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { quoteSchema, validate, formatValidationErrors } from "../../utils/validation.tsx";
import { deepSanitize } from "../../utils/sanitization";
import { useBranding } from "../../utils/branding-context";

interface QuoteBuilderProps {
  job?: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function QuoteBuilder({ job, onNavigate, onBack }: QuoteBuilderProps) {
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState(20);
  const [notes, setNotes] = useState("This is a quote for the work described above. Once approved, you will receive an invoice for the deposit amount to begin work.");
  const [quoteTitle, setQuoteTitle] = useState(""); // Add quote title state
  const [jobData, setJobData] = useState<any>(job);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  
  // Use BrandingContext to get live branding data that auto-updates
  const { branding, refreshBranding } = useBranding();

  // Autosave configuration
  const formData = useMemo(() => ({
    quoteTitle,
    lineItems,
    vatEnabled,
    vatRate,
    notes
  }), [quoteTitle, lineItems, vatEnabled, vatRate, notes]);

  const autosave = useAutosave(formData, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only - no API call
      // The actual save happens when user clicks "Send for Approval" or "Preview"
    },
    storageKey: 'quote-builder-draft',
    enabled: lineItems.some(item => item.description.trim().length > 0) // Only autosave if user has started typing
  });

  // Load job and client data on component mount
  useEffect(() => {
    const loadJobData = async () => {
      // Handle direct client data (for new quotes or rejected quote replacement)
      if (job?.client && !job?.id) {
        setClientData(job.client);
        setQuoteTitle(""); // Start with empty title
        setLineItems([{ id: 1, description: "", qty: 1, price: 0 }]);
        await loadPreviewData();
        setLoading(false);
        return;
      }

      // Handle client data passed from rejected quote
      if (job?.clientId && !job?.id) {
        setLoading(true);
        try {
          const client = await api.getClient(job.clientId);
          if (client) {
            setClientData(client);
            setQuoteTitle(""); // Start with empty title
            setLineItems([{ id: 1, description: "", qty: 1, price: 0 }]);
            await loadPreviewData();
          }
        } catch (error) {
          console.error('Failed to load client data:', error);
          toast.error('Failed to load client information');
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!job?.id) {
        // No job provided, start with basic empty state
        setQuoteTitle(""); // Start with empty title
        setLineItems([{ id: 1, description: "", qty: 1, price: 0 }]);
        await loadPreviewData();
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Load full job data
        const fullJob = await api.getJob(job.id);
        if (fullJob) {
          setJobData(fullJob);
          setQuoteTitle(""); // Start with empty title even for existing jobs
          
          // Load client data
          if (fullJob.clientId) {
            const client = await api.getClient(fullJob.clientId);
            setClientData(client);
          } else if (job?.client) {
            // Fallback to client data passed with job
            setClientData(job.client);
          }
          
          // Initialize line items from job materials and labour
          const initialLineItems = [];
          
          // Add materials
          if (fullJob.materials && fullJob.materials.length > 0) {
            fullJob.materials.forEach((material: any, index: number) => {
              initialLineItems.push({
                id: `material-${index}`,
                description: material.name || 'Material',
                qty: material.quantity || 1,
                price: material.rate || 0
              });
            });
          }
          
          // Add labour
          if (fullJob.labour && fullJob.labour.length > 0) {
            fullJob.labour.forEach((labour: any, index: number) => {
              initialLineItems.push({
                id: `labour-${index}`,
                description: labour.name || 'Labour',
                qty: labour.hours || 1,
                price: labour.rate || 0
              });
            });
          }
          
          // If no materials or labour, add a blank line item
          if (initialLineItems.length === 0) {
            initialLineItems.push({
              id: 1,
              description: "",
              qty: 1,
              price: 0
            });
          }
          
          setLineItems(initialLineItems);
          setNotes(fullJob.notes || "This is a quote for the work described above. Once approved, you will receive an invoice for the deposit amount to begin work.");
        }
        
        // Load preview data
        await loadPreviewData();
      } catch (error) {
        console.error('Failed to load job data:', error);
        
        // Check if it's a 404 error (job not found)
        const is404Error = error && (
          error.message?.includes('404') || 
          error.message?.includes('Job not found') ||
          error.status === 404
        );
        
        if (is404Error) {
          console.error(`❌ Job not found (404): Job ID ${job.id} does not exist`);
          toast.error('Job not found');
          
          // Reset to standalone quote mode
          setJobData(null);
          setClientData(job?.client || null);
          setQuoteTitle("");
          setLineItems([{ id: 1, description: "", qty: 1, price: 0 }]);
        } else {
          // Other API errors
          toast.error('Failed to load job data');
          // Fallback to basic job data and empty line item
          setJobData(job);
          setClientData(job?.client || null);
          setLineItems([{ id: 1, description: "", qty: 1, price: 0 }]);
        }
        
        await loadPreviewData();
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, [job?.id]);

  // Refresh branding data when component mounts
  useEffect(() => {
    console.log('📝 Quote Builder mounted - refreshing branding data');
    refreshBranding();
  }, []);

  // Load business details for preview template
  const loadPreviewData = async () => {
    try {
      const business = await api.getBusinessDetails();
      if (business) {
        setBusinessDetails(business);
      }
    } catch (error) {
      console.error('Failed to load business details for preview:', error);
      // Don't show error toast, this is just for preview template
    }
  };
  
  const subtotal = lineItems.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    return sum + (qty * price);
  }, 0);
  const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
  const total = subtotal + vatAmount;

  const addLineItem = () => {
    const newId = `custom-${Date.now()}`;
    setLineItems([...lineItems, { id: newId, description: "", qty: 1, price: 0 }]);
  };

  const removeLineItem = (id: string | number) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string | number, field: string, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSendForApproval = async () => {
    // Prepare quote data for API
    const quoteData = {
      clientId: clientData?.id,
      jobId: jobData?.id,
      title: quoteTitle.trim() || "New Quote",
      description: jobData?.description || "",
      lineItems: lineItems
        .filter(item => item.description.trim())
        .map(item => ({
          description: item.description,
          qty: Number(item.qty) || 1,
          price: Number(item.price) || 0,
          total: (Number(item.qty) || 1) * (Number(item.price) || 0)
        })),
      subtotal,
      vatAmount,
      total,
      vatEnabled,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: notes.trim()
    };

    // Sanitize input
    const sanitized = deepSanitize(quoteData);

    // Validate with schema
    const validation = validate(quoteSchema, sanitized);
    
    if (!validation.success) {
      const errorMessages = formatValidationErrors(validation.errors!);
      toast.error(errorMessages[0] || "Please check your input");
      console.log('Validation errors:', validation.errors);
      return;
    }

    try {
      setLoading(true);

      // Save quote to database with validated data
      const savedQuote = await api.createQuote(validation.data!);
      
      if (savedQuote) {
        // Clear autosave draft on successful creation
        autosave.clearDraft();
        toast.success("Quote created successfully!");
        onNavigate("quote-detail", savedQuote);
      } else {
        toast.error("Failed to create quote");
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error("Failed to create quote");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    // Prepare quote data for API
    const quoteData = {
      clientId: clientData?.id,
      jobId: jobData?.id,
      title: quoteTitle.trim() || "New Quote",
      description: jobData?.description || "",
      lineItems: lineItems
        .filter(item => item.description.trim())
        .map(item => ({
          description: item.description,
          qty: Number(item.qty) || 1,
          price: Number(item.price) || 0,
          total: (Number(item.qty) || 1) * (Number(item.price) || 0)
        })),
      subtotal,
      vatAmount,
      total,
      vatEnabled,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: notes.trim()
    };

    // Sanitize input
    const sanitized = deepSanitize(quoteData);

    // Validate with schema
    const validation = validate(quoteSchema, sanitized);
    
    if (!validation.success) {
      const errorMessages = formatValidationErrors(validation.errors!);
      toast.error(errorMessages[0] || "Please check your input");
      console.log('Validation errors:', validation.errors);
      return;
    }

    try {
      setLoading(true);

      // Save quote to database first with validated data
      const savedQuote = await api.createQuote(validation.data!);
      
      if (savedQuote) {
        autosave.clearDraft();
        toast.success("Quote saved!");
        onNavigate("quote-detail", savedQuote);
      } else {
        toast.error("Failed to save quote for preview");
      }
    } catch (error) {
      console.error('Failed to save quote for preview:', error);
      toast.error("Failed to save quote for preview");
    } finally {
      setLoading(false);
    }
  };

  // Convert current quote data to template format for live preview
  const convertToTemplateFormat = () => {
    if (!businessDetails) return null;

    const companyName = businessDetails?.companyName || 'Your Business';
    
    let businessAddress = '123 Trade Street, Manchester, M1 1AA';
    if (businessDetails?.registeredAddress) {
      const address = businessDetails.tradingAddressDifferent 
        ? businessDetails.tradingAddress 
        : businessDetails.registeredAddress;
        
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
    
    let businessPhone = '0161 123 4567';
    if (businessDetails?.phoneCountryCode && businessDetails?.phoneNumber) {
      businessPhone = `${businessDetails.phoneCountryCode} ${businessDetails.phoneNumber}`;
    }

    return {
      id: 'preview-quote',
      invoice_number: 'QUO-2024-PREVIEW',
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'quote',
      client: {
        id: 'preview-client',
        name: clientData?.name || 'Client Name',
        email: clientData?.email || '',
        phone: clientData?.phone || '',
        address: clientData?.address || ''
      },
      business: {
        name: companyName,
        address: businessAddress,
        phone: businessPhone,
        email: businessDetails?.email || 'info@yourbusiness.co.uk'
      },
      line_items: lineItems.filter(item => item.description.trim()).map((item, index) => ({
        id: `preview-item-${index}`,
        description: item.description,
        quantity: Number(item.qty) || 1,
        rate: Number(item.price) || 0,
        amount: (Number(item.qty) || 1) * (Number(item.price) || 0)
      })),
      subtotal: subtotal,
      vat_amount: vatAmount,
      total: total,
      notes: notes,
      quote_title: quoteTitle.trim() || 'New Quote', // Use "New Quote" as fallback for empty titles
      quote_valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      quote_created_at: new Date().toISOString()
    };
  };

  const templateData = convertToTemplateFormat();

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
        <AppBar title="Quote Builder" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="trades-body" style={{ color: '#6B7280' }}>Loading job data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
      <AppBar 
        title="Quote Builder" 
        onBack={onBack}
        actions={lineItems.some(item => item.description.trim().length > 0) ? <AutosaveStatus state={autosave} /> : undefined}
      />
      
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-4 pt-4">
          {/* Job info header */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <div className="mb-3">
              <Input
                placeholder="New Quote"
                value={quoteTitle}
                onChange={(e) => setQuoteTitle(e.target.value)}
                className="border-0 p-0 h-auto trades-h2 font-semibold text-left"
                style={{ color: '#111827', backgroundColor: 'transparent' }}
              />
            </div>
            <p className="trades-caption" style={{ color: '#6B7280' }}>
              {clientData?.name || "Loading client..."}
            </p>
            {jobData?.address && (
              <p className="trades-caption mt-1" style={{ color: '#6B7280' }}>
                {jobData.address}
              </p>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="trades-h2" style={{ color: '#111827' }}>Items</h3>
            </div>
            
            <div className="space-y-2">
              {lineItems.length === 0 ? (
                <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: '#E5E7EB' }}>
                  <p className="trades-body mb-3" style={{ color: '#6B7280' }}>
                    No items in quote yet
                  </p>
                  <button
                    onClick={addLineItem}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg min-h-[44px] hover:opacity-90 transition-opacity mx-auto"
                    style={{ backgroundColor: '#0A84FF', color: 'white' }}
                  >
                    <Plus size={16} />
                    <span className="trades-label">Add First Item</span>
                  </button>
                </div>
              ) : (
                <>
                  {lineItems.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-xl border" style={{ borderColor: '#E5E7EB' }}>
                    <div className="p-3">
                      {/* Description (70%) */}
                      <div className="mb-2">
                        <Input
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          className="border-0 p-0 h-auto trades-body font-medium"
                          style={{ color: '#111827' }}
                        />
                      </div>
                      
                      {/* Qty (10%) + Price (20%) + Delete */}
                      <div className="flex items-center gap-2">
                        <div className="flex-none w-16">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.qty || ''}
                            onChange={(e) => updateLineItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                            className="h-8 text-center trades-caption"
                            style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                            min="0"
                          />
                        </div>
                        
                        <div className="flex-none w-20">
                          <Input
                            type="number"
                            placeholder="Price"
                            value={item.price || ''}
                            onChange={(e) => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="h-8 text-right trades-caption"
                            style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        <div className="flex-1 text-right">
                          <span className="trades-body font-medium" style={{ color: '#111827' }}>
                            £{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          style={{ color: '#DC2626' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  ))}
                  
                  {/* Add button at bottom of items list */}
                  <button
                    onClick={addLineItem}
                    className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg min-h-[44px] hover:opacity-90 transition-opacity border-2 border-dashed"
                    style={{ borderColor: '#0A84FF', color: '#0A84FF', backgroundColor: 'transparent' }}
                  >
                    <Plus size={16} />
                    <span className="trades-label">Add Item</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* VAT Section */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="trades-label" style={{ color: '#111827' }}>VAT</p>
                  <p className="trades-caption" style={{ color: '#6B7280' }}>Add tax to quote</p>
                </div>
                <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
              </div>

              {vatEnabled && (
                <div className="space-y-3">
                  {/* Preset VAT Rate Options */}
                  <div>
                    <Label className="mb-2 block trades-caption" style={{ color: '#6B7280' }}>Choose VAT rate</Label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[0, 20].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => setVatRate(rate)}
                          className="p-2 rounded-lg border text-center transition-all"
                          style={{
                            backgroundColor: vatRate === rate ? 'rgba(10, 132, 255, 0.1)' : '#F9FAFB',
                            borderColor: vatRate === rate ? '#0A84FF' : '#E5E7EB',
                            color: vatRate === rate ? '#0A84FF' : '#111827'
                          }}
                        >
                          <span className="trades-caption font-medium">
                            {rate === 0 ? 'No VAT (0%)' : `Standard VAT (${rate}%)`}
                          </span>
                          <div className="trades-caption mt-1" style={{ color: '#6B7280' }}>
                            {rate === 0 ? 'Not VAT registered' : 'UK standard rate'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom VAT Rate Input */}
                  <div>
                    <Label className="trades-caption" style={{ color: '#6B7280' }}>Custom VAT rate (%)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5"
                      min="0"
                      max="100"
                      step="0.1"
                      value={vatRate && ![0, 20].includes(vatRate) ? vatRate : ""}
                      onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                      className="h-8 trades-caption"
                      style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                    />
                  </div>

                  {/* VAT Amount Preview */}
                  {vatAmount > 0 && (
                    <div className="p-2 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                      <div className="flex justify-between items-center">
                        <span className="trades-caption" style={{ color: '#6B7280' }}>
                          VAT amount ({vatRate}%):
                        </span>
                        <span className="trades-caption font-medium" style={{ color: '#111827' }}>
                          £{vatAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Totals stacked with £ aligned right */}
          <div className="bg-white rounded-xl p-3 border mb-6" style={{ borderColor: '#E5E7EB' }}>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="trades-body" style={{ color: '#6B7280' }}>Subtotal</span>
                <span className="trades-body" style={{ color: '#111827' }}>£{subtotal.toFixed(2)}</span>
              </div>
              
              {vatEnabled && (
                <div className="flex justify-between">
                  <span className="trades-body" style={{ color: '#6B7280' }}>VAT ({vatRate}%)</span>
                  <span className="trades-body" style={{ color: '#111827' }}>£{vatAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex justify-between">
                  <span className="trades-h2" style={{ color: '#111827' }}>Total</span>
                  <span className="trades-h2" style={{ color: '#111827' }}>£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-white rounded-xl p-3 border mb-6" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Terms & Conditions
            </label>
            <Textarea
              placeholder="Enter terms and conditions for this quote..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="border-0 p-0 resize-none"
              style={{ backgroundColor: 'transparent', color: '#111827' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom buttons positioned above navigation */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <button
          onClick={handleSendForApproval}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl trades-body font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Creating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Create Quote
            </>
          )}
        </button>
      </div>
    </div>
  );
}