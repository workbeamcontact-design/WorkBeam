import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { AppBar } from '../trades-ui/app-bar';
import { api } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { useBranding } from '../../utils/branding-context';

// New A4 Preview Components
import { InvoicePreviewCard } from '../ui/invoice-preview-card';
import { A4FitWrapper } from '../ui/a4-fit-wrapper';
import { InvoiceA4Page } from '../ui/invoice-a4-page';
import { InvoiceA4Viewer } from '../ui/invoice-a4-viewer';

// Template Components
import { ClassicTemplate } from '../ui/invoice-templates/classic-template';
import { ModernTemplate } from '../ui/invoice-templates/modern-template';
import { MinimalTemplate } from '../ui/invoice-templates/minimal-template';
import { CorporateTemplate } from '../ui/invoice-templates/corporate-template';
import { CreativeTemplate } from '../ui/invoice-templates/creative-template';
import { ProfessionalTemplate } from '../ui/invoice-templates/professional-template';

interface NavigationProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
  template: {
    id: string;
    name: string;
    description: string;
  };
}

interface BrandingData {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  business_name?: string;
}

const templateComponents = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  corporate: CorporateTemplate,
  creative: CreativeTemplate,
  professional: ProfessionalTemplate
};

// Sample invoice data for previews
const sampleInvoiceData = {
  invoice_number: 'INV-2024-001',
  issue_date: '15/01/2024',
  due_date: '15/02/2024',
  client: {
    name: 'John Smith',
    email: 'john.smith@example.com',
    address: '123 High Street\nLondon\nSW1A 1AA'
  },
  business: {
    name: 'Your Business Name',
    address: '456 Business Road\nLondon\nE1 6AN',
    phone: '020 1234 5678',
    email: 'info@yourbusiness.com'
  },
  items: [
    { description: 'Kitchen Installation', quantity: 1, rate: 2500.00, amount: 2500.00 },
    { description: 'Additional Electrical Work', quantity: 3, rate: 85.00, amount: 255.00 }
  ],
  subtotal: 2755.00,
  vat_rate: 20,
  vat_amount: 551.00,
  total: 3306.00,
  status: 'pending'
};

export function InvoiceTemplatePreview({ onNavigate, onBack, template }: NavigationProps) {
  const { branding, setBranding, saveBranding, refreshBranding, loading } = useBranding();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showFullSizeViewer, setShowFullSizeViewer] = useState(false);
  const [bankDetails, setBankDetails] = useState<any>(null);

  // Check if template data is missing
  if (!template) {
    return (
      <div className="flex flex-col h-full bg-white">
        <AppBar 
          title="Template Preview"
          onBack={onBack}
          showBack 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="trades-body text-gray-600 mb-4">Template data is missing</p>
            <button 
              onClick={onBack}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl trades-body hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Refresh branding data when component mounts to ensure we have the latest
  useEffect(() => {
    console.log('📄 Invoice Template Preview mounted - refreshing branding data');
    refreshBranding();
  }, []);

  // Wait for branding context to load
  useEffect(() => {
    if (!loading) {
      loadBankDetails();
      setIsLoading(false);
    }
  }, [loading]);

  const loadBankDetails = async () => {
    try {
      const bankData = await api.getBankDetails();
      setBankDetails(bankData);
    } catch (error) {
      console.error('Failed to load bank details:', error);
    }
  };

  const handleUseTemplate = async () => {
    setIsSaving(true);
    try {
      console.log('💾 Saving template from preview:', template.id);
      
      // Save directly to branding context with the selected template
      await saveBranding({ selected_template: template.id });
      
      // Also save to invoice settings for backward compatibility
      const response = await api.updateInvoiceSettings({
        template: template.id
      });

      if (response.success) {
        toast.success(`${template.name} template selected!`);
        // Navigate back to invoice templates screen
        setTimeout(() => onBack(), 500);
      } else {
        throw new Error(response.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <AppBar 
          title={`${template.name} Preview`}
          onBack={onBack}
          showBack 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  const TemplateComponent = templateComponents[template.id as keyof typeof templateComponents];

  if (!TemplateComponent) {
    return (
      <div className="flex flex-col h-full bg-white">
        <AppBar 
          title="Template Not Found"
          onBack={onBack}
          showBack 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="trades-body text-gray-600 mb-4">Template not found</p>
            <button 
              onClick={onBack}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl trades-body hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <AppBar 
        title={`${template.name} Template`}
        onBack={onBack}
        showBack 
      />

      {/* Template Description */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="trades-h2 text-gray-900 mb-2">{template.name}</h2>
        <p className="trades-body text-gray-600">{template.description}</p>
        <p className="trades-caption text-gray-500 mt-2">
          Preview shows sample data with your current branding settings.
        </p>
      </div>

      {/* Content Area with proper spacing */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Scrollable Preview Area with space for button + bottom nav */}
        <div className="flex-1 overflow-y-auto" style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          paddingBottom: '156px' // Button (56px + 16px padding) + Bottom Nav (68px) + extra spacing
        }}>
          <div className="p-4">
            <InvoicePreviewCard
              onViewFullSize={() => setShowFullSizeViewer(true)}
            >
              {/* PreviewFrame - full-bleed container for A4 preview */}
              <div className="relative bg-gray-100" style={{ height: '450px' }}>
                <A4FitWrapper>
                  <InvoiceA4Page>
                    <div className="pdf-optimized">
                      <TemplateComponent
                        invoice={{
                          ...sampleInvoiceData,
                          business: {
                            ...sampleInvoiceData.business,
                            name: branding.business_name || sampleInvoiceData.business.name
                          }
                        }}
                        branding={branding}
                        bankDetails={bankDetails}
                        preview={true}
                      />
                    </div>
                  </InvoiceA4Page>
                </A4FitWrapper>
              </div>
            </InvoicePreviewCard>
          </div>
        </div>

        {/* Floating Action Button - positioned above bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 px-4 z-10" style={{ paddingBottom: '84px' }}>
          <button
            onClick={handleUseTemplate}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: '#0A84FF',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="trades-body">Saving...</span>
              </>
            ) : (
              <>
                <Check size={20} />
                <span className="trades-body">Use This Template</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full-Size A4 Viewer Modal */}
      <InvoiceA4Viewer
        isOpen={showFullSizeViewer}
        onClose={() => setShowFullSizeViewer(false)}
        title={`${template.name} Template Preview`}
        onExport={() => {
          // Future: Implement PDF export
          toast.success('PDF export coming soon');
        }}
      >
        <InvoiceA4Page>
          <div className="pdf-optimized">
            <TemplateComponent
              invoice={{
                ...sampleInvoiceData,
                business: {
                  ...sampleInvoiceData.business,
                  name: branding.business_name || sampleInvoiceData.business.name
                }
              }}
              branding={branding}
              bankDetails={bankDetails}
              preview={false}
            />
          </div>
        </InvoiceA4Page>
      </InvoiceA4Viewer>
    </div>
  );
}