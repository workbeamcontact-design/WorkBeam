import { useState, useEffect, useMemo } from "react";
import { Input } from "../ui/input";
import { useAutosave, AutosaveStatus } from "../../hooks/useAutosave";
import { businessDetailsSchema, validate, formatValidationErrors } from "../../utils/validation.tsx";
import { sanitizeText, sanitizeEmail, sanitizeUrl } from "../../utils/sanitization";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { CountryCodeSelect } from "../ui/country-code-select";
import { ScreenLayout, SaveFooter } from "../ui/screen-layout";
import { toast } from "sonner@2.0.3";
import { api } from "../../utils/api";

interface BusinessDetailsProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface BusinessData {
  // Company Identity
  companyName: string;
  companyNumber: string;
  vatNumber: string;
  
  // Contacts
  ownerName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  website: string;
  
  // Addresses
  registeredAddress: {
    line1: string;
    line2: string;
    city: string;
    postcode: string;
    country: string;
  };
  tradingAddressDifferent: boolean;
  tradingAddress: {
    line1: string;
    line2: string;
    city: string;
    postcode: string;
    country: string;
  };
  
  // Document Defaults
  defaultVatRate: string;
  customVatRate: number;
  pricesIncludeVat: boolean;
  paymentTerms: string;
  customPaymentDays: number;
  quoteValidity: string;
  customQuoteValidityDays: number;
  
  // Numbering
  invoicePrefix: string;
  invoiceNextNumber: number;
  quotePrefix: string;
  quoteNextNumber: number;
  
  // Default Notes
  invoiceFooter: string;
  quoteFooter: string;
}

const DEFAULT_BUSINESS: BusinessData = {
  companyName: "",
  companyNumber: "",
  vatNumber: "",
  
  ownerName: "",
  email: "",
  phoneCountryCode: "+44",
  phoneNumber: "",
  website: "",
  
  registeredAddress: {
    line1: "",
    line2: "",
    city: "",
    postcode: "",
    country: "United Kingdom"
  },
  tradingAddressDifferent: false,
  tradingAddress: {
    line1: "",
    line2: "",
    city: "",
    postcode: "",
    country: "United Kingdom"
  },
  
  defaultVatRate: "20",
  customVatRate: 20,
  pricesIncludeVat: false,
  paymentTerms: "Net 30",
  customPaymentDays: 30,
  quoteValidity: "30",
  customQuoteValidityDays: 30,
  
  invoicePrefix: "INV-2025-",
  invoiceNextNumber: 1,
  quotePrefix: "Q-2025-",
  quoteNextNumber: 1,
  
  invoiceFooter: "Payment due within 30 days. Thank you for your business.",
  quoteFooter: "This quote is valid for 30 days unless otherwise stated."
};

