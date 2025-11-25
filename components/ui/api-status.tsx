import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

interface ApiStatusProps {
  onStatusChange?: (isOnline: boolean) => void;
}

export function ApiStatus({ onStatusChange }: ApiStatusProps) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      setStatus('checking');
      setError(null);
      
      const healthData = await api.healthCheck();
      
      if (healthData) {
        setHealth(healthData);
        setStatus('online');
        onStatusChange?.(true);
      } else {
        setStatus('offline');
        setError('Server not responding');
        onStatusChange?.(false);
      }
    } catch (err) {
      console.error('API status check failed:', err);
      setStatus('offline');
      setError(err instanceof Error ? err.message : 'Connection failed');
      onStatusChange?.(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Loader2 size={16} className="animate-spin text-blue-600" />
        <span className="trades-caption text-blue-700">Connecting to server...</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="trades-label text-red-800 mb-1">Server Connection Failed</h4>
            <p className="trades-caption text-red-700 mb-3">
              {error || 'Unable to connect to the backend server.'}
            </p>
            <div className="space-y-2 trades-caption text-red-600">
              <p><strong>Possible causes:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Supabase edge function is not deployed</li>
                <li>Network connectivity issues</li>
                <li>Server configuration problems</li>
              </ul>
            </div>
            <button
              onClick={checkApiStatus}
              className="mt-3 px-3 py-2 bg-red-600 text-white trades-caption rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle size={16} className="text-green-600" />
      <span className="trades-caption text-green-700">
        {health?.environment === 'local-fallback' 
          ? 'Running in local mode (data saved to browser)' 
          : 'Server connected'
        }
      </span>
    </div>
  );
}