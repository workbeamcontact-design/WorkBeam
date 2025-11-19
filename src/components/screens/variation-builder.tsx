import { Camera, Plus, Send } from "lucide-react";
import { useState, useMemo } from "react";
import { AppBar } from "../trades-ui/app-bar";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { toast } from "sonner@2.0.3";
import { downloadVariationAndOpenWhatsApp } from "../../utils/pdf-generator";
import { formatPhoneForWhatsApp } from "../../utils/phone-utils";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { sanitizeCurrency, sanitizeText } from "../../utils/sanitization";
import { formatCurrencyInput } from "../../utils/currency-input";

interface VariationBuilderProps {
  job?: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function VariationBuilder({ job, onNavigate, onBack }: VariationBuilderProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedMoney, setSelectedMoney] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [description, setDescription] = useState("");

  // Autosave configuration
  const formData = useMemo(() => ({
    photos,
    selectedMoney,
    selectedTime,
    customAmount,
    description
  }), [photos, selectedMoney, selectedTime, customAmount, description]);

  const autosave = useAutosave(formData, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only
      console.log('Variation draft saved');
    },
    storageKey: 'variation-builder-draft',
    enabled: !!(description.trim() || customAmount || selectedMoney) // Only save if user has input
  });

  const moneyChips = [50, 80, 100, 250];
  const timeChips = [0.5, 1, 2];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleCameraCapture = () => {
    // Simplified photo capture - in production this would use device camera
    const newPhoto = `photo_${photos.length + 1}.jpg`;
    setPhotos([...photos, newPhoto]);
    toast.success("Photo captured");
  };

  const handleSendForApproval = async () => {
    // Validate input
    const amount = customAmount ? parseFloat(customAmount) : selectedMoney || 0;
    
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      toast.error("Please add a description for the variation");
      return;
    }

    // Sanitize data
    const sanitizedAmount = sanitizeCurrency(amount);
    const sanitizedDescription = sanitizeText(description, 2000);
    const sanitizedTimeEstimate = selectedTime ? sanitizeCurrency(selectedTime) : null;

    const variationData = {
      id: `var-${Date.now()}`,
      job,
      photos,
      amount: sanitizedAmount,
      timeEstimate: sanitizedTimeEstimate,
      description: sanitizedDescription,
      dateCreated: new Date().toISOString()
    };

    try {
      // Get client data from job
      const clientPhone = job?.phone || job?.clientPhone || '';
      
      if (!clientPhone) {
        toast.error('Client phone number not available. Please add a phone number to the job.');
        return;
      }

      const clientData = {
        name: job?.client || "Client Name",
        phone: clientPhone,
        address: job?.address || "Client Address"
      };

      await downloadVariationAndOpenWhatsApp(
        variationData,
        clientData,
        formatPhoneForWhatsApp(clientPhone, '+44')
      );
      
      // Clear autosave draft on success
      autosave.clearDraft();
      
      toast.success("Variation downloaded! WhatsApp opened with pre-filled message.");
      onNavigate("variation-approval", variationData);
    } catch (error) {
      console.error('Failed to generate variation PDF:', error);
      toast.error('Failed to generate variation PDF');
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: '#E5E7EB' }}>
        <AppBar 
          title="New Variation" 
          onBack={onBack}
          action={!!(description.trim() || customAmount || selectedMoney) ? <AutosaveStatus state={autosave} /> : undefined}
        />
        <div className="px-4 pb-3">
          <h2 className="trades-body font-medium" style={{ color: '#111827' }}>
            {job?.title || "Window Installation"}
          </h2>
          <p className="trades-caption" style={{ color: '#6B7280' }}>
            {formatDate(new Date())}
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-4">
          {/* Large Camera CTA full width */}
          <button
            onClick={handleCameraCapture}
            className="w-full bg-white border-2 border-dashed rounded-xl p-8 mb-4 hover:bg-gray-50 transition-colors min-h-[120px] flex flex-col items-center justify-center"
            style={{ borderColor: '#E5E7EB' }}
          >
            <Camera size={32} style={{ color: '#6B7280' }} className="mb-2" />
            <span className="trades-body" style={{ color: '#6B7280' }}>
              Take Photo of Work Required
            </span>
          </button>

          {/* Photo grid below */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-6">
              {photos.map((photo, index) => (
                <div key={index} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <Camera size={20} style={{ color: '#6B7280' }} />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-xl p-3 border mb-4" style={{ borderColor: '#E5E7EB' }}>
            <label className="trades-label block mb-2" style={{ color: '#111827' }}>
              Description
            </label>
            <Textarea
              placeholder="Describe the additional work required..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-0 p-0 resize-none"
              style={{ backgroundColor: 'transparent', color: '#111827' }}
            />
          </div>

          {/* Money chips in first row */}
          <div className="mb-4">
            <h3 className="trades-label mb-2" style={{ color: '#111827' }}>Cost Estimate</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {moneyChips.map(amount => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedMoney(amount);
                    setCustomAmount("");
                  }}
                  className="px-3 py-2 rounded-lg border min-h-[44px] transition-colors"
                  style={{ 
                    backgroundColor: selectedMoney === amount ? '#EFF6FF' : 'white',
                    borderColor: selectedMoney === amount ? '#0A84FF' : '#E5E7EB',
                    color: selectedMoney === amount ? '#0A84FF' : '#111827'
                  }}
                >
                  <span className="trades-label">£{amount}</span>
                </button>
              ))}
            </div>
            
            {/* Custom Amount input inline */}
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
                    setCustomAmount(value);
                    setSelectedMoney(null);
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

          {/* Time chips in second row */}
          <div className="mb-6">
            <h3 className="trades-label mb-2" style={{ color: '#111827' }}>Time Estimate</h3>
            <div className="flex flex-wrap gap-2">
              {timeChips.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className="px-3 py-2 rounded-lg border min-h-[44px] transition-colors"
                  style={{ 
                    backgroundColor: selectedTime === time ? '#EAF7EE' : 'white',
                    borderColor: selectedTime === time ? '#16A34A' : '#E5E7EB',
                    color: selectedTime === time ? '#16A34A' : '#111827'
                  }}
                >
                  <span className="trades-label">{time}h</span>
                </button>
              ))}
            </div>
          </div>

          {/* Yellow info box */}
          <div className="rounded-lg p-3 mb-6" style={{ backgroundColor: '#FFF7E6', borderColor: '#F59E0B', border: '1px solid' }}>
            <p className="trades-caption" style={{ color: '#92400E' }}>
              By approving, client agrees to additional cost and time required for this variation.
            </p>
          </div>
        </div>
      </div>

      {/* Primary button */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <Button
          onClick={handleSendForApproval}
          disabled={!description.trim() || (!selectedMoney && !customAmount)}
          className="w-full min-h-[44px] hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
          style={{ backgroundColor: '#0A84FF' }}
        >
          <Send size={16} className="mr-2" />
          <span className="trades-body">Send for Approval</span>
        </Button>
      </div>
    </div>
  );
}