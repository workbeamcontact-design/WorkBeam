import { Receipt, Share, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { AppBar } from "../trades-ui/app-bar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner@2.0.3";
import { formatCurrencyInput } from "../../utils/currency-input";

interface PaymentRecorderProps {
  job?: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function PaymentRecorder({ job, onNavigate, onBack }: PaymentRecorderProps) {
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [showShareStrip, setShowShareStrip] = useState(false);
  
  // Calculate outstanding balance from job data if available
  // TODO: This should be fetched from the invoice/payments API
  const outstanding = job?.totalAmount || 0;
  const half = outstanding / 2;
  
  const amountChips = [
    { label: `£${outstanding} Outstanding`, value: outstanding },
    { label: `£${half} Half`, value: half }
  ];

  const handleSavePayment = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    
    if (!paymentType || !paymentMethod || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Show success toast with green styling and receipt ready message
    toast.success(`£${amount} ${paymentMethod.toLowerCase()} recorded · Receipt ready to share`, {
      style: { backgroundColor: '#EAF7EE', color: '#16A34A' }
    });
    
    setShowShareStrip(true);
  };

  const handleShare = (method: string) => {
    if (method === 'whatsapp') {
      window.open('https://wa.me/?text=Payment receipt attached', '_blank');
    } else if (method === 'copy') {
      navigator.clipboard.writeText('Payment receipt details copied');
      toast.success("Receipt details copied");
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
      <AppBar title="Record Payment" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-4">
          {/* Running balance banner at top */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="trades-h2" style={{ color: '#111827' }}>Current Balance</h3>
                <p className="trades-caption" style={{ color: '#6B7280' }}>{job?.client?.name || 'Client'}</p>
              </div>
              <div className="text-right">
                <p className="trades-h2" style={{ color: '#DC2626' }}>£{outstanding}</p>
              </div>
            </div>
          </div>

          {/* Payment Type selector */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Payment Type
            </label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="h-11" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="stage">Stage Payment</SelectItem>
                <SelectItem value="final">Final Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method selector */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Payment Method
            </label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-11" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="card">Card Payment</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount chips auto-calculated */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Amount
            </label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {amountChips.map(chip => (
                <button
                  key={chip.value}
                  onClick={() => {
                    setSelectedAmount(chip.value);
                    setCustomAmount("");
                  }}
                  className="px-3 py-2 rounded-lg border min-h-[44px] transition-colors"
                  style={{ 
                    backgroundColor: selectedAmount === chip.value ? '#EAF7EE' : 'white',
                    borderColor: selectedAmount === chip.value ? '#16A34A' : '#E5E7EB',
                    color: selectedAmount === chip.value ? '#16A34A' : '#111827'
                  }}
                >
                  <span className="trades-label">{chip.label}</span>
                </button>
              ))}
            </div>
            
            {/* Custom amount with £ prefix */}
            <div className="flex items-center gap-2">
              <span className="trades-label" style={{ color: '#6B7280' }}>Custom:</span>
              <div className="flex items-center">
                <span className="trades-label mr-1" style={{ color: '#6B7280' }}>£</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={customAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow typing but validate on blur
                    setCustomAmount(value);
                    setSelectedAmount(null);
                  }}
                  onBlur={(e) => {
                    // Format to 2 decimal places on blur
                    const formatted = formatCurrencyInput(e.target.value);
                    setCustomAmount(formatted > 0 ? formatted.toFixed(2) : '');
                  }}
                  step="0.01"
                  min="0"
                  className="w-24 h-11"
                  style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                />
              </div>
            </div>
          </div>

          {/* Reference field */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Reference
            </label>
            <Input
              placeholder="Transaction reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-11"
              style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }}
            />
          </div>

          {/* Notes field */}
          <div className="bg-white rounded-xl p-3 border mb-6" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Notes
            </label>
            <Textarea
              placeholder="Additional payment notes..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-0 p-0 resize-none"
              style={{ backgroundColor: 'transparent', color: '#111827' }}
            />
          </div>

          {/* Share strip (appears after save) */}
          {showShareStrip && (
            <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#16A34A', backgroundColor: '#EAF7EE' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={16} style={{ color: '#16A34A' }} />
                  <span className="trades-label" style={{ color: '#16A34A' }}>Receipt Ready</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg min-h-[44px] hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: '#16A34A', color: 'white' }}
                  >
                    <MessageCircle size={14} />
                    <span className="trades-caption">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleShare('copy')}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg border min-h-[44px] hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#16A34A', color: '#16A34A' }}
                  >
                    <Copy size={14} />
                    <span className="trades-caption">Copy</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <Button
          onClick={handleSavePayment}
          disabled={!paymentType || !paymentMethod || (!selectedAmount && !customAmount)}
          className="w-full min-h-[44px] hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
          style={{ backgroundColor: '#0A84FF' }}
        >
          <Receipt size={16} className="mr-2" />
          <span className="trades-body">Save & Share Receipt</span>
        </Button>
      </div>
    </div>
  );
}