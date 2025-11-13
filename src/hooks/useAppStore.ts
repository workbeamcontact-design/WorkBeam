import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Screen = 
  | 'dashboard' | 'clients' | 'calendar' | 'settings'
  | 'client-detail' | 'job-detail' | 'quote-builder' | 'quote-detail' | 'quote-preview' | 'quote-list'
  | 'variation-builder' | 'quote-approval' | 'variation-approval'
  | 'payment-recorder' | 'add-booking' | 'job-list' | 'new-client' | 'edit-client'
  | 'new-job' | 'booking-detail' | 'generate-invoice' | 'invoice-detail' | 'invoice-list'
  | 'record-payment' | 'branding-logo' | 'invoice-templates' | 'invoice-template-preview'
  | 'business-details' | 'business-preview' | 'bank-details' | 'notifications-settings'
  | 'subscription' | 'profile-edit' | 'business-analytics' | 'data-refresh'
  | 'team-management' | 'invite-member' | 'accept-invitation' | 'activity-log'
  | 'stub-calling' | 'stub-whatsapp' | 'stub-sms' | 'stub-maps';

interface NavigationState {
  screen: Screen;
  data: any;
  history: Array<{ screen: Screen; data: any }>;
}

interface AppState {
  // Navigation
  navigation: NavigationState;
  
  // App Status
  isLocalMode: boolean;
  calendarRefreshKey: number;
  dashboardRefreshKey: number;
  clientDetailRefreshKey: number;
  jobDetailRefreshKey: number;
  networkError: string | null;
  isInitialized: boolean;
  
  // UI State
  isLoading: boolean;
  lastUpdated: number;
  
  // Actions
  navigate: (screen: Screen, data?: any) => void;
  goBack: () => void;
  setTabScreen: (tab: 'home' | 'clients' | 'calendar' | 'settings') => void;
  setLocalMode: (isLocal: boolean) => void;
  setNetworkError: (error: string | null) => void;
  refreshCalendar: () => void;
  refreshDashboard: () => void;
  refreshClientDetail: () => void;
  refreshJobDetail: () => void;
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  updateLastActivity: () => void;
  
  // Getters
  getActiveTab: () => 'home' | 'clients' | 'calendar' | 'settings';
  canGoBack: () => boolean;
  
  // Cleanup
  clearNavigationHistory: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      navigation: {
        screen: 'dashboard',
        data: null,
        history: []
      },
      isLocalMode: false,
      calendarRefreshKey: 0,
      dashboardRefreshKey: 0,
      clientDetailRefreshKey: 0,
      jobDetailRefreshKey: 0,
      networkError: null,
      isInitialized: false,
      isLoading: false,
      lastUpdated: Date.now(),

      // Navigation Actions
      navigate: (screen: Screen, data?: any) => {
        if (!screen) {
          console.error('❌ Navigation blocked: No screen specified');
          return;
        }

        // Validate data for screens that require it
        const screensRequiringData = [
          'client-detail', 'job-detail', 'quote-detail', 'quote-preview',
          'invoice-detail', 'record-payment', 'edit-client', 'booking-detail'
        ];

        if (screensRequiringData.includes(screen) && !data) {
          console.warn(`⚠️ Navigation to ${screen} without required data, redirecting to safe screen`);
          set(state => ({
            navigation: {
              screen: screen.includes('client') ? 'clients' : 'dashboard',
              data: null,
              history: []
            },
            lastUpdated: Date.now()
          }));
          return;
        }

        console.log(`✅ Navigation successful: ${screen}`);

        set(state => {
          const newState: any = {
            navigation: {
              screen,
              data,
              history: [...state.navigation.history, { 
                screen: state.navigation.screen, 
                data: state.navigation.data 
              }]
            },
            lastUpdated: Date.now()
          };

          // Refresh dashboard when navigating to it to ensure fresh data
          if (screen === 'dashboard') {
            newState.dashboardRefreshKey = state.dashboardRefreshKey + 1;
            console.log('🔄 Auto-refreshing dashboard data');
          }

          return newState;
        });
      },

