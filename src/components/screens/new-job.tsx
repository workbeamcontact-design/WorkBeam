import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AppBar } from "../trades-ui/app-bar";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { jobSchema, validate, formatValidationErrors } from "../../utils/validation.tsx";
import { sanitizeJobInput } from "../../utils/sanitization";
import { formatCurrencyInput } from "../../utils/currency-input";

interface NewJobProps {
  client?: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function NewJob({ client, onNavigate, onBack }: NewJobProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [lineItems, setLineItems] = useState<any[]>([{ id: 1, description: "", qty: 1, price: 0 }]);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState(20);
  const [notes, setNotes] = useState("This job includes all materials and labour as described above. Payment terms will be confirmed in the invoice.");
  const [clientData, setClientData] = useState<any>(client);
  const [saving, setSaving] = useState(false);

  // Autosave configuration
  const formData = useMemo(() => ({
    jobTitle,
    lineItems,
    vatEnabled,
    vatRate,
    notes
  }), [jobTitle, lineItems, vatEnabled, vatRate, notes]);

  const autosave = useAutosave(formData, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only - no API call
      // The actual save happens when user clicks "Create Job"
    },
    storageKey: 'new-job-draft',
    enabled: jobTitle.trim().length > 0 // Only autosave if user has started typing
  });

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
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string | number, field: string, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateJob = async () => {
    // Prepare job data for API
    const jobData = {
      clientId: clientData?.id,
      title: jobTitle.trim(),
      description: "", // No longer collecting job description
      address: clientData?.address || "", // Use client address
      status: "scheduled" as const,
      priority: "medium" as const,
      // CRITICAL FIX: Store subtotal (before VAT) as estimatedValue
      // This prevents VAT double-charging when generating invoices
      estimatedValue: subtotal,  // Store pre-VAT amount
      materials: lineItems
        .filter(item => item.description.trim())
        .map(item => ({
          name: item.description,
          quantity: Number(item.qty) || 1,
          rate: Number(item.price) || 0,
          total: (Number(item.qty) || 1) * (Number(item.price) || 0)
        })),
      labour: [], // Can be expanded later if needed
      notes: notes.trim(),
      // Store VAT settings so invoice can use them
      vatEnabled,
      vatRate,
      // Store calculated amounts for reference
      subtotal,
      vatAmount,
      total  // Total with VAT applied
    };

    // Sanitize input
    const sanitized = sanitizeJobInput(jobData);

    // Validate with schema
    const validation = validate(jobSchema, sanitized);
    
    if (!validation.success) {
      const errorMessages = formatValidationErrors(validation.errors!);
      toast.error(errorMessages[0] || "Please check your input");
      console.log('Validation errors:', validation.errors);
      return;
    }

    try {
      setSaving(true);

      // Create new job via API with validated data
      const newJob = await api.createJob(validation.data!);

      if (newJob) {
        // Clear autosave draft on successful creation
        autosave.clearDraft();
        toast.success("Job created successfully!");
        // Navigate back to client detail page to see the new job in the list
        onNavigate("client-detail", clientData);
      } else {
        toast.error("Failed to create job");
      }
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error("Failed to create job");
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
      <AppBar 
        title="New Job"
        onBack={onBack}
        actions={jobTitle.trim().length > 0 ? <AutosaveStatus state={autosave} /> : undefined}
      />
      
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-4 pt-4">
          {/* Job info header */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <div className="mb-3">
              <Label htmlFor="title" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Job Title *
              </Label>
              <Input
                id="title"
                placeholder="Enter job title..."
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="border-0 p-0 h-auto trades-h2 font-semibold text-left"
                style={{ color: '#111827', backgroundColor: 'transparent' }}
              />
            </div>

            <p className="trades-caption" style={{ color: '#6B7280' }}>
              Client: {clientData?.name || "Loading client..."}
            </p>
            {clientData?.address && (
              <p className="trades-caption mt-1" style={{ color: '#6B7280' }}>
                Address: {clientData.address}
              </p>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="trades-h2" style={{ color: '#111827' }}>Materials & Labour</h3>
            </div>
            
            <div className="space-y-2">
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
                          onBlur={(e) => {
                            // Format to 2 decimal places on blur
                            const formatted = formatCurrencyInput(e.target.value);
                            updateLineItem(item.id, 'price', formatted);
                          }}
                          step="0.01"
                          min="0"
                          className="h-11"
                        />
                      </div>
                      
                      <div className="flex-1 text-right">
                        <span className="trades-body font-medium" style={{ color: '#111827' }}>
                          £{((Number(item.qty) || 0) * (Number(item.price) || 0)).toFixed(2)}
                        </span>
                      </div>
                      
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          style={{ color: '#DC2626' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
            </div>
          </div>

          {/* VAT Section */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="trades-label" style={{ color: '#111827' }}>VAT</p>
                  <p className="trades-caption" style={{ color: '#6B7280' }}>Add tax to job</p>
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

          {/* Live Preview Section - Simplified to avoid timeout issues */}
          <div className="bg-white rounded-xl p-4 border mb-6" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="trades-h2" style={{ color: '#111827' }}>Job Summary</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="trades-label" style={{ color: '#6B7280' }}>Job Title:</span>
                <span className="trades-body" style={{ color: '#111827' }}>{jobTitle || 'Not specified'}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="trades-label" style={{ color: '#6B7280' }}>Items Count:</span>
                <span className="trades-body" style={{ color: '#111827' }}>{lineItems.filter(item => item.description.trim()).length}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="trades-label" style={{ color: '#6B7280' }}>Subtotal:</span>
                <span className="trades-body" style={{ color: '#111827' }}>£{subtotal.toFixed(2)}</span>
              </div>
              
              {vatEnabled && (
                <div className="flex justify-between items-center">
                  <span className="trades-label" style={{ color: '#6B7280' }}>VAT ({vatRate}%):</span>
                  <span className="trades-body" style={{ color: '#111827' }}>£{vatAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: '#E5E7EB' }}>
                <span className="trades-h2" style={{ color: '#111827' }}>Total:</span>
                <span className="trades-h2" style={{ color: '#111827' }}>£{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Job Notes */}
          <div className="bg-white rounded-xl p-3 border mb-6" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Job Notes
            </label>
            <Textarea
              placeholder="Enter notes for this job..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="border-0 p-0 resize-none"
              style={{ backgroundColor: 'transparent', color: '#111827' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom button positioned above navigation */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <button
          onClick={handleCreateJob}
          disabled={!jobTitle.trim() || saving}
          className="w-full bg-blue-600 text-white py-4 rounded-xl trades-body font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Creating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Create Job
            </>
          )}
        </button>
      </div>
    </div>
  );
}