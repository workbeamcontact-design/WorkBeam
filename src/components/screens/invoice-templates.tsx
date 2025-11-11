import React, { useState, useEffect } from 'react';
import { Check, Eye, Palette, Settings, Info } from 'lucide-react';
import { ScreenLayout, SaveFooter } from '../ui/screen-layout';
import { useBranding, TEMPLATE_SUPPORT } from '../../utils/branding-context';
import { toast } from 'sonner@2.0.3';

interface NavigationProps {
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
}

interface BrandingData {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  business_name?: string;
}

const templates: InvoiceTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional layout with clear sections',
    preview: 'Clean and professional with traditional invoice structure'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with bold headers',
    preview: 'Fresh modern look with vibrant accent colors'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple with plenty of white space',
    preview: 'Elegant simplicity with focus on content'
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professional layout for established businesses',
    preview: 'Sophisticated design for corporate environments'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Unique layout for creative professionals',
    preview: 'Eye-catching design for creative industries'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Balanced design suitable for all trades',
    preview: 'Perfect balance of style and functionality'
  }
];



export function InvoiceTemplates({ onNavigate, onBack }: NavigationProps) {
  const { branding, loading, validateBrandingForTemplate, setBranding, saveBranding } = useBranding();
  const [selectedTemplate, setSelectedTemplate] = useState<string>(branding.selected_template || 'classic');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when branding context changes
  useEffect(() => {
    if (branding.selected_template) {
      setSelectedTemplate(branding.selected_template);
    }
  }, [branding.selected_template]);

  // Update local state when branding context loads
  useEffect(() => {
    if (!loading) {
      setSelectedTemplate(branding.selected_template || 'classic');
      setIsLoading(false);
    }
  }, [loading, branding.selected_template]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log('💾 Saving selected template:', selectedTemplate);
      
      // Save directly to API with the selected template
      // This ensures the template is saved immediately without relying on React state updates
      await saveBranding({ selected_template: selectedTemplate });
      
      // Update local state to match
      setSelectedTemplate(selectedTemplate);
      
      console.log('✅ Template saved successfully');
      toast.success(`${templates.find(t => t.id === selectedTemplate)?.name} template applied!`);
      
      // Navigate back to settings after successful save
      setTimeout(() => onBack(), 500);
    } catch (error) {
      console.error('❌ Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenLayout title="Invoice Templates" onBack={onBack}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="trades-body text-gray-600">Loading templates...</p>
          </div>
        </div>
      </ScreenLayout>
    );
  }



  return (
    <ScreenLayout 
      title="Invoice Templates" 
      onBack={onBack}
      footer={
        selectedTemplate !== (branding.selected_template || 'classic') ? (
          <SaveFooter
            onSave={handleSave}
            saving={isSaving}
            hasUnsavedChanges={true}
            saveText="Apply Template"
          />
        ) : undefined
      }
    >
      {/* Branding Notice */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <Palette className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="trades-label text-blue-900">Templates use your branding</p>
              <p className="trades-caption text-blue-700 mt-1">
                {branding.business_name || branding.logo_url || branding.primary_color 
                  ? 'Your logo, colors, and business details will appear on all invoices.'
                  : 'Set up your branding to customize these templates.'
                }
              </p>
              <button
                onClick={() => onNavigate('branding-logo')}
                className="flex items-center gap-2 text-blue-600 trades-caption mt-2 hover:text-blue-700 transition-colors"
              >
                <Settings size={14} />
                {(!branding.business_name && !branding.logo_url && !branding.primary_color) 
                  ? 'Set up branding →' 
                  : 'Manage branding →'
                }
              </button>
            </div>
          </div>
      </div>

      {/* Template Grid */}
      <div className="p-4 space-y-3">
        {templates.map((template) => {
            const isSelected = selectedTemplate === template.id;
            
            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`relative w-full cursor-pointer border-2 rounded-xl overflow-hidden transition-all ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Header Section */}
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Selection indicator */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-600' 
                            : 'border-gray-300'
                        }`}
                        aria-label={`Select ${template.name} template`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      
                      {/* Template name and quick description */}
                      <div>
                        <h3 className={`trades-h2 ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {template.name}
                        </h3>
                        <p className="trades-caption text-gray-500 mt-0.5">
                          {template.description}
                        </p>
                      </div>
                    </div>

                    {/* View Invoice button - more prominent */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('invoice-template-preview', {
                          id: template.id,
                          name: template.name,
                          description: template.description
                        });
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="trades-label">Preview</span>
                    </button>
                  </div>
                </div>

                {/* Content Section - Expandable area */}
                <div className="w-full px-4 pb-4">
                  {/* Template preview description */}
                  <p className="trades-body text-gray-600 mb-3">
                    {template.preview}
                  </p>
                  
                  {/* Features row */}
                  <div className="flex items-center justify-between">
                    {/* Template capabilities - more visual */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="trades-caption text-gray-500">
                          Logo: {TEMPLATE_SUPPORT[template.id]?.logoPositions.join(', ') || 'left'}
                        </span>
                      </div>
                      {TEMPLATE_SUPPORT[template.id]?.brandColors && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="trades-caption text-gray-500">Brand colors</span>
                        </div>
                      )}
                      {TEMPLATE_SUPPORT[template.id]?.darkMode && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="trades-caption text-gray-500">Dark logo</span>
                        </div>
                      )}
                    </div>

                    {/* Status indicator */}
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 text-blue-600">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="trades-caption">Selected</span>
                      </div>
                    ) : (
                      <span className="trades-caption text-gray-400">Tap to select</span>
                    )}
                  </div>

                  {/* Compatibility warnings */}
                  {validateBrandingForTemplate(template.id).length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 p-2 bg-orange-50 rounded-lg">
                      <Info size={14} className="text-orange-600 flex-shrink-0" />
                      <span className="trades-caption text-orange-700">
                        Some branding settings may not be fully compatible
                      </span>
                    </div>
                  )}
                </div>
            </div>
          );
        })}
      </div>

    </ScreenLayout>
  );
}