      goBack: () => {
        set(state => {
          const currentScreen = state.navigation.screen;
          const currentData = state.navigation.data;
          
          // First, try to use history if available
          const newHistory = [...state.navigation.history];
          const previous = newHistory.pop();

          if (previous) {
            console.log(`📱 Going back from ${currentScreen} to ${previous.screen} (from history)`);
            const newState: any = {
              navigation: {
                screen: previous.screen,
                data: previous.data,
                history: newHistory
              },
              lastUpdated: Date.now()
            };
            
            // Refresh dashboard when going back to it
            if (previous.screen === 'dashboard') {
              newState.dashboardRefreshKey = state.dashboardRefreshKey + 1;
              console.log('🔄 Auto-refreshing dashboard data on back navigation');
            }
            
            return newState;
          }

          // If no history, use logical parent based on screen type
          console.log(`📱 Going back from ${currentScreen} using logical navigation (no history)`);
          
          // Helper to extract parent data from current data
          const getParentData = (screen: Screen, data: any) => {
            if (!data) return null;
            
            // Extract parent reference based on screen type
            switch (screen) {
              case 'edit-client':
                return data; // Client data itself
              case 'job-detail':
                return data.client || { id: data.client_id }; // Job has client reference
              case 'new-job':
                return data; // Client data passed when creating job
              case 'quote-builder':
              case 'quote-detail':
              case 'variation-builder':
              case 'generate-invoice':
              case 'payment-recorder':
                return data.job || data; // These receive job data
              case 'quote-preview':
                return data.quote || data; // Quote preview receives quote data
              case 'record-payment':
                return data.invoice || data; // Record payment receives invoice data
              default:
                return null;
            }
          };
          
          // Define logical back destinations
          const logicalBack: Record<Screen, Screen> = {
            // Main tabs - shouldn't happen, but fallback to dashboard
            'dashboard': 'dashboard',
            'clients': 'dashboard',
            'calendar': 'dashboard',
            'settings': 'dashboard',
            
            // Client-related screens
            'client-detail': 'clients',
            'edit-client': 'client-detail',
            'new-client': 'clients',
            
            // Job-related screens
            'job-detail': 'client-detail',
            'job-list': 'clients',
            'new-job': 'client-detail',
            
            // Quote-related screens
            'quote-builder': 'job-detail',
            'quote-detail': 'job-detail',
            'quote-preview': 'quote-detail',
            'variation-builder': 'job-detail',
            
            // Invoice-related screens
            'generate-invoice': 'job-detail',
            'invoice-detail': 'invoice-list',
            'invoice-list': 'clients',
            'record-payment': 'invoice-detail',
            
            // Booking-related screens
            'add-booking': 'calendar',
            'booking-detail': 'calendar',
            
            // Payment screens
            'payment-recorder': 'job-detail',
            
            // Settings screens
            'branding-logo': 'settings',
            'invoice-templates': 'settings',
            'invoice-template-preview': 'invoice-templates',
            'business-details': 'settings',
            'business-preview': 'business-details',
            'bank-details': 'settings',
            'notifications-settings': 'settings',
            'subscription': 'settings',
            'profile-edit': 'settings',
            
            // Analytics
            'business-analytics': 'dashboard',
            
            // Public screens
            'quote-approval': 'dashboard',
            'variation-approval': 'dashboard',
            
            // Stub screens
            'stub-calling': 'dashboard',
            'stub-whatsapp': 'dashboard',
            'stub-sms': 'dashboard',
            'stub-maps': 'dashboard',
          };

          const backScreen = logicalBack[currentScreen];
          
          if (backScreen) {
            // Get appropriate parent data
            const parentData = getParentData(currentScreen, currentData);
            
            const newState: any = {
              navigation: {
                screen: backScreen,
                data: parentData,
                history: []
              },
              lastUpdated: Date.now()
            };
            
            // Refresh dashboard when going back to it
            if (backScreen === 'dashboard') {
              newState.dashboardRefreshKey = state.dashboardRefreshKey + 1;
              console.log('🔄 Auto-refreshing dashboard data on logical back');
            }
            
            return newState;
          }

          // Ultimate fallback - always dashboard
          console.warn(`⚠️ No logical back destination for ${currentScreen}, going to dashboard`);
          return {
            navigation: {
              screen: 'dashboard',
              data: null,
              history: []
            },
            dashboardRefreshKey: state.dashboardRefreshKey + 1,
            lastUpdated: Date.now()
          };
        });
      },

      setTabScreen: (tab: 'home' | 'clients' | 'calendar' | 'settings') => {
        const screenMap = {
          home: 'dashboard' as const,
          clients: 'clients' as const,
          calendar: 'calendar' as const,
          settings: 'settings' as const
        };

        set(state => {
          const targetScreen = screenMap[tab];
          const newState: any = {
            navigation: {
              screen: targetScreen,
              data: null,
              history: []
            },
            lastUpdated: Date.now()
          };
          
          // Refresh dashboard when switching to home tab
          if (tab === 'home') {
            newState.dashboardRefreshKey = state.dashboardRefreshKey + 1;
            console.log('🔄 Auto-refreshing dashboard data on tab switch');
          }
          
          return newState;
        });
      },

