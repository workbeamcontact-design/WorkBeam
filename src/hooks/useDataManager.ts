import { useState, useCallback } from 'react';
import { api } from '../utils/api';
import { removeUserData } from '../utils/user-scoped-storage';
import { useAppStore } from './useAppStore';

/**
 * Centralized Data Manager Hook
 * 
 * Manages loading, caching, and clearing of all user data
 * Ensures data is loaded on login and cleared on logout
 */
export const useDataManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshDashboard } = useAppStore();

  /**
   * Load all user data in parallel
   * Called on login and manual refresh
   */
  const loadAllData = useCallback(async () => {
    console.log('📦 Loading all user data...');
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel for maximum performance
      const [clients, jobs, invoices, bookings, quotes, payments] = await Promise.all([
        api.getClients(),
        api.getJobs(),
        api.getInvoices(),
        api.getBookings(),
        api.getQuotes(),
        api.getPayments()
      ]);

      console.log('✅ All data loaded successfully:', {
        clients: clients.length,
        jobs: jobs.length,
        invoices: invoices.length,
        bookings: bookings.length,
        quotes: quotes.length,
        payments: payments.length
      });

      // Trigger dashboard refresh to use new data
      refreshDashboard();

      return {
        clients,
        jobs,
        invoices,
        bookings,
        quotes,
        payments,
        success: true
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error('❌ Failed to load all data:', err);
      setError(errorMessage);
      
      return {
        clients: [],
        jobs: [],
        invoices: [],
        bookings: [],
        quotes: [],
        payments: [],
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [refreshDashboard]);

  /**
   * Clear all user data from cache
   * Called on logout
   */
  const clearAllData = useCallback(() => {
    console.log('🧹 Clearing all user data from cache...');
    
    try {
      // Clear all user-scoped data from local storage
      removeUserData('clients');
      removeUserData('jobs');
      removeUserData('quotes');
      removeUserData('invoices');
      removeUserData('bookings');
      removeUserData('payments');
      removeUserData('businessDetails');
      removeUserData('branding');
      removeUserData('bankDetails');
      
      console.log('✅ All user data cleared from cache');
    } catch (err) {
      console.error('❌ Failed to clear user data:', err);
    }
  }, []);

  /**
   * Refresh specific data type
   */
  const refreshData = useCallback(async (dataType: 'clients' | 'jobs' | 'invoices' | 'bookings' | 'quotes' | 'payments') => {
    console.log(`🔄 Refreshing ${dataType}...`);
    
    try {
      let data;
      switch (dataType) {
        case 'clients':
          data = await api.getClients();
          break;
        case 'jobs':
          data = await api.getJobs();
          break;
        case 'invoices':
          data = await api.getInvoices();
          break;
        case 'bookings':
          data = await api.getBookings();
          break;
        case 'quotes':
          data = await api.getQuotes();
          break;
        case 'payments':
          data = await api.getPayments();
          break;
      }
      
      console.log(`✅ ${dataType} refreshed:`, data?.length || 0, 'items');
      return data;
    } catch (err) {
      console.error(`❌ Failed to refresh ${dataType}:`, err);
      throw err;
    }
  }, []);

  return {
    loadAllData,
    clearAllData,
    refreshData,
    isLoading,
    error
  };
};
