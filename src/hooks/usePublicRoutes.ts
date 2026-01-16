import { useEffect } from 'react';
import { useAppStore } from './useAppStore';

/**
 * Hook to handle public URL routes on app load
 * Handles quote approval, variation approval, and team invitation URLs
 */
export const usePublicRoutes = () => {
  const { navigate } = useAppStore();

  useEffect(() => {
    // Handle query parameter routes (e.g., ?route=quote-approval&id=123)
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
      return; // Exit early if we found a query param route
    }

    // Handle pathname-based routes (e.g., /invite/{token})
    const pathname = window.location.pathname;

    // Team invitation links: /invite/{token}
    if (pathname.startsWith('/invite/')) {
      const token = pathname.replace('/invite/', '');
      if (token) {
        console.log('📧 Invitation link detected, token:', token);
        navigate('accept-invitation', { token });
        // Clean up the URL without reloading
        window.history.replaceState({}, '', '/');
      }
    }
  }, [navigate]);
};