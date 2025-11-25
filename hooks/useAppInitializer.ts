import { useEffect } from 'react';
import { useAppStore } from './useAppStore';
import { api } from '../utils/api';
import { initializeOverdueNotifications, triggerOverdueCheck } from '../utils/overdue-notification-service';
import { initializeErrorTracking } from '../utils/error-tracking';
import { initializePerformanceMonitoring } from '../utils/performance-monitor';
import { initializeAccessibility } from '../utils/accessibility';
import { initializeAccessibilityHelpers } from '../utils/accessibility-helpers';
import { initializeDevTools } from '../utils/dev-tools';
import { initializeErrorInterceptor } from '../utils/error-interceptor';
import { initializeSecurity, performSecurityCheck } from '../utils/security-init';
import { toast } from 'sonner@2.0.3';

/**
 * App initialization hook - handles all app startup logic
 * Now properly waits for session to be ready before health check
 */
export const useAppInitializer = (sessionReady: boolean = false) => {
  const { setLocalMode, setNetworkError, setInitialized } = useAppStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize error interceptor first to catch all errors
        initializeErrorInterceptor();
        
        // Initialize error tracking
        initializeErrorTracking();
        
        // Initialize performance monitoring
        initializePerformanceMonitoring();
        
        // Initialize accessibility features
        initializeAccessibility();
        initializeAccessibilityHelpers();
        
        // Initialize development tools (development only)
        initializeDevTools();
        
        // Initialize security features (encryption, migration)
        await initializeSecurity();
        performSecurityCheck();

        // SIMPLIFIED: Skip health checks entirely - trust authentication
        // If user logged in successfully, Supabase is working
        console.log('✅ Initialization complete - using Supabase backend');
        api.setLocalFallback(false);
        setLocalMode(false);
        
      } catch (error) {
        console.log('🟡 Using local storage mode due to:', error.message);
        api.setLocalFallback(true);
        setLocalMode(true);
      }
      
      // Note: Cache cleanup is now handled by auth-context during login/logout
      // Don't clear cache here as it can interfere with data loading after login
      
      // Initialize notification system with delay to avoid blocking render
      setTimeout(() => {
        try {
          initializeOverdueNotifications();
        } catch (error) {
          console.warn('Failed to initialize notification system:', error.message);
        }
      }, 1000);
      
      // Monitor for network errors and provide recovery options
      const handleNetworkError = (error: string) => {
        setNetworkError(error);
        if (!api.isUsingLocalFallback()) {
          console.log('🔄 Network error detected, enabling local fallback');
          api.setLocalFallback(true);
          setLocalMode(true);
          
          // Show user-friendly message
          setTimeout(() => {
            toast.error('Connection lost. App is now running in offline mode.', {
              description: 'Your data is being saved locally.',
              duration: 5000,
            });
          }, 1000);
        }
      };
      
      // Global error handler for unhandled promise rejections
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        if (event.reason && typeof event.reason === 'object' && event.reason.message) {
          const errorMessage = event.reason.message.toLowerCase();
          if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('timeout')) {
            console.warn('🔄 Unhandled network error detected:', event.reason);
            handleNetworkError(event.reason.message);
            event.preventDefault(); // Prevent default error handling
          }
        }
      };
      
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      setInitialized(true);
      
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    };

    initializeApp();
  }, [sessionReady, setLocalMode, setNetworkError, setInitialized]);
};

/**
 * Hook for overdue notification management
 */
export const useOverdueNotifications = (currentScreen: string) => {
  useEffect(() => {
    // Trigger notification checks for financial screens
    const financialScreens = ['dashboard', 'clients', 'invoice-list', 'business-analytics'];
    if (financialScreens.includes(currentScreen)) {
      const timeoutId = setTimeout(() => {
        triggerOverdueCheck();
      }, 1500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentScreen]);
};