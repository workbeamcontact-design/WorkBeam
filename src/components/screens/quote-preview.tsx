import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, Download, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { A4FitWrapper } from '../ui/a4-fit-wrapper';
import { InvoiceA4Page } from '../ui/invoice-a4-page';
import { TemplateRenderer } from '../ui/invoice-templates/template-renderer';
import { ScreenLayout } from '../ui/screen-layout';
import { api } from '../../utils/api';
import { toast } from 'sonner@2.0.3';
import { downloadQuotePDFWithTemplate } from '../../utils/quote-pdf-generator';
import { useBranding } from '../../utils/branding-context';

interface QuotePreviewProps {
  quote: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function QuotePreview({ quote, onNavigate, onBack }: QuotePreviewProps) {
  const [quoteData, setQuoteData] = useState<any>(quote);
  const [clientData, setClientData] = useState<any>(null);
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use BrandingContext to get live branding data that auto-updates
  const { branding, refreshBranding, loading: brandingLoading } = useBranding();

  // Refresh branding data when component mounts to ensure we have the latest
  useEffect(() => {
    console.log('📄 Quote Preview mounted - refreshing branding data');
    refreshBranding();
  }, []);

  useEffect(() => {
    loadPreviewData();
  }, [quote]);

  const loadPreviewData = async () => {
    if (!quote?.id) return;

    try {
      setLoading(true);
      
      // Load quote, client, and business details in parallel
      // Branding comes from context and will auto-refresh
      const [fullQuote, client, business] = await Promise.all([
        api.getQuote(quote.id),
        quote.clientId ? api.getClient(quote.clientId) : null,
        api.getBusinessDetails()
      ]);

      if (fullQuote) setQuoteData(fullQuote);
      if (client) setClientData(client);
      if (business) setBusinessDetails(business);
      
      console.log('✓ Quote Preview - Data loaded. Using branding from context:', {
        logo_url: branding?.logo_url,
        primary_color: branding?.primary_color,
        invoice_use_brand_colors: branding?.invoice_use_brand_colors,
        selected_template: branding?.selected_template
      });
      
    } catch (error) {
      console.error('Failed to load preview data:', error);
      toast.error('Failed to load quote preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await downloadQuotePDFWithTemplate(
        {
          id: quoteData.id,
          number: quoteData.number || 'QUO-2024-0001',
          title: quoteData.title || 'Quote',
          createdAt: quoteData.createdAt,
          validUntil: quoteData.validUntil,
          lineItems: quoteData.lineItems || [],
          subtotal: subtotal,
          vatAmount: vatAmount,
          total: total,
          notes: quoteData.notes,
          status: quoteData.status
        },
        {
          name: clientData?.name || 'Client',
          phone: clientData?.phone,
          address: clientData?.address
        }
      );
      toast.success('Quote opened - ready to print!');
    } catch (error) {
      console.error('Failed to generate quote PDF:', error);
      toast.error('Failed to generate quote PDF');
    }
  };

  // Convert quote data to template format
  const convertToTemplateFormat = () => {
    if (!quoteData || !businessDetails) return null;

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
      id: quoteData.id,
      invoice_number: quoteData.number || 'QUO-2024-0001',
      issue_date: quoteData.createdAt,
      due_date: quoteData.validUntil || quoteData.createdAt,
      status: 'quote',
      client: {
        id: 'quote-client',
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
      line_items: (quoteData.lineItems || []).map((item: any, index: number) => ({
        id: `quote-item-${index}`,
        description: item.description,
        quantity: item.qty,
        rate: item.price,
        amount: item.total
      })),
      subtotal: subtotal,
      vat_amount: vatAmount,
      total: total,
      notes: quoteData.notes,
      quote_title: quoteData.title,
      quote_valid_until: quoteData.validUntil,
      quote_created_at: quoteData.createdAt
    };
  };

  const subtotal = quoteData?.lineItems?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
  const vatAmount = quoteData?.vatAmount || 0;
  const total = quoteData?.total || subtotal + vatAmount;

  const templateData = convertToTemplateFormat();

  // Show loading state while either data or branding is loading
  if (loading || brandingLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 bg-white border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
            >
              <ArrowLeft size={20} className="text-muted" />
            </button>
            <h1 className="trades-h1 text-ink">Loading Preview...</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="trades-body text-muted">Loading quote preview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScreenLayout
      title="Quote Preview"
      subtitle={`Preview of ${quoteData?.title || 'Quote'}`}
      onBack={onBack}
      footer={
        <div className="px-4 pb-4 pt-3 bg-white border-t border-border space-y-3">
          <Button
            onClick={handleDownloadPDF}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download size={20} className="mr-2" />
            Download PDF
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => onNavigate('quote-builder', quoteData)}
            >
              Edit Quote
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onNavigate('quote-detail', quoteData)}
            >
              View Details
            </Button>
          </div>
        </div>
      }
    >
      <div className="px-4 pt-4 space-y-4">
        
        {/* Quote Info */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="trades-h2 text-ink">Quote Information</h2>
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-muted" />
              <span className="trades-caption text-muted">Live Preview</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="trades-caption text-muted">Quote Number:</span>
              <span className="trades-caption text-ink">{quoteData?.number || 'QUO-2024-0001'}</span>
            </div>
            <div className="flex justify-between">
              <span className="trades-caption text-muted">Client:</span>
              <span className="trades-caption text-ink">{clientData?.name || 'Client Name'}</span>
            </div>
            <div className="flex justify-between">
              <span className="trades-caption text-muted">Total:</span>
              <span className="trades-caption text-ink font-medium">£{total.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* A4 Preview */}
        <Card className="p-4">
          <h2 className="trades-h2 text-ink mb-4">Quote Document Preview</h2>
          
          <p className="trades-caption text-muted mb-4">
            This is how your quote will appear when printed or saved as PDF
          </p>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-gray-100" style={{ height: '400px' }}>
              {templateData && (
                <A4FitWrapper>
                  <InvoiceA4Page>
                    <div className="pdf-optimized">
                      <TemplateRenderer
                        templateId={branding?.selected_template || 'classic'}
                        document={templateData}
                        documentType="quote"
                        branding={{
                          logo_url: branding?.logo_url,
                          primary_color: branding?.primary_color || '#0A84FF',
                          secondary_color: branding?.accent_color || '#42A5F5',
                          business_name: businessDetails?.companyName || 'Your Business',
                          invoice_use_brand_colors: branding?.invoice_use_brand_colors
                        }}
                        logoPosition={branding?.invoice_logo_position || 'left'}
                        preview={true}
                      />
                    </div>
                  </InvoiceA4Page>
                </A4FitWrapper>
              )}
            </div>
          </div>

          <div className="mt-3 p-3 bg-surface-alt rounded-lg">
            <p className="trades-caption text-muted text-center">
              📱 Tip: Download the PDF to share with your client or save for your records
            </p>
          </div>
        </Card>
        
        {/* Additional spacing for footer */}
        <div className="h-32"></div>
      </div>
    </ScreenLayout>
  );
}