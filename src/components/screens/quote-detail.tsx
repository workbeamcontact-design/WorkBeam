import { ArrowLeft, Edit, Send, Eye, Check, X, FileText, Download, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { QuoteStatusBadge } from "../trades-ui/quote-status-badge";
import { formatPhoneForWhatsApp } from "../../utils/phone-utils";
import { api } from "../../utils/api";
import { toast } from "sonner@2.0.3";
// Import both old and new PDF generators for fallback
import { downloadQuoteAndOpenWhatsApp, downloadQuotePDF } from "../../utils/pdf-generator";
import { downloadQuoteWithTemplateAndOpenWhatsApp, downloadQuotePDFWithTemplate } from "../../utils/quote-pdf-generator";
import { A4FitWrapper } from "../ui/a4-fit-wrapper";
import { InvoiceA4Page } from "../ui/invoice-a4-page";
import { TemplateRenderer } from "../ui/invoice-templates/template-renderer";
import { useBranding } from "../../utils/branding-context";
import { AttributionDisplay } from "../ui/attribution-display";

interface QuoteDetailProps {
  quote: any;
  onNavigate: (screen: string, data?: any) => void;
  onBack: () => void;
}

export function QuoteDetail({ quote, onNavigate, onBack }: QuoteDetailProps) {
  const [quoteData, setQuoteData] = useState<any>(quote);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [businessDetails, setBusinessDetails] = useState<any>(null);
  
  // Use BrandingContext to get live branding data that auto-updates
  const { branding, refreshBranding, loading: brandingLoading } = useBranding();

  // Refresh branding data when component mounts
  useEffect(() => {
    console.log('📄 Quote Detail mounted - refreshing branding data');
    refreshBranding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadQuoteData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  // Calculate totals from quote data
  const subtotal = (quoteData?.lineItems || []).reduce((sum: number, item: any) => {
    return sum + (item.total || 0);
  }, 0);
  
  const vatAmount = quoteData?.vatAmount || 0;
  const total = quoteData?.total || (subtotal + vatAmount);

  const loadQuoteData = async () => {
    if (!quote?.id) return;

    try {
      setLoading(true);
      
      // Load full quote data, client info, and business details
      // Branding comes from context and will auto-refresh
      const [fullQuote, client, business] = await Promise.all([
        api.getQuote(quote.id),
        quote.clientId ? api.getClient(quote.clientId) : null,
        api.getBusinessDetails()
      ]);

      if (fullQuote) {
        setQuoteData(fullQuote);
      }
      if (client) {
        setClientData(client);
      }
      if (business) {
        setBusinessDetails(business);
        console.log('✓ Business details loaded');
      } else {
        console.log('ℹ No business details configured - using defaults');
      }
      
      console.log('✓ Quote Detail - Data loaded. Using branding from context:', {
        logo_url: branding?.logo_url,
        primary_color: branding?.primary_color,
        invoice_use_brand_colors: branding?.invoice_use_brand_colors,
        selected_template: branding?.selected_template
      });
    } catch (error) {
      console.error('Failed to load quote data:', error);
      toast.error('Failed to load quote details');
    } finally {
      setLoading(false);
    }
  };

  const convertToTemplateFormat = () => {
    const companyName = businessDetails?.companyName || 'Your Business';
    const businessAddress = businessDetails?.address || '';
    const businessPhone = businessDetails?.phone || '';

    return {
      id: quoteData?.id || 'new-quote',
      number: quoteData?.number || 'QUO-DRAFT',
      date: quoteData?.createdAt || new Date().toISOString(),
      due_date: quoteData?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: quoteData?.status || 'draft',
      client: {
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
      line_items: (quoteData?.lineItems || []).map((item: any, index: number) => ({
        id: `quote-item-${index}`,
        description: item.description || 'Item',
        quantity: Number(item.qty || item.quantity) || 1,
        rate: Number(item.price || item.rate) || 0,
        amount: item.total || item.amount || ((Number(item.qty || item.quantity) || 1) * (Number(item.price || item.rate) || 0))
      })),
      subtotal: subtotal || 0,
      vat_amount: vatAmount || 0,
      total: total || 0,
      notes: quoteData?.notes || '',
      quote_title: quoteData?.title || 'Quote',
      quote_valid_until: quoteData?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      quote_created_at: quoteData?.createdAt || new Date().toISOString()
    };
  };

  const handleSendQuote = async () => {
    try {
      setLoading(true);
      
      // Show loading toast
      const loadingToast = toast.loading('Generating quote...');
      
      const updatedQuote = await api.sendQuote(quoteData.id);
      
      if (updatedQuote) {
        setQuoteData(updatedQuote);
        
        // Download PDF and open WhatsApp using the selected template
        if (clientData?.phone) {
          const formattedPhone = formatPhoneForWhatsApp(clientData.phone, '+44');
          
          try {
            // Try new template-based generation first
            await downloadQuoteWithTemplateAndOpenWhatsApp(
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
                name: clientData.name,
                phone: clientData.phone,
                address: clientData.address
              },
              formattedPhone
            );
            
            toast.dismiss(loadingToast);
            toast.success('Quote downloaded');
          } catch (templateError) {
            console.warn('Template-based generation failed, falling back to legacy:', templateError);
            
            // Fallback to legacy PDF generation
            await downloadQuoteAndOpenWhatsApp(
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
                name: clientData.name,
                phone: clientData.phone,
                address: clientData.address
              },
              formattedPhone
            );
            
            toast.dismiss(loadingToast);
            toast.success('Quote downloaded');
          }
        } else {
          // Fallback to just downloading PDF if no phone number
          try {
            // Try template-based generation first
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
            toast.dismiss(loadingToast);
            toast.success('Quote downloaded');
          } catch (templateError) {
            console.warn('Template-based generation failed, falling back to legacy:', templateError);
            
            // Fallback to legacy generation
            await downloadQuotePDF(
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
            toast.dismiss(loadingToast);
            toast.success('Quote downloaded');
          }
        }
      }
    } catch (error) {
      console.error('Failed to send quote:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to generate quote PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkApproved = async () => {
    try {
      setLoading(true);
      const updatedQuote = await api.updateQuote(quoteData.id, { status: 'approved' });
      
      if (updatedQuote) {
        setQuoteData(updatedQuote);
        toast.success('Quote marked as approved!');
      }
    } catch (error) {
      console.error('Failed to update quote:', error);
      toast.error('Failed to update quote');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRejected = async () => {
    try {
      setLoading(true);
      const updatedQuote = await api.updateQuote(quoteData.id, { status: 'rejected' });
      
      if (updatedQuote) {
        setQuoteData(updatedQuote);
        toast.success('Quote marked as rejected');
      }
    } catch (error) {
      console.error('Failed to update quote:', error);
      toast.error('Failed to update quote');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToJob = async () => {
    try {
      setLoading(true);
      const newJob = await api.convertQuoteToJob(quoteData.id);
      
      if (newJob) {
        toast.success('Quote converted to job successfully!');
        onNavigate('job-detail', newJob);
      }
    } catch (error) {
      console.error('Failed to convert quote:', error);
      toast.error('Failed to convert quote to job');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async () => {
    try {
      setLoading(true);
      const result = await api.deleteQuote(quoteData.id);
      
      if (result.success) {
        toast.success('Quote deleted successfully!');
        
        // Clear navigation history to prevent returning to deleted item
        const { useAppStore } = await import('../../hooks/useAppStore');
        useAppStore.getState().clearNavigationHistory();
        
        // Force refresh dashboard
        useAppStore.getState().refreshDashboard();
        
        onBack(); // Navigate back to previous screen
      } else {
        toast.error(result.message || 'Failed to delete quote');
      }
    } catch (error) {
      console.error('Failed to delete quote:', error);
      toast.error('Failed to delete quote');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
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
            <h1 className="trades-h1" style={{ color: '#111827' }}>
              {quoteData?.title || 'Quote Details'}
            </h1>
            <p className="trades-caption" style={{ color: '#6B7280' }}>
              {quoteData?.number || 'QUO-2024-0001'}
            </p>
          </div>
          <QuoteStatusBadge status={quoteData?.status || 'draft'} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-24 space-y-4">
          
          {/* Client Info */}
          {clientData && (
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="trades-h2 mb-3" style={{ color: '#111827' }}>Client</h3>
              <div className="space-y-2">
                <p className="trades-body" style={{ color: '#111827' }}>{clientData.name}</p>
                <p className="trades-caption" style={{ color: '#6B7280' }}>{clientData.phone}</p>
                {clientData.address && (
                  <p className="trades-caption" style={{ color: '#6B7280' }}>{clientData.address}</p>
                )}
              </div>
            </div>
          )}

          {/* Quote Summary */}
          <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E5E7EB' }}>
            <h3 className="trades-h2 mb-3" style={{ color: '#111827' }}>Quote Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="trades-body" style={{ color: '#6B7280' }}>Created:</span>
                <span className="trades-body" style={{ color: '#111827' }}>
                  {formatDate(quoteData?.createdAt || '')}
                </span>
              </div>
              {quoteData?.validUntil && (
                <div className="flex justify-between">
                  <span className="trades-body" style={{ color: '#6B7280' }}>Valid Until:</span>
                  <span className="trades-body" style={{ color: '#111827' }}>
                    {formatDate(quoteData.validUntil)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="trades-body" style={{ color: '#6B7280' }}>Subtotal:</span>
                <span className="trades-body" style={{ color: '#111827' }}>£{subtotal.toFixed(2)}</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-between">
                  <span className="trades-body" style={{ color: '#6B7280' }}>VAT:</span>
                  <span className="trades-body" style={{ color: '#111827' }}>£{vatAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-3" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex justify-between">
                  <span className="trades-h2" style={{ color: '#111827' }}>Total:</span>
                  <span className="trades-h2" style={{ color: '#16A34A' }}>£{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Multi-user attribution (Phase 4b) */}
              <AttributionDisplay
                createdByName={quoteData?.created_by_name}
                createdAt={quoteData?.created_at}
                updatedByName={quoteData?.updated_by_name}
                updatedAt={quoteData?.updated_at}
                className="pt-3 border-t"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>
          </div>

          {/* Line Items */}
          {quoteData?.lineItems && quoteData.lineItems.length > 0 && (
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="trades-h2 mb-3" style={{ color: '#111827' }}>Items</h3>
              <div className="space-y-3">
                {quoteData.lineItems.map((item: any, index: number) => (
                  <div key={index} className="border-b pb-3 last:border-b-0" style={{ borderColor: '#E5E7EB' }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="trades-body" style={{ color: '#111827' }}>{item.description}</p>
                        <p className="trades-caption" style={{ color: '#6B7280' }}>
                          {item.qty} × £{item.price?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <span className="trades-body" style={{ color: '#111827' }}>
                        £{(item.total || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          {quoteData?.notes && (
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="trades-h2 mb-3" style={{ color: '#111827' }}>Terms & Conditions</h3>
              <p className="trades-body" style={{ color: '#6B7280' }}>{quoteData.notes}</p>
            </div>
          )}

          {/* Live Preview Section - Only show for draft or pending/sent quotes */}
          {(quoteData?.status === 'draft' || quoteData?.status === 'sent' || quoteData?.status === 'pending') && (
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="trades-h2 mb-1" style={{ color: '#111827' }}>Live Preview</h3>
                  {!businessDetails && (
                    <p className="trades-caption" style={{ color: '#F59E0B' }}>
                      Using default business info
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ color: '#0A84FF' }}
                >
                  <Eye size={16} />
                  <span className="trades-caption">{showPreview ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              
              <p className="trades-caption mb-4" style={{ color: '#6B7280' }}>
                See how your quote will appear when printed or saved as PDF
              </p>

              {showPreview && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
                  <div className="bg-gray-100" style={{ height: '400px' }}>
                    {!loading && quoteData ? (
                      <div className="relative h-full">
                        <div className="absolute inset-0 overflow-auto">
                          <A4FitWrapper>
                            <InvoiceA4Page>
                              <div className="pdf-optimized">
                                <TemplateRenderer
                                  templateId={branding?.selected_template || 'classic'}
                                  document={convertToTemplateFormat()}
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
                        </div>
                      </div>
                    ) : loading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: '#0A84FF' }}></div>
                          <p className="trades-caption" style={{ color: '#6B7280' }}>Loading preview...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <FileText size={32} className="mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                          <p className="trades-body mb-2" style={{ color: '#111827' }}>Preview Unavailable</p>
                          <p className="trades-caption" style={{ color: '#6B7280' }}>
                            Quote data is loading...
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!showPreview && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Eye size={32} className="mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                  <p className="trades-body mb-2" style={{ color: '#111827' }}>Preview Your Quote</p>
                  <p className="trades-caption" style={{ color: '#6B7280' }}>
                    Click "Show" to see how your quote will look as a PDF
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Now inline with content */}
          <div className="space-y-3 mt-6">
            
            {/* Status-based actions */}
            {quoteData?.status === 'draft' && (
              <>
                <button
                  onClick={handleSendQuote}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ 
                    backgroundColor: '#16A34A',
                    color: 'white',
                    height: '48px',
                    borderRadius: '12px'
                  }}
                >
                  <Send size={20} />
                  <span className="trades-body">Send Quote</span>
                </button>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => onNavigate('quote-builder', quoteData)}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                    style={{ height: '44px', borderRadius: '12px', color: '#111827' }}
                  >
                    <Edit size={16} />
                    <span className="trades-caption">Edit</span>
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        // Try template-based generation first
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
                        toast.success('Quote opened in new window - Press Ctrl+P to save as PDF!');
                      } catch (templateError) {
                        console.warn('Template-based generation failed, falling back to legacy:', templateError);
                        
                        // Fallback to legacy generation
                        await downloadQuotePDF(
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
                        toast.success('Quote PDF downloaded! WhatsApp opened with pre-filled message.');
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                    style={{ height: '44px', borderRadius: '12px', color: '#111827' }}
                  >
                    <Download size={16} />
                    <span className="trades-caption">Download</span>
                  </button>
                  
                  <button
                    onClick={() => onNavigate('quote-preview', quoteData)}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                    style={{ height: '44px', borderRadius: '12px', color: '#111827' }}
                  >
                    <Eye size={16} />
                    <span className="trades-caption">Preview</span>
                  </button>
                </div>
              </>
            )}

            {(quoteData?.status === 'sent' || quoteData?.status === 'pending') && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleMarkApproved}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ 
                      backgroundColor: '#16A34A',
                      color: 'white',
                      height: '48px',
                      borderRadius: '12px'
                    }}
                  >
                    <Check size={20} />
                    <span className="trades-body">Mark as Approved</span>
                  </button>

                  <button
                    onClick={handleMarkRejected}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ 
                      backgroundColor: '#DC2626',
                      color: 'white',
                      height: '48px',
                      borderRadius: '12px'
                    }}
                  >
                    <X size={20} />
                    <span className="trades-body">Mark as Rejected</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handleSendQuote}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50"
                    style={{ height: '44px', borderRadius: '12px', color: '#0A84FF' }}
                  >
                    <Send size={16} />
                    <span className="trades-caption">Resend</span>
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        // Try template-based generation first
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
                        toast.success('Quote opened in new window - Press Ctrl+P to save as PDF!');
                      } catch (templateError) {
                        console.warn('Template-based generation failed, falling back to legacy:', templateError);
                        
                        // Fallback to legacy generation
                        await downloadQuotePDF(
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
                        toast.success('Quote PDF downloaded! WhatsApp opened with pre-filled message.');
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                    style={{ height: '44px', borderRadius: '12px', color: '#111827' }}
                  >
                    <Download size={16} />
                    <span className="trades-caption">Download</span>
                  </button>
                  
                  <button
                    onClick={() => onNavigate('quote-preview', quoteData)}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                    style={{ height: '44px', borderRadius: '12px', color: '#111827' }}
                  >
                    <Eye size={16} />
                    <span className="trades-caption">Preview</span>
                  </button>
                </div>
              </>
            )}

            {quoteData?.status === 'approved' && (
              <button
                onClick={handleConvertToJob}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: '#0A84FF',
                  color: 'white',
                  height: '48px',
                  borderRadius: '12px'
                }}
              >
                <FileText size={20} />
                <span className="trades-body">Convert to Job</span>
              </button>
            )}

            {quoteData?.status === 'rejected' && (
              <>
                <div className="bg-red-50 rounded-xl p-4 border border-red-200 mb-4">
                  <p className="trades-body text-center" style={{ color: '#DC2626' }}>
                    This quote was rejected by the client
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Navigate to quote builder with client info pre-populated
                    const clientInfo = {
                      clientId: quoteData.clientId,
                      clientName: clientData?.name || quoteData.clientName,
                      client: clientData
                    };
                    onNavigate('quote-builder', clientInfo);
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                  style={{ 
                    backgroundColor: '#0A84FF',
                    color: 'white',
                    height: '48px',
                    borderRadius: '12px'
                  }}
                >
                  <FileText size={20} />
                  <span className="trades-body">Create a New Quote</span>
                </button>
              </>
            )}

            {quoteData?.status === 'converted' && (
              <div className="text-center py-4">
                <p className="trades-body" style={{ color: '#6B7280' }}>
                  This quote has been converted to a job
                </p>
              </div>
            )}

            {/* Delete Button - Only show if quote is not converted */}
            {quoteData?.status !== 'converted' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 mt-4"
                style={{ 
                  backgroundColor: '#DC2626',
                  color: 'white',
                  height: '48px',
                  borderRadius: '12px'
                }}
              >
                <Trash2 size={20} />
                <span className="trades-body">Delete Quote</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h3 className="trades-h2" style={{ color: '#111827' }}>Delete Quote</h3>
                <p className="trades-caption" style={{ color: '#6B7280' }}>
                  {quoteData?.number || 'Quote'}
                </p>
              </div>
            </div>
            
            <p className="trades-body mb-6" style={{ color: '#6B7280' }}>
              Are you sure you want to delete this quote? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50"
                style={{ 
                  backgroundColor: '#F9FAFB',
                  color: '#111827',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB'
                }}
              >
                <span className="trades-body">Cancel</span>
              </button>
              
              <button
                onClick={handleDeleteQuote}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: '#DC2626',
                  color: 'white',
                  height: '44px',
                  borderRadius: '12px'
                }}
              >
                <Trash2 size={16} />
                <span className="trades-body">Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}