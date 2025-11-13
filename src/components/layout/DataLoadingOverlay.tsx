import React, { useEffect, useState } from 'react';
import { WorkBeamLogo } from '../ui/workbeam-logo';

interface DataLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

/**
 * Full-screen loading overlay shown while initial data loads after login
 * Prevents showing empty states and local mode banners
 */
export const DataLoadingOverlay: React.FC<DataLoadingOverlayProps> = ({ 
  isLoading, 
  message = 'Loading your data...' 
}) => {
  const [dots, setDots] = useState('');

  // Animated loading dots
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex items-center justify-center">
      <div className="w-full max-w-[390px] h-screen bg-white shadow-xl flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="mb-8">
          <WorkBeamLogo variant="light" width={200} />
        </div>

        {/* Loading Spinner */}
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>

        {/* Loading Message */}
        <p className="trades-body text-gray-600 mb-2">
          {message}
          <span className="inline-block w-8 text-left">{dots}</span>
        </p>

        <p className="trades-caption text-gray-400">
          This will only take a moment
        </p>
      </div>
    </div>
  );
};
