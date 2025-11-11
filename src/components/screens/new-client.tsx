import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { CountryCodeSelect } from "../ui/country-code-select";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";
import { formatPhoneForDisplay, isValidPhoneNumber } from "../../utils/phone-utils";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { clientSchema, validate, formatValidationErrors } from "../../utils/validation.tsx";
import { sanitizeClientInput } from "../../utils/sanitization";

interface NewClientProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function NewClient({ onNavigate, onBack }: NewClientProps) {
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+44"); // Default to UK
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cityPostcode, setCityPostcode] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Autosave draft functionality (saves draft to localStorage only)
  const formData = { fullName, countryCode, phone, address, cityPostcode, email, notes };
  const autosave = useAutosave(formData, {
    delay: 3000,
    onSave: async (data) => {
      // For new client, only save draft to localStorage (not to API)
      // The actual client creation happens on form submit
      console.log('Draft saved to localStorage');
    },
    storageKey: 'new-client-draft',
    enabled: !!(fullName || phone || address) // Only enable if user has started typing
  });

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format phone number with country code
    const formattedPhone = countryCode + phone.trim().replace(/^0/, '');
    
    // Prepare client data
    const clientData = {
      name: fullName.trim(),
      phone: formattedPhone,
      address: `${address.trim()}, ${cityPostcode.trim()}`,
      email: email.trim(),
      notes: notes.trim()
    };

    // Sanitize input
    const sanitized = sanitizeClientInput(clientData);

    // Validate with schema
    const validation = validate(clientSchema, sanitized);
    
    if (!validation.success) {
      const errorMessages = formatValidationErrors(validation.errors!);
      toast.error(errorMessages[0] || "Please check your input");
      console.log('Validation errors:', validation.errors);
      return;
    }

    try {
      setSaving(true);
      
      // Create new client via API with validated data
      const newClient = await api.createClient(validation.data!);

      if (newClient) {
        // Clear autosave draft on successful creation
        autosave.clearDraft();
        toast.success("Client saved successfully");
        // Navigate to the new client's detail page
        onNavigate("client-detail", newClient);
      } else {
        toast.error("Failed to save client");
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error("Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <div className="px-4 py-4 bg-white border-b" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
          >
            <ArrowLeft size={20} style={{ color: '#6B7280' }} />
          </button>
          <div className="flex-1">
            <h1 className="trades-h1" style={{ color: '#111827' }}>New Client</h1>
            {/* Draft autosave status */}
            <AutosaveStatus state={autosave} />
          </div>
        </div>
      </div>
      
      {/* Auto Layout vertical stack with 16px spacing */}
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-4 pt-4 space-y-4">
          <form onSubmit={handleSaveClient} className="space-y-4">
            {/* Full Name - Required */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="fullName" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Full Name *
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter full name…"
                className="h-11 border-0 p-0"
                style={{ backgroundColor: 'transparent', color: '#111827' }}
                required
              />
            </div>

            {/* Country Code - Required */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="countryCode" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Country *
              </Label>
              <CountryCodeSelect
                value={countryCode}
                onValueChange={setCountryCode}
                className="border-0 p-0"
              />
            </div>

            {/* Phone Number - Required */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="phone" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={countryCode === '+44' ? "07123 456 789" : "Enter phone number"}
                className="h-11 border-0 p-0"
                style={{ backgroundColor: 'transparent', color: '#111827' }}
                required
              />
              <p className="trades-caption mt-2" style={{ color: '#6B7280' }}>
                Mobile preferred; WhatsApp used for messages.
              </p>
            </div>

            {/* Address - Required */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="address" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Address *
              </Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address…"
                className="h-11 border-0 p-0"
                style={{ backgroundColor: 'transparent', color: '#111827' }}
                required
              />
            </div>

            {/* City & Postcode - Required */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="cityPostcode" className="trades-label block mb-2" style={{ color: '#111827' }}>
                City & Postcode *
              </Label>
              <Input
                id="cityPostcode"
                type="text"
                value={cityPostcode}
                onChange={(e) => setCityPostcode(e.target.value)}
                placeholder="Manchester M1…"
                className="h-11 border-0 p-0"
                style={{ backgroundColor: 'transparent', color: '#111827' }}
                required
              />
            </div>

            {/* Email - Optional */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="email" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="h-11 border-0 p-0"
                style={{ backgroundColor: 'transparent', color: '#111827' }}
              />
            </div>

            {/* Notes - Optional, multi-line expandable */}
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: '#E5E7EB' }}>
              <Label htmlFor="notes" className="trades-label block mb-2" style={{ color: '#111827' }}>
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional client information…"
                rows={3}
                className="border-0 p-0 resize-none min-h-[72px]"
                style={{ backgroundColor: 'transparent', color: '#111827' }}
              />
            </div>

            {/* Microcopy */}
            <div className="pt-2">
              <p className="trades-caption text-center" style={{ color: '#6B7280' }}>
                We never share your details. By saving, you agree to be contacted regarding your job.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom pinned CTA positioned above navigation */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <button
          onClick={handleSaveClient}
          disabled={!fullName.trim() || !phone.trim() || !address.trim() || !cityPostcode.trim() || saving}
          className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
          style={{ 
            backgroundColor: '#0A84FF',
            color: 'white',
            height: '56px',
            borderRadius: '12px',
            minHeight: '44px'
          }}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="trades-body">Saving...</span>
            </>
          ) : (
            <>
              <Plus size={20} />
              <span className="trades-body">Save Client</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}