      // App Status Actions
      setLocalMode: (isLocal: boolean) => {
        set({ isLocalMode: isLocal, lastUpdated: Date.now() });
      },

      setNetworkError: (error: string | null) => {
        set({ networkError: error, lastUpdated: Date.now() });
      },

      refreshCalendar: () => {
        console.log('🔄 Refreshing calendar data');
        set(state => ({ 
          calendarRefreshKey: state.calendarRefreshKey + 1,
          lastUpdated: Date.now()
        }));
      },

      refreshDashboard: () => {
        console.log('🔄 Refreshing dashboard data');
        set(state => ({ 
          dashboardRefreshKey: state.dashboardRefreshKey + 1,
          lastUpdated: Date.now()
        }));
      },

      refreshClientDetail: () => {
        console.log('🔄 Refreshing client detail data');
        set(state => ({ 
          clientDetailRefreshKey: state.clientDetailRefreshKey + 1,
          lastUpdated: Date.now()
        }));
      },

      refreshJobDetail: () => {
        console.log('🔄 Refreshing job detail data');
        set(state => ({ 
          jobDetailRefreshKey: state.jobDetailRefreshKey + 1,
          lastUpdated: Date.now()
        }));
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized, lastUpdated: Date.now() });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading, lastUpdated: Date.now() });
      },

      updateLastActivity: () => {
        set({ lastUpdated: Date.now() });
      },

      // Getters
      getActiveTab: () => {
        const { screen } = get().navigation;
        if (screen === 'dashboard' || screen === 'business-analytics') return 'home';
        if (screen === 'clients' || screen.includes('client') || screen.includes('job') || screen.includes('quote') || screen.includes('invoice')) return 'clients';
        if (screen === 'calendar' || screen.includes('booking')) return 'calendar';
        if (screen === 'settings' || screen.includes('branding') || screen.includes('business') || screen.includes('bank') || screen.includes('notifications') || screen.includes('template') || screen === 'subscription' || screen === 'profile-edit') return 'settings';
        return 'home';
      },

      canGoBack: () => {
        return get().navigation.history.length > 0;
      },

      // Clear navigation history and reset to dashboard - used after deletions or login
      clearNavigationHistory: () => {
        console.log('🧹 Clearing navigation history and resetting to dashboard');
        set(state => ({
          navigation: {
            screen: 'dashboard',
            data: null,
            history: []
          },
          lastUpdated: Date.now()
        }));
      }
    }),
    {
      name: 'trades-app-store',
      partialize: (state) => ({
        // Only persist the current screen, NOT the navigation data or history
        // This prevents stale data references from being restored on app load
        navigation: {
          screen: state.navigation.screen,
          data: null, // Don't persist data objects
          history: [] // Don't persist history
        },
        calendarRefreshKey: state.calendarRefreshKey,
        lastUpdated: state.lastUpdated
      }),
      onRehydrateStorage: () => {
        console.log('🔄 Zustand: BEFORE rehydration');
        
        return (state) => {
          console.log('🔄 Zustand: AFTER rehydration, checking state...', {
            hasState: !!state,
            screen: state?.navigation?.screen,
            hasData: !!state?.navigation?.data
          });
          
          if (!state) return;
          
          // Check if we're on a screen that requires data but data is null
          const screensRequiringData = [
            'client-detail', 'job-detail', 'quote-detail', 'quote-preview',
            'invoice-detail', 'record-payment', 'edit-client', 'booking-detail'
          ];
          
          if (screensRequiringData.includes(state.navigation.screen) && !state.navigation.data) {
            console.warn(`⚠️ Rehydrated on ${state.navigation.screen} without data (page refresh). Redirecting to safe screen.`);
            
            // Redirect to appropriate parent screen
            const screen = state.navigation.screen;
            let safeScreen: Screen = 'dashboard';
            
            if (screen.includes('client')) safeScreen = 'clients';
            else if (screen.includes('job') || screen.includes('quote')) safeScreen = 'clients';
            else if (screen.includes('invoice')) safeScreen = 'invoice-list';
            else if (screen.includes('booking')) safeScreen = 'calendar';
            
            console.log(`✅ Redirecting to safe screen: ${safeScreen}`);
            
            state.navigation = {
              screen: safeScreen,
              data: null,
              history: []
            };
          }
        };
      }
    }
  )
);