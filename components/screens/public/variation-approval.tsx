import { Check, Camera } from "lucide-react";
import { useState, useEffect } from "react";
import { WhatsAppIcon } from "../../ui/whatsapp-icon";
import { formatPhoneForWhatsApp } from "../../../utils/phone-utils";
import { api } from "../../../utils/api";

interface VariationApprovalProps {
  variation?: any;
  onNavigate?: (screen: string, data?: any) => void;
}

export function VariationApproval({ variation, onNavigate }: VariationApprovalProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [variationData, setVariationData] = useState<any>(null);

  useEffect(() => {
    loadVariationData();
  }, [variation]);

  const loadVariationData = async () => {
    // Check if we have a variationId from URL params (for public links)
    const urlParams = new URLSearchParams(window.location.search);
    const variationId = variation?.variationId || variation?.id || urlParams.get('id');
    
    if (!variationId) {
      // Use sample data if no variation ID provided
      setVariationData(getDefaultVariationData());
      return;
    }

    try {
      setLoading(true);
      // In a real app, this would load from API
      // For now, use default data
      setVariationData(getDefaultVariationData());
    } catch (error) {
      console.error('Failed to load variation data:', error);
      setVariationData(getDefaultVariationData());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultVariationData = () => ({
    businessName: "Elite Windows & Doors",
    businessPhone: "0161 123 4567",
    clientName: "Mrs Khan",
    jobTitle: "uPVC Window Installation",
    address: "123 Oak Street, Manchester M1 2AB",
    date: "30/12/2024",
    description: "Rotten sill repair - discovered during installation that the wooden window sill has water damage and needs replacing before the new window can be fitted properly.",
    amount: 80,
    time: "2h",
    photos: ["photo1", "photo2"]
  });

  const displayData = variationData || getDefaultVariationData();

  const handleApprove = () => {
    if (!agreed) return;
    alert("Variation approved! The installer will be notified.");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Container */}
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 text-center">
          <h1 className="trades-h1 mb-2">{displayData.businessName}</h1>
          <p className="trades-body opacity-90">{displayData.businessPhone}</p>
        </div>

        {/* Variation Details */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="trades-h2 text-gray-900 mb-2">Variation for Approval</h2>
            <p className="trades-body text-gray-600">{displayData.clientName}</p>
            <p className="trades-caption text-gray-500">{displayData.date}</p>
          </div>

          {/* Job Summary */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="trades-body text-gray-900 font-medium mb-2">{displayData.jobTitle}</h3>
            <p className="trades-caption text-gray-600">{displayData.address}</p>
          </div>

          {/* Photos */}
          {displayData.photos && displayData.photos.length > 0 && (
            <div className="mb-6">
              <h3 className="trades-h2 text-gray-900 mb-3">Photos</h3>
              <div className="grid grid-cols-2 gap-3">
                {displayData.photos.map((photo: string, index: number) => (
                  <div key={index} className="aspect-square bg-gray-200 rounded-xl flex items-center justify-center">
                    <Camera size={32} className="text-gray-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="trades-h2 text-gray-900 mb-3">Description</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="trades-body text-gray-900">{displayData.description}</p>
            </div>
          </div>

          {/* Cost & Time */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="trades-caption text-gray-600 mb-1">Additional Cost</p>
                <p className="trades-h2 text-gray-900">£{displayData.amount}</p>
              </div>
              <div>
                <p className="trades-caption text-gray-600 mb-1">Additional Time</p>
                <p className="trades-h2 text-gray-900">{displayData.timeEstimate || displayData.time}h</p>
              </div>
            </div>
          </div>

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
                I approve this variation work for an additional cost of £{displayData.amount} and understand 
                that this will extend the completion time by approximately {displayData.timeEstimate || displayData.time}h.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              disabled={!agreed}
              className={`w-full py-4 rounded-xl trades-body font-medium transition-colors flex items-center justify-center gap-2 ${
                agreed 
                  ? "bg-green-600 text-white hover:bg-green-700" 
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Check size={20} />
              Approve Variation
            </button>
            
            <button
              onClick={() => {
                const formattedPhone = formatPhoneForWhatsApp(variationData.businessPhone, '+44');
                window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent('Hi, I have a question about the variation work...')}`, '_blank');
              }}
              className="w-full py-4 bg-green-600 text-white rounded-xl trades-body font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <WhatsAppIcon size={20} color="white" />
              Ask a Question
            </button>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-6 border-t border-gray-200">
            <p className="trades-caption text-gray-500">
              Please approve or decline this variation as soon as possible to avoid delays.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}