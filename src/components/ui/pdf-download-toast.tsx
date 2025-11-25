import { Download, Share, Paperclip, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface PDFDownloadToastProps {
  fileName: string;
  type: 'quote' | 'invoice' | 'variation';
  onClose: () => void;
}

export function PDFDownloadToast({ fileName, type, onClose }: PDFDownloadToastProps) {
  const [step, setStep] = useState<'downloading' | 'downloaded' | 'whatsapp' | 'complete'>('downloading');

  useEffect(() => {
    const timer1 = setTimeout(() => setStep('downloaded'), 1000);
    const timer2 = setTimeout(() => setStep('whatsapp'), 2000);
    const timer3 = setTimeout(() => setStep('complete'), 4000);
    const timer4 = setTimeout(() => onClose(), 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onClose]);

  const getTypeText = () => {
    switch (type) {
      case 'quote': return 'Quote';
      case 'invoice': return 'Invoice';
      case 'variation': return 'Variation Order';
    }
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-white rounded-xl shadow-lg border p-4 max-w-sm mx-auto" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {step === 'downloading' && (
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Download size={16} style={{ color: '#0A84FF' }} className="animate-bounce" />
            </div>
          )}
          {step === 'downloaded' && (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={16} style={{ color: '#16A34A' }} />
            </div>
          )}
          {step === 'whatsapp' && (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Share size={16} style={{ color: '#16A34A' }} />
            </div>
          )}
          {step === 'complete' && (
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Paperclip size={16} style={{ color: '#16A34A' }} />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="trades-label" style={{ color: '#111827' }}>
            {step === 'downloading' && `Downloading ${getTypeText()}...`}
            {step === 'downloaded' && `${getTypeText()} Downloaded!`}
            {step === 'whatsapp' && 'Opening WhatsApp...'}
            {step === 'complete' && 'Ready to Send!'}
          </div>
          
          <div className="trades-caption mt-1" style={{ color: '#6B7280' }}>
            {step === 'downloading' && 'Creating PDF document...'}
            {step === 'downloaded' && `Saved as: ${fileName}`}
            {step === 'whatsapp' && 'Message pre-filled with instructions'}
            {step === 'complete' && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Paperclip size={12} />
                  <span>Tap paperclip icon in WhatsApp</span>
                </div>
                <div>Attach the downloaded file and send!</div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
        >
          <span style={{ color: '#6B7280', fontSize: '12px' }}>×</span>
        </button>
      </div>

      {step === 'complete' && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border" style={{ borderColor: '#0A84FF20' }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span style={{ color: 'white', fontSize: '10px' }}>💡</span>
            </div>
            <span className="trades-caption" style={{ color: '#1E40AF' }}>
              <strong>Next:</strong> In WhatsApp, tap 📎 → Document → Select "{fileName}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
}