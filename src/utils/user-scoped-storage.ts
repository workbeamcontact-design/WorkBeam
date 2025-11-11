/**
 * User-Scoped Storage API
 * 
 * Provides data isolation for multi-user environment.
 * All data is scoped to the current authenticated user.
 */

// Get userId from localStorage (set by auth context)
export function getCurrentUserId(): string | null {
  try {
    const authData = localStorage.getItem('trades-app-auth-user');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.id || null;
    }
  } catch (error) {
    console.error('Failed to get current user ID:', error);
  }
  return null;
}

// Set current user (called by auth context)
export function setCurrentUserId(userId: string): void {
  try {
    const authData = { id: userId, timestamp: Date.now() };
    localStorage.setItem('trades-app-auth-user', JSON.stringify(authData));
  } catch (error) {
    console.error('Failed to set current user ID:', error);
  }
}

// Clear current user (called on sign out)
export function clearCurrentUserId(): void {
  try {
    localStorage.removeItem('trades-app-auth-user');
  } catch (error) {
    console.error('Failed to clear current user ID:', error);
  }
}

/**
 * Get user-scoped storage key
 */
export function getUserStorageKey(baseKey: string): string {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('No authenticated user. Please sign in.');
  }
  return `user:${userId}:${baseKey}`;
}

/**
 * Get data for current user
 */
export function getUserData<T>(key: string, defaultValue: T): T {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return defaultValue;
    }
    
    const storageKey = `user:${userId}:${key}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Failed to get user data for key ${key}:`, error);
  }
  
  return defaultValue;
}

/**
 * Set data for current user
 */
export function setUserData<T>(key: string, value: T): void {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user. Please sign in.');
    }
    
    const storageKey = `user:${userId}:${key}`;
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set user data for key ${key}:`, error);
    throw error;
  }
}

/**
 * Remove data for current user
 */
export function removeUserData(key: string): void {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return;
    }
    
    const storageKey = `user:${userId}:${key}`;
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Failed to remove user data for key ${key}:`, error);
  }
}

/**
 * Clear all data for current user
 */
export function clearAllUserData(): void {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return;
    }
    
    const prefix = `user:${userId}:`;
    const keysToRemove: string[] = [];
    
    // Find all keys for this user
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all user keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`Cleared ${keysToRemove.length} items for user ${userId}`);
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

/**
 * Migrate existing data to user-scoped storage
 * Call this once after adding authentication to existing app
 */
export function migrateToUserScopedStorage(userId: string): void {
  try {
    // Old storage key
    const oldKey = 'trades-app-data';
    const oldData = localStorage.getItem(oldKey);
    
    if (!oldData) {
      console.log('No existing data to migrate');
      return;
    }
    
    const parsed = JSON.parse(oldData);
    
    // Migrate each data type
    if (parsed.clients) {
      setUserData('clients', parsed.clients);
    }
    if (parsed.jobs) {
      setUserData('jobs', parsed.jobs);
    }
    if (parsed.quotes) {
      setUserData('quotes', parsed.quotes);
    }
    if (parsed.invoices) {
      setUserData('invoices', parsed.invoices);
    }
    if (parsed.payments) {
      setUserData('payments', parsed.payments);
    }
    if (parsed.bookings) {
      setUserData('bookings', parsed.bookings);
    }
    if (parsed.branding) {
      setUserData('branding', parsed.branding);
    }
    if (parsed.invoiceSettings) {
      setUserData('invoiceSettings', parsed.invoiceSettings);
    }
    if (parsed.businessDetails) {
      setUserData('businessDetails', parsed.businessDetails);
    }
    if (parsed.bankDetails) {
      setUserData('bankDetails', parsed.bankDetails);
    }
    
    console.log(`Migrated data to user:${userId}`);
    
    // Optionally remove old data
    // localStorage.removeItem(oldKey);
  } catch (error) {
    console.error('Failed to migrate data:', error);
  }
}
