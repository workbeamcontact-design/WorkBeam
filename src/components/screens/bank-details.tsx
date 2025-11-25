import React, { useState, useEffect } from 'react';
import { ScreenLayout, SaveFooter } from '../ui/screen-layout';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner@2.0.3';
import { api } from '../../utils/api';
import { Banknote, Building2, CreditCard, Hash } from 'lucide-react';
import { useAutosave, AutosaveStatus } from '../../hooks/useAutosave';
import { bankDetailsSchema, validate, formatValidationErrors } from '../../utils/validation.tsx';
import { sanitizeText } from '../../utils/sanitization';

interface BankDetails {
  account_holder_name: string;
  bank_name: string;
  sort_code: string;
  account_number: string;
  iban?: string;
  show_on_invoice?: boolean;
}

interface BankDetailsProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function BankDetails({ onNavigate, onBack }: BankDetailsProps) {
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_holder_name: '',
    bank_name: '',
    sort_code: '',
    account_number: '',
    iban: '',
    show_on_invoice: false
  });

  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialData, setInitialData] = useState<BankDetails | null>(null);

  // Autosave configuration
  const autosave = useAutosave(bankDetails, {
    delay: 3000,
    onSave: async (data) => {
      // Silent save to localStorage only
      console.log('Bank details draft saved');
    },
    storageKey: 'bank-details-draft',
    enabled: hasUnsavedChanges
  });

  // Load existing bank details
  useEffect(() => {
    loadBankDetails();
  }, []);

  // Track changes
  useEffect(() => {
    if (initialData) {
      const hasChanges = JSON.stringify(bankDetails) !== JSON.stringify(initialData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [bankDetails, initialData]);

  const loadBankDetails = async () => {
    try {
      const data = await api.getBankDetails();
      if (data) {
        setBankDetails(data);
        setInitialData(data);
      }
    } catch (error) {
      console.error('Failed to load bank details:', error);
    }
  };

  const handleSave = async () => {
    // Prepare data for validation
    const dataToValidate = {
      accountName: sanitizeText(bankDetails.account_holder_name, 100),
      accountNumber: bankDetails.account_number,
      sortCode: bankDetails.sort_code,
      bankName: sanitizeText(bankDetails.bank_name || '', 100),
      iban: sanitizeText(bankDetails.iban || '', 34),
      swiftBic: '' // Not in current form but in schema
    };

    // Validate with schema
    const validation = validate(bankDetailsSchema, dataToValidate);
    
    if (!validation.success) {
      const errorMessages = formatValidationErrors(validation.errors!);
      toast.error(errorMessages[0] || "Please check your input");
      console.log('Validation errors:', validation.errors);
      return;
    }

    setSaving(true);
    try {
      await api.updateBankDetails(bankDetails);
      
      // Clear autosave draft on success
      autosave.clearDraft();
      
      setInitialData({ ...bankDetails });
      setHasUnsavedChanges(false);
      toast.success('Bank details saved successfully');
    } catch (error) {
      console.error('Failed to save bank details:', error);
      toast.error('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (initialData) {
      setBankDetails({ ...initialData });
      setHasUnsavedChanges(false);
    }
  };

  // Format sort code as user types (XX-XX-XX)
  const handleSortCodeChange = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as XX-XX-XX
    let formatted = '';
    for (let i = 0; i < digits.length && i < 6; i++) {
      if (i === 2 || i === 4) {
        formatted += '-';
      }
      formatted += digits[i];
    }
    
    setBankDetails(prev => ({ ...prev, sort_code: formatted }));
  };

  // Format account number (numbers only, max 8 digits)
  const handleAccountNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setBankDetails(prev => ({ ...prev, account_number: digits }));
  };

  return (
    <ScreenLayout
      title="Bank Details"
      onBack={onBack}
      footer={
        <SaveFooter
          onSave={handleSave}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      }
    >
      <div className="px-4 pt-4 space-y-4">
        
        {/* Account Information */}
        <Card className="p-4">
          <h2 className="trades-h2 text-ink mb-4">Account Information</h2>
          
          <div className="space-y-4">
            <div>
              <Label className="trades-label text-ink mb-2 block">Account holder name</Label>
              <div className="relative">
                <CreditCard size={20} className="absolute left-3 top-3 text-muted" />
                <Input
                  value={bankDetails.account_holder_name}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, account_holder_name: e.target.value }))}
                  placeholder="e.g. Smith & Sons Ltd"
                  className="pl-10"
                />
              </div>
              <p className="trades-caption text-muted mt-1">
                Name as it appears on your bank account
              </p>
            </div>

            <div>
              <Label className="trades-label text-ink mb-2 block">Bank name</Label>
              <div className="relative">
                <Building2 size={20} className="absolute left-3 top-3 text-muted" />
                <Input
                  value={bankDetails.bank_name}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="e.g. Barclays Bank"
                  className="pl-10"
                />
              </div>
              <p className="trades-caption text-muted mt-1">
                Full name of your bank
              </p>
            </div>
          </div>
        </Card>

        {/* Account Numbers */}
        <Card className="p-4">
          <h2 className="trades-h2 text-ink mb-4">Account Numbers</h2>
          
          <div className="space-y-4">
            <div>
              <Label className="trades-label text-ink mb-2 block">Sort code</Label>
              <div className="relative">
                <Hash size={20} className="absolute left-3 top-3 text-muted" />
                <Input
                  value={bankDetails.sort_code}
                  onChange={(e) => handleSortCodeChange(e.target.value)}
                  placeholder="XX-XX-XX"
                  className="pl-10 font-mono"
                  maxLength={8}
                />
              </div>
              <p className="trades-caption text-muted mt-1">
                6-digit sort code (automatically formatted)
              </p>
            </div>

            <div>
              <Label className="trades-label text-ink mb-2 block">Account number</Label>
              <div className="relative">
                <Banknote size={20} className="absolute left-3 top-3 text-muted" />
                <Input
                  value={bankDetails.account_number}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="12345678"
                  className="pl-10 font-mono"
                  maxLength={8}
                />
              </div>
              <p className="trades-caption text-muted mt-1">
                8-digit account number
              </p>
            </div>

            <div>
              <Label className="trades-label text-ink mb-2 block">IBAN (optional)</Label>
              <div className="relative">
                <Hash size={20} className="absolute left-3 top-3 text-muted" />
                <Input
                  value={bankDetails.iban || ''}
                  onChange={(e) => setBankDetails(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                  placeholder="GB29 NWBK 6016 1331 9268 19"
                  className="pl-10 font-mono"
                />
              </div>
              <p className="trades-caption text-muted mt-1">
                For international transfers (optional)
              </p>
            </div>
          </div>
        </Card>

        {/* Preview - Only show when enabled and details exist */}
        {bankDetails.show_on_invoice && (bankDetails.account_holder_name || bankDetails.bank_name || bankDetails.sort_code || bankDetails.account_number) && (
          <Card className="p-4">
            <h2 className="trades-h2 text-ink mb-4">How this appears on invoices</h2>
            
            <div className="bg-surface-alt rounded-lg p-4">
              <p className="trades-label text-ink mb-2">Bank Transfer Details</p>
              <div className="space-y-1">
                {bankDetails.account_holder_name && (
                  <div className="flex">
                    <span className="w-24 trades-caption text-muted font-medium">Account Name:</span>
                    <span className="trades-caption text-ink">{bankDetails.account_holder_name}</span>
                  </div>
                )}
                {bankDetails.bank_name && (
                  <div className="flex">
                    <span className="w-24 trades-caption text-muted font-medium">Bank:</span>
                    <span className="trades-caption text-ink">{bankDetails.bank_name}</span>
                  </div>
                )}
                {bankDetails.sort_code && (
                  <div className="flex">
                    <span className="w-24 trades-caption text-muted font-medium">Sort Code:</span>
                    <span className="trades-caption text-ink font-mono">{bankDetails.sort_code}</span>
                  </div>
                )}
                {bankDetails.account_number && (
                  <div className="flex">
                    <span className="w-24 trades-caption text-muted font-medium">Account No:</span>
                    <span className="trades-caption text-ink font-mono">{bankDetails.account_number}</span>
                  </div>
                )}
                {bankDetails.iban && (
                  <div className="flex">
                    <span className="w-24 trades-caption text-muted font-medium">IBAN:</span>
                    <span className="trades-caption text-ink font-mono text-xs">{bankDetails.iban}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <p className="trades-caption text-muted">Preview matches invoice display format</p>
            </div>
          </Card>
        )}

        {/* Display Settings */}
        <Card className="p-4">
          <h2 className="trades-h2 text-ink mb-4">Display Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="trades-label text-ink">Show on invoices</Label>
                <p className="trades-caption text-muted">
                  Display bank details on invoices for bank transfers
                </p>
              </div>
              <Switch
                checked={bankDetails.show_on_invoice || false}
                onCheckedChange={(checked) => 
                  setBankDetails(prev => ({ ...prev, show_on_invoice: checked }))
                }
              />
            </div>
          </div>
        </Card>

        {/* Usage Information */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="trades-body font-medium text-ink mb-3">Where will this appear?</p>
          <div className="flex flex-wrap gap-2">
            <div className="bg-white px-3 py-1 rounded-full">
              <span className="trades-caption text-ink">Invoices</span>
            </div>
            <div className="bg-white px-3 py-1 rounded-full">
              <span className="trades-caption text-ink">Quotes</span>
            </div>
            <div className="bg-white px-3 py-1 rounded-full">
              <span className="trades-caption text-ink">Payment instructions</span>
            </div>
          </div>
          {!bankDetails.show_on_invoice && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="trades-caption text-yellow-700">
                💡 Enable "Show on invoices" to display bank details for bank transfers
              </p>
            </div>
          )}
        </div>
      </div>
    </ScreenLayout>
  );
}