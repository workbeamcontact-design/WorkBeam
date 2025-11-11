import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { CountryCodeSelect } from "../ui/country-code-select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";
import { formatPhoneForDisplay, isValidPhoneNumber } from "../../utils/phone-utils";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { clientSchema, validate, formatValidationErrors } from "../../utils/validation.tsx";
import { sanitizeClientInput } from "../../utils/sanitization";

interface EditClientProps {
  client: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address: string;
    notes?: string;
  };
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function EditClient({ client, onNavigate, onBack }: EditClientProps) {
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+44"); // Default to UK
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cityPostcode, setCityPostcode] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Autosave functionality
  const formData = { fullName, countryCode, phone, address, cityPostcode, email, notes };
  const autosave = useAutosave(formData, {
    delay: 3000, // 3 seconds for edit screen
    onSave: async (data) => {
      // Only autosave if form is valid
      if (!data.fullName.trim() || !data.phone.trim() || !data.address.trim() || !data.cityPostcode.trim()) {
        return; // Skip autosave for invalid data
      }
      
      const formattedPhone = data.countryCode + data.phone.trim().replace(/^0/, '');
      await api.updateClient(client.id, {
        name: data.fullName.trim(),
        phone: formattedPhone,
        address: `${data.address.trim()}, ${data.cityPostcode.trim()}`,
        email: data.email.trim(),
        notes: data.notes.trim()
      });
    },
    onError: (error) => {
      console.warn('Autosave failed:', error);
      // Silently fail - don't disturb user
    },
    storageKey: `edit-client-draft-${client.id}`
  });

  // Initialize form with client data
  useEffect(() => {
    if (client) {
      setFullName(client.name || "");
      setEmail(client.email || "");
      setNotes(client.notes || "");

      // Parse phone number to extract country code
      if (client.phone) {
        // Check for common country codes
        if (client.phone.startsWith('+44')) {
          setCountryCode('+44');
          setPhone(client.phone.substring(3));
        } else if (client.phone.startsWith('+1')) {
          setCountryCode('+1');
          setPhone(client.phone.substring(2));
        } else if (client.phone.startsWith('+')) {
          // Try to extract country code (up to 4 digits)
          const match = client.phone.match(/^(\+\d{1,4})(.*)$/);
          if (match) {
            setCountryCode(match[1]);
            setPhone(match[2]);
          } else {
            setPhone(client.phone);
          }
        } else {
          setPhone(client.phone);
        }
      }

      // Parse address to separate street from city/postcode
      if (client.address) {
        const addressParts = client.address.split(', ');
        if (addressParts.length >= 2) {
          // Last part is likely city/postcode, everything else is street address
          const cityPostcodePart = addressParts[addressParts.length - 1];
          const streetPart = addressParts.slice(0, -1).join(', ');
          setAddress(streetPart);
          setCityPostcode(cityPostcodePart);
        } else {
          setAddress(client.address);
        }
      }
    }
  }, [client]);

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format phone number with country code
    const formattedPhone = countryCode + phone.trim().replace(/^0/, '');
    
    // Prepare client data
    const clientData = {
      id: client.id,
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
      
      // Update client via API with validated data
      const updatedClient = await api.updateClient(client.id, validation.data!);

      if (updatedClient) {
        // Clear autosave draft on successful save
        autosave.clearDraft();
        toast.success("Client updated successfully");
        // Navigate back to client detail with updated data
        onNavigate("client-detail", updatedClient);
      } else {
        toast.error("Failed to update client");
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error("Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    try {
      setDeleting(true);
      setShowDeleteDialog(false);
      
      const result = await api.deleteClient(client.id);
      
      if (result.success) {
        toast.success("Client deleted successfully");
        
        // Clear navigation history to prevent returning to deleted client or their jobs
        const { useAppStore } = await import('../../hooks/useAppStore');
        useAppStore.getState().clearNavigationHistory();
        
        // Force refresh dashboard to remove all references
        useAppStore.getState().refreshDashboard();
        
        // Navigate back to clients list
        onNavigate("clients");
      } else {
        toast.error(result.message || "Failed to delete client");
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error("Failed to delete client");
    } finally {
      setDeleting(false);
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
            <h1 className="trades-h1" style={{ color: '#111827' }}>Edit Client</h1>
            {/* Autosave status */}
            <AutosaveStatus state={autosave} />
          </div>
        </div>
      </div>
      
      {/* Auto Layout vertical stack with 16px spacing */}
      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-4 pt-4 space-y-4">
          <form onSubmit={handleUpdateClient} className="space-y-4">
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
          </form>
        </div>
      </div>

      {/* Bottom pinned CTAs positioned above navigation */}
      <div className="absolute bottom-20 left-0 right-0 px-4">
        <div className="flex gap-3">
          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting || saving}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: '#DC2626',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            {deleting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="trades-body">Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={20} />
                <span className="trades-body">Delete Client</span>
              </>
            )}
          </button>
          
          {/* Update Button */}
          <button
            onClick={handleUpdateClient}
            disabled={!fullName.trim() || !phone.trim() || !address.trim() || !cityPostcode.trim() || saving || deleting}
            className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
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
                <span className="trades-body">Updating...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span className="trades-body">Update Client</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{client?.name}"? This action cannot be undone and will also delete all associated jobs, quotes, and invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}