export function BusinessDetails({ onNavigate, onBack }: BusinessDetailsProps) {
  const [businessData, setBusinessData] = useState<BusinessData>(DEFAULT_BUSINESS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [brandingData, setBrandingData] = useState<any>(null);

  // Autosave configuration
  const autosave = useAutosave(businessData, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only
      console.log('Business details draft saved');
    },
    storageKey: 'business-details-draft',
    enabled: hasUnsavedChanges
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [businessDetails, branding] = await Promise.all([
        api.getBusinessDetails(),
        api.getBranding?.() || Promise.resolve(null)
      ]);
      
      if (businessDetails) {
        // Map the API data back to the UI format
        const mappedData = {
          companyName: businessDetails.legal_name || businessDetails.trading_name || businessDetails.companyName || DEFAULT_BUSINESS.companyName,
          companyNumber: businessDetails.company_number || businessDetails.companyNumber || DEFAULT_BUSINESS.companyNumber,
          vatNumber: businessDetails.vat_number || businessDetails.vatNumber || DEFAULT_BUSINESS.vatNumber,
          
          ownerName: businessDetails.owner_name || businessDetails.ownerName || DEFAULT_BUSINESS.ownerName,
          email: businessDetails.email || DEFAULT_BUSINESS.email,
          phoneCountryCode: businessDetails.phoneCountryCode || DEFAULT_BUSINESS.phoneCountryCode,
          phoneNumber: businessDetails.phoneNumber || (businessDetails.phone?.replace(businessDetails.phoneCountryCode || '+44', '').trim()) || DEFAULT_BUSINESS.phoneNumber,
          website: businessDetails.website || DEFAULT_BUSINESS.website,
          
          // Handle address parsing if saved as strings
          registeredAddress: businessDetails.registeredAddress || {
            line1: businessDetails.registered_address?.split('\n')[0] || DEFAULT_BUSINESS.registeredAddress.line1,
            line2: businessDetails.registered_address?.split('\n')[1] || DEFAULT_BUSINESS.registeredAddress.line2,
            city: businessDetails.registered_address?.split('\n')[2] || DEFAULT_BUSINESS.registeredAddress.city,
            postcode: businessDetails.registered_address?.split('\n')[3] || DEFAULT_BUSINESS.registeredAddress.postcode,
            country: businessDetails.registered_address?.split('\n')[4] || DEFAULT_BUSINESS.registeredAddress.country
          },
          
          tradingAddressDifferent: businessDetails.tradingAddressDifferent ?? DEFAULT_BUSINESS.tradingAddressDifferent,
          
          tradingAddress: businessDetails.tradingAddress || {
            line1: businessDetails.trading_address?.split('\n')[0] || DEFAULT_BUSINESS.tradingAddress.line1,
            line2: businessDetails.trading_address?.split('\n')[1] || DEFAULT_BUSINESS.tradingAddress.line2,
            city: businessDetails.trading_address?.split('\n')[2] || DEFAULT_BUSINESS.tradingAddress.city,
            postcode: businessDetails.trading_address?.split('\n')[3] || DEFAULT_BUSINESS.tradingAddress.postcode,
            country: businessDetails.trading_address?.split('\n')[4] || DEFAULT_BUSINESS.tradingAddress.country
          },
          
          // Copy over other fields that might exist
          defaultVatRate: businessDetails.defaultVatRate || DEFAULT_BUSINESS.defaultVatRate,
          customVatRate: businessDetails.customVatRate || DEFAULT_BUSINESS.customVatRate,
          pricesIncludeVat: businessDetails.pricesIncludeVat ?? DEFAULT_BUSINESS.pricesIncludeVat,
          paymentTerms: businessDetails.paymentTerms || DEFAULT_BUSINESS.paymentTerms,
          customPaymentDays: businessDetails.customPaymentDays || DEFAULT_BUSINESS.customPaymentDays,
          quoteValidity: businessDetails.quoteValidity || DEFAULT_BUSINESS.quoteValidity,
          customQuoteValidityDays: businessDetails.customQuoteValidityDays || DEFAULT_BUSINESS.customQuoteValidityDays,
          invoicePrefix: businessDetails.invoicePrefix || DEFAULT_BUSINESS.invoicePrefix,
          invoiceNextNumber: businessDetails.invoiceNextNumber || DEFAULT_BUSINESS.invoiceNextNumber,
          quotePrefix: businessDetails.quotePrefix || DEFAULT_BUSINESS.quotePrefix,
          quoteNextNumber: businessDetails.quoteNextNumber || DEFAULT_BUSINESS.quoteNextNumber,
          invoiceFooter: businessDetails.invoiceFooter || DEFAULT_BUSINESS.invoiceFooter,
          quoteFooter: businessDetails.quoteFooter || DEFAULT_BUSINESS.quoteFooter,
        };
        
        setBusinessData(mappedData);
      } else {
        // No data returned - use defaults (this is normal for new users)
        console.log('No business details found, using defaults');
      }
      
      if (branding) {
        setBrandingData(branding);
      }
    } catch (error) {
      // API handles fallback to local storage automatically
      // This is expected behavior - not an error
      console.log('✅ Business details loaded from local storage (server unavailable or timeout)');
      // No need to show error toast - local storage fallback is working as intended
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare and sanitize data for validation
      const dataToValidate = {
        companyName: sanitizeText(businessData.companyName, 100),
        legalName: sanitizeText(businessData.companyName, 100),
        tradingName: sanitizeText(businessData.companyName, 100),
        registrationNumber: sanitizeText(businessData.companyNumber, 20),
        vatNumber: sanitizeText(businessData.vatNumber, 20),
        email: sanitizeEmail(businessData.email),
        phone: `${businessData.phoneCountryCode}${businessData.phoneNumber}`,
        phoneCountryCode: businessData.phoneCountryCode,
        phoneNumber: businessData.phoneNumber,
        website: sanitizeUrl(businessData.website),
        registeredAddress: businessData.registeredAddress,
        tradingAddress: businessData.tradingAddress,
        tradingAddressDifferent: businessData.tradingAddressDifferent
      };

      // Validate with schema
      const validation = validate(businessDetailsSchema, dataToValidate);
      
      if (!validation.success) {
        const errorMessages = formatValidationErrors(validation.errors!);
        toast.error(errorMessages[0] || "Please check your input");
        console.log('Validation errors:', validation.errors);
        setSaving(false);
        return;
      }
      
      // Map the data to the format expected by the API
      const mappedData = {
        // Basic company details
        legal_name: businessData.companyName,
        trading_name: businessData.companyName,
        owner_name: businessData.ownerName,
        company_number: businessData.companyNumber,
        vat_number: businessData.vatNumber,
        
        // Contact details
        email: businessData.email,
        phone: `${businessData.phoneCountryCode} ${businessData.phoneNumber}`,
        website: businessData.website,
        
        // Address details
        registered_address: businessData.tradingAddressDifferent 
          ? [
              businessData.registeredAddress.line1,
              businessData.registeredAddress.line2,
              businessData.registeredAddress.city,
              businessData.registeredAddress.postcode,
              businessData.registeredAddress.country
            ].filter(Boolean).join('\n')
          : [
              businessData.registeredAddress.line1,
              businessData.registeredAddress.line2,
              businessData.registeredAddress.city,
              businessData.registeredAddress.postcode,
              businessData.registeredAddress.country
            ].filter(Boolean).join('\n'),
            
        trading_address: businessData.tradingAddressDifferent 
          ? [
              businessData.tradingAddress.line1,
              businessData.tradingAddress.line2,
              businessData.tradingAddress.city,
              businessData.tradingAddress.postcode,
              businessData.tradingAddress.country
            ].filter(Boolean).join('\n')
          : [
              businessData.registeredAddress.line1,
              businessData.registeredAddress.line2,
              businessData.registeredAddress.city,
              businessData.registeredAddress.postcode,
              businessData.registeredAddress.country
            ].filter(Boolean).join('\n'),
        
        // Also save the original structure for UI compatibility
        ...businessData
      };
      
      await api.saveBusinessDetails(mappedData);
      
      // Clear autosave draft on success
      autosave.clearDraft();
      
      setHasUnsavedChanges(false);
      toast.success('Business details saved successfully!');
    } catch (error) {
      console.error('Failed to save business details:', error);
      toast.error('Failed to save business details');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setBusinessData(DEFAULT_BUSINESS);
    setHasUnsavedChanges(false);
    toast.success('Changes discarded');
  };

  const updateField = (field: string, value: any) => {
    setBusinessData(prev => {
      const newData = { ...prev };
      const keys = field.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setHasUnsavedChanges(true);
  };

  const renderRequiredDot = () => (
    <span className="text-red-500 ml-1">•</span>
  );

  return (
    <ScreenLayout
      title="Business Details"
      subtitle="These details appear on quotes and invoices."
      onBack={onBack}
      footer={
        <SaveFooter
          onSave={handleSave}
          onDiscard={handleDiscard}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      }
    >

      {/* Brand Summary Strip */}
      {brandingData && (
        <div className="mx-4 mt-4 p-4 bg-surface rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {brandingData.logo_url && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-border">
                  <img 
                    src={brandingData.logo_url} 
                    alt="Company logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <div className="trades-label text-ink">
                  {businessData.companyName || 'Company Name'}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: brandingData.primary_color || '#0A84FF' }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: brandingData.accent_color || '#16A34A' }}
                  />
                  <span className="trades-caption text-muted">Brand colors</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('branding-logo')}
              className="trades-caption text-primary hover:underline"
            >
              Edit Branding & Logo
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        
        {/* Card 1 - Company Identity */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
            <h3 className="trades-h2 text-ink">Company Identity</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name" className="trades-label text-ink">
                  Company name{renderRequiredDot()}
                </Label>
                <Input
                  id="company-name"
                  value={businessData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="ABC Windows Ltd"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="company-number" className="trades-label text-ink">
                  Company number
                </Label>
                <Input
                  id="company-number"
                  value={businessData.companyNumber}
                  onChange={(e) => updateField('companyNumber', e.target.value)}
                  placeholder="12345678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="vat-number" className="trades-label text-ink">
                  VAT number
                </Label>
                <Input
                  id="vat-number"
                  value={businessData.vatNumber}
                  onChange={(e) => updateField('vatNumber', e.target.value)}
                  placeholder="GB123456789"
                  className="mt-1"
                />
                <p className="trades-caption text-muted mt-1">
                  Appears on invoices when VAT is charged.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 - Contacts */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
            <h3 className="trades-h2 text-ink">Contacts</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="owner-name" className="trades-label text-ink">
                  Owner / Contact person{renderRequiredDot()}
                </Label>
                <Input
                  id="owner-name"
                  value={businessData.ownerName}
                  onChange={(e) => updateField('ownerName', e.target.value)}
                  placeholder="John Smith"
                  className="mt-1"
                />
                <p className="trades-caption text-muted mt-1">
                  This person's name appears in invoice contact details.
                </p>
              </div>

              <div>
                <Label htmlFor="email" className="trades-label text-ink">
                  Email{renderRequiredDot()}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={businessData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="info@abcwindows.co.uk"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="trades-label text-ink">
                  Phone{renderRequiredDot()}
                </Label>
                <div className="flex gap-2 mt-1">
                  <CountryCodeSelect
                    value={businessData.phoneCountryCode}
                    onValueChange={(value) => updateField('phoneCountryCode', value)}
                    className="w-24"
                  />
                  <Input
                    type="tel"
                    value={businessData.phoneNumber}
                    onChange={(e) => updateField('phoneNumber', e.target.value)}
                    placeholder="161 555 0198"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website" className="trades-label text-ink">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={businessData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="abcwindows.co.uk"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Card 3 - Addresses */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
            <h3 className="trades-h2 text-ink">Addresses</h3>
            
            <div className="space-y-4">
              {/* Registered Address */}
              <div>
                <div className="trades-label text-ink mb-3">Registered address</div>
                <div className="space-y-3">
                  <Input
                    value={businessData.registeredAddress.line1}
                    onChange={(e) => updateField('registeredAddress.line1', e.target.value)}
                    placeholder="Address line 1"
                    required
                  />
                  <Input
                    value={businessData.registeredAddress.line2}
                    onChange={(e) => updateField('registeredAddress.line2', e.target.value)}
                    placeholder="Address line 2 (optional)"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={businessData.registeredAddress.city}
                      onChange={(e) => updateField('registeredAddress.city', e.target.value)}
                      placeholder="Town/City"
                      required
                    />
                    <Input
                      value={businessData.registeredAddress.postcode}
                      onChange={(e) => updateField('registeredAddress.postcode', e.target.value)}
                      placeholder="Postcode"
                      required
                    />
                  </div>
                  <Select
                    value={businessData.registeredAddress.country}
                    onValueChange={(value) => updateField('registeredAddress.country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Ireland">Ireland</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 - Numbering */}
          <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
            <h3 className="trades-h2 text-ink">Numbering</h3>
            
            <div className="space-y-4">
              <div>
                <div className="trades-label text-ink mb-3">Invoice numbering</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="trades-caption text-muted">Prefix</Label>
                    <Input
                      value={businessData.invoicePrefix}
                      onChange={(e) => updateField('invoicePrefix', e.target.value)}
                      placeholder="INV-2025-"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="trades-caption text-muted">Next number</Label>
                    <Input
                      type="number"
                      value={businessData.invoiceNextNumber}
                      onChange={(e) => updateField('invoiceNextNumber', Number(e.target.value))}
                      placeholder="001"
                      className="mt-1"
                      min="1"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="trades-label text-ink mb-3">Quote numbering</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="trades-caption text-muted">Prefix</Label>
                    <Input
                      value={businessData.quotePrefix}
                      onChange={(e) => updateField('quotePrefix', e.target.value)}
                      placeholder="Q-2025-"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="trades-caption text-muted">Next number</Label>
                    <Input
                      type="number"
                      value={businessData.quoteNextNumber}
                      onChange={(e) => updateField('quoteNextNumber', Number(e.target.value))}
                      placeholder="001"
                      className="mt-1"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <p className="trades-caption text-muted">
              Numbers advance when a document is issued.
            </p>
          </div>

        </div>
    </ScreenLayout>
  );
}