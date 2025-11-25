import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import { WhatsAppIcon } from "../../ui/whatsapp-icon";
import { formatPhoneForWhatsApp } from "../../../utils/phone-utils";
import { api } from "../../../utils/api";

interface QuoteApprovalProps {
  quote?: any;
  onNavigate?: (screen: string, data?: any) => void;
}

export function QuoteApproval({ quote, onNavigate }: QuoteApprovalProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [clientData, setClientData] = useState<any>(null);

  useEffect(() => {
    loadQuoteData();
  }, [quote]);

  const loadQuoteData = async () => {
    // Check if we have a quoteId from URL params (for public links)
    const urlParams = new URLSearchParams(window.location.search);
    const quoteId = quote?.quoteId || quote?.id || urlParams.get('id');
    
    if (!quoteId) {
      // Use sample data if no quote ID provided
      setQuoteData(getDefaultQuoteData());
      return;
    }

    try {
      setLoading(true);
      
      // Validate quote ID before making API call
      if (!quoteId || typeof quoteId !== 'string' || quoteId.trim() === '') {
        console.error('❌ Invalid quote ID for approval:', { quoteId, type: typeof quoteId });
        setQuoteData(getDefaultQuoteData());
        return;
      }
      
      const fullQuote = await api.getQuote(quoteId);

      if (fullQuote) {
        setQuoteData(fullQuote);
        
        // Load client data if we have a clientId
        if (fullQuote.clientId) {
          try {
            const client = await api.getClient(fullQuote.clientId);
            if (client) {
              setClientData(client);
            }
          } catch (clientError) {
            console.error('Failed to load client data:', clientError);
            // Continue without client data
          }
        }
      } else {
        console.error('Quote not found - API returned null/undefined');
        setQuoteData(getDefaultQuoteData());
      }
    } catch (error: any) {
      const errorStatus = error?.status || error?.response?.status;
      
      if (errorStatus === 404) {
        console.error('❌ Quote not found (404) for approval:', { 
          quoteId,
          error: error?.message || 'Quote does not exist' 
        });
      } else {
        console.error('❌ Failed to load quote data for approval:', {
          error: error?.message || 'Unknown error',
          status: errorStatus,
          quoteId
        });
      }
      
      setQuoteData(getDefaultQuoteData());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultQuoteData = () => ({
    businessName: "Elite Windows & Doors",
    businessPhone: "0161 123 4567",
    clientName: "Mrs Khan",
    title: "uPVC Window Installation",
    address: "123 Oak Street, Manchester M1 2AB",
    createdAt: new Date().toISOString(),
    lineItems: [
      { description: "uPVC casement window - white", qty: 1, price: 420, total: 420 },
      { description: "Installation and fitting", qty: 1, price: 60, total: 60 }
    ],
    subtotal: 480,
    vatAmount: 96,
    total: 576,
    vatEnabled: true
  });

  const handleApprove = async () => {
    if (!agreed || !quoteData?.id) return;
    
    try {
      setLoading(true);
      const updatedQuote = await api.updateQuote(quoteData.id, { status: 'approved' });
      
      if (updatedQuote) {
        alert("Quote approved! The tradesman will be notified and your job will be scheduled.");
        setQuoteData(updatedQuote);
      } else {
        alert("Failed to approve quote");
      }
    } catch (error) {
      console.error('Failed to approve quote:', error);
      alert("Failed to approve quote");
    } finally {
      setLoading(false);
    }
  };

  const displayData = quoteData || getDefaultQuoteData();
  const businessName = displayData.businessName || "Elite Windows & Doors";
  const businessPhone = displayData.businessPhone || "0161 123 4567";
  const clientName = clientData?.name || displayData.clientName || "Valued Customer";
  const jobTitle = displayData.title || displayData.jobTitle || "Service Quote";
  const address = clientData?.address || displayData.address || "";
  const date = displayData.createdAt ? new Date(displayData.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Container */}
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 text-center">
          <h1 className="trades-h1 mb-2">{businessName}</h1>
          <p className="trades-body opacity-90">{businessPhone}</p>
        </div>

        {/* Quote Details */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="trades-caption text-gray-600">Loading quote...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="trades-h2 text-gray-900 mb-2">Quote for Approval</h2>
                <p className="trades-body text-gray-600">{clientName}</p>
                <p className="trades-caption text-gray-500">{date}</p>
                {displayData.status === 'approved' && (
                  <div className="mt-3 bg-green-100 text-green-800 px-3 py-2 rounded-lg trades-caption">
                    ✅ This quote has been approved
                  </div>
                )}
              </div>

              {/* Job Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="trades-body text-gray-900 font-medium mb-2">{jobTitle}</h3>
                {address && <p className="trades-caption text-gray-600">{address}</p>}
              </div>
            </>
          )}

          {!loading && (
            <>
              {/* Line Items */}
              <div className="mb-6">
                <h3 className="trades-h2 text-gray-900 mb-4">Quote Breakdown</h3>
                <div className="space-y-3">
                  {displayData.lineItems.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="trades-body text-gray-900">{item.description}</p>
                        <p className="trades-caption text-gray-500">Qty: {item.qty}</p>
                      </div>
                      <p className="trades-body text-gray-900 font-medium">
                        £{(item.total || (item.qty * item.price)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="trades-body text-gray-600">Subtotal</span>
                    <span className="trades-body text-gray-900">£{displayData.subtotal.toFixed(2)}</span>
                  </div>
                  {displayData.vatEnabled && displayData.vatAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="trades-body text-gray-600">VAT (20%)</span>
                      <span className="trades-body text-gray-900">£{displayData.vatAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="border-gray-300" />
                  <div className="flex justify-between">
                    <span className="trades-h2 text-gray-900">Total</span>
                    <span className="trades-h2 text-gray-900">£{displayData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!loading && displayData.status !== 'approved' && (
            <>
              {/* Agreement Checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-5 h-5 mt-1 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="trades-caption text-gray-700">
                    I agree to the work described above and the total cost of £{displayData.total.toFixed(2)}. 
                    I understand that this approval constitutes acceptance of the quote and work will proceed as scheduled.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleApprove}
                  disabled={!agreed || loading}
                  className={`w-full py-4 rounded-xl trades-body font-medium transition-colors flex items-center justify-center gap-2 ${
                    agreed && !loading
                      ? "bg-green-600 text-white hover:bg-green-700" 
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Check size={20} />
                  {loading ? 'Approving...' : 'Approve Quote'}
                </button>
              </div>
            </>
          )}

          {/* Contact Button - Always Available */}
          {!loading && (
            <div className="mt-3">
              <button
                onClick={() => {
                  const formattedPhone = formatPhoneForWhatsApp(businessPhone, '+44');
                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent('Hi, I have a question about my quote...')}`, '_blank');
                }}
                className="w-full py-4 bg-green-600 text-white rounded-xl trades-body font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <WhatsAppIcon size={20} color="white" />
                Ask a Question
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200">
            <p className="trades-caption text-gray-500">
              This quote is valid for 30 days from the date shown above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}