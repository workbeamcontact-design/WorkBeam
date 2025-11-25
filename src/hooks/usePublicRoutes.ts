import { useEffect } from 'react';
import { useAppStore } from './useAppStore';

/**
 * Hook to handle public URL routes on app load
 * Handles quote approval and variation approval URLs
 */
export const usePublicRoutes = () => {
  const { navigate } = useAppStore();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const publicRoute = urlParams.get('route');
    const itemId = urlParams.get('id');

    if (publicRoute && itemId) {
      // Handle public routes that don't require authentication
      if (publicRoute === 'quote-approval') {
        navigate('quote-approval', { quoteId: itemId });
      } else if (publicRoute === 'variation-approval') {
        navigate('variation-approval', { variationId: itemId });
      }
    }
  }, [navigate]);
};