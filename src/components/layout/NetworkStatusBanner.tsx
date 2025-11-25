import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { api } from '../../utils/api';
import { toast } from 'sonner@2.0.3';

/**
 * Network status banner - shows local mode and retry options
 */
export const NetworkStatusBanner: React.FC = () => {
  const { isLocalMode, networkError, setLocalMode, setNetworkError } = useAppStore();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-retry with exponential backoff
  useEffect(() => {
    if (!isLocalMode || retryCount >= 3) return;

    const delays = [10000, 30000, 60000]; // 10s, 30s, 60s
    const delay = delays[retryCount] || 60000;

    const timer = setTimeout(() => {
      handleAutoRetry();
    }, delay);

    return () => clearTimeout(timer);
  }, [isLocalMode, retryCount]);

  const handleAutoRetry = async () => {
    if (isRetrying) return;
    
    console.log(`🔄 Auto-retry ${retryCount + 1}/3...`);
    setIsRetrying(true);
    
    try {
      api.setLocalFallback(false);
      const testResult = await api.healthCheck();
      
      if (testResult?.environment !== 'local-fallback') {
        setLocalMode(false);
        setRetryCount(0);
        toast.success('Connection restored!', {
          description: 'Syncing with server',
          duration: 2000,
        });
      } else {
        setRetryCount(prev => prev + 1);
        api.setLocalFallback(true);
      }
    } catch (error) {
      setRetryCount(prev => prev + 1);
      api.setLocalFallback(true);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      console.log('🔄 Manual retry...');
      setNetworkError(null);
      api.setLocalFallback(false);
      
      const testResult = await api.healthCheck();
      if (testResult?.environment !== 'local-fallback') {
        setLocalMode(false);
        setRetryCount(0);
        toast.success('Connection restored!', {
          description: 'Syncing with server',
          duration: 3000,
        });
      } else {
        throw new Error('Network still unavailable');
      }
    } catch (error) {
      console.warn('🔄 Network recovery failed:', error);
      api.setLocalFallback(true);
      setLocalMode(true);
      toast.error('Network unavailable', {
        description: 'Retrying automatically',
        duration: 3000,
      });
    } finally {
      setIsRetrying(false);
    }
  };

  if (!isLocalMode) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="trades-caption text-yellow-800">
            📱 Local Mode: Data saved to browser only
          </p>
          {retryCount > 0 && retryCount < 3 && (
            <p className="trades-small text-yellow-700 mt-0.5">
              Auto-retry {retryCount}/3 - Next attempt in {[10, 30, 60][retryCount]}s
            </p>
          )}
        </div>
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRetrying ? 'Retrying...' : 'Retry Now'}
        </button>
      </div>
      {networkError && (
        <p className="trades-small text-yellow-700 mt-1">
          {networkError}
        </p>
      )}
    </div>
  );
};