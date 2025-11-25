import { Info, Download, Share } from "lucide-react";
import { Alert, AlertDescription } from "./alert";

interface PDFShareHelpProps {
  type: 'quote' | 'invoice' | 'variation';
  show: boolean;
  onDismiss: () => void;
}

export function PDFShareHelp({ type, show, onDismiss }: PDFShareHelpProps) {
  if (!show) return null;

  const getTypeText = () => {
    switch (type) {
      case 'quote': return 'quote';
      case 'invoice': return 'invoice';
      case 'variation': return 'variation order';
    }
  };

  const getFileName = () => {
    switch (type) {
      case 'quote': return 'Quote-QUO001-ClientName.png';
      case 'invoice': return 'Invoice-INV001-ClientName.png';
      case 'variation': return 'Variation-VAR001-ClientName.png';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-auto shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Share size={24} style={{ color: '#0A84FF' }} />
          </div>
          <div>
            <h3 className="trades-h2" style={{ color: '#111827' }}>PDF Downloaded!</h3>
            <p className="trades-caption" style={{ color: '#6B7280' }}>WhatsApp is opening...</p>
          </div>
        </div>

        <Alert className="mb-4" style={{ backgroundColor: '#EFF6FF', borderColor: '#0A84FF' }}>
          <Info className="h-4 w-4" style={{ color: '#0A84FF' }} />
          <AlertDescription style={{ color: '#1E40AF' }}>
            <strong>Next steps:</strong><br />
            1. The {getTypeText()} has been downloaded as "{getFileName()}"<br />
            2. WhatsApp will open with a pre-filled message<br />
            3. Attach the downloaded file by tapping the paperclip icon<br />
            4. Send the message with the attached {getTypeText()}
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-2 text-center">
          <div className="flex-1 flex flex-col items-center p-3 bg-gray-50 rounded-lg">
            <Download size={20} style={{ color: '#16A34A' }} className="mb-1" />
            <span className="trades-caption" style={{ color: '#16A34A' }}>Downloaded</span>
          </div>
          <div className="flex-1 flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <Share size={20} style={{ color: '#0A84FF' }} className="mb-1" />
            <span className="trades-caption" style={{ color: '#0A84FF' }}>WhatsApp Opening</span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full mt-4 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl py-3"
          style={{ color: '#111827' }}
        >
          <span className="trades-body">Got it!</span>
        </button>
      </div>
    </div>
  );
}