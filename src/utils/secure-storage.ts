/**
 * Secure Storage Wrapper
 * Provides encrypted localStorage with automatic encryption/decryption
 */

import { encrypt, decrypt, isCryptoAvailable } from './encryption';

/**
 * Prefix for encrypted keys to identify them
 */
const ENCRYPTED_PREFIX = '__enc__';

/**
 * Keys that should always be encrypted
 */
const SENSITIVE_KEYS = [
  'edit-client-draft',
  'new-client-draft',
  'new-job-draft',
  'quote-builder-draft',
  'business-details',
  'bank-details',
  'branding-data',
  'user-session',
  'api-tokens'
];

/**
 * Check if a key should be encrypted
 */
const shouldEncrypt = (key: string): boolean => {
  // Check if key matches any sensitive pattern
  return SENSITIVE_KEYS.some(sensitiveKey => 
    key.includes(sensitiveKey) || 
    key.startsWith(sensitiveKey)
  ) || key.includes('draft') || key.includes('token') || key.includes('password');
};

/**
 * SecureStorage class providing encrypted localStorage operations
 */
class SecureStorage {
  private fallbackToPlaintext: boolean = false;

  constructor() {
    // Check if crypto is available
    if (!isCryptoAvailable()) {
      console.warn('Web Crypto API not available. Falling back to plaintext storage.');
      this.fallbackToPlaintext = true;
    }
  }

  /**
   * Set an item in secure storage
   * @param key - Storage key
   * @param value - Value to store (will be encrypted if sensitive)
   */
  async setItem(key: string, value: any): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Encrypt if sensitive and crypto is available
      if (shouldEncrypt(key) && !this.fallbackToPlaintext) {
        try {
          const encryptedValue = await encrypt(stringValue);
          localStorage.setItem(ENCRYPTED_PREFIX + key, encryptedValue);
          // Remove any plaintext version
          localStorage.removeItem(key);
          return;
        } catch (error) {
          console.error(`Failed to encrypt ${key}:`, error);
          // Fall through to plaintext storage
        }
      }
      
      // Store as plaintext
      localStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get an item from secure storage
   * @param key - Storage key
   * @returns Decrypted value or null if not found
   */
  async getItem(key: string): Promise<any> {
    try {
      // Try encrypted version first
      const encryptedValue = localStorage.getItem(ENCRYPTED_PREFIX + key);
      if (encryptedValue && !this.fallbackToPlaintext) {
        try {
          const decryptedValue = await decrypt(encryptedValue);
          return decryptedValue;
        } catch (error) {
          console.error(`Failed to decrypt ${key}:`, error);
          // Fall through to plaintext version
        }
      }
      
      // Try plaintext version
      const plaintextValue = localStorage.getItem(key);
      if (plaintextValue) {
        try {
          return JSON.parse(plaintextValue);
        } catch {
          return plaintextValue;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove an item from secure storage
   * @param key - Storage key
   */
  removeItem(key: string): void {
    try {
      // Remove both encrypted and plaintext versions
      localStorage.removeItem(ENCRYPTED_PREFIX + key);
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  /**
   * Clear all items from secure storage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Get all keys (both encrypted and plaintext)
   * @returns Array of keys (without encryption prefix)
   */
  keys(): string[] {
    try {
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (key.startsWith(ENCRYPTED_PREFIX)) {
            allKeys.push(key.substring(ENCRYPTED_PREFIX.length));
          } else {
            allKeys.push(key);
          }
        }
      }
      return Array.from(new Set(allKeys)); // Remove duplicates
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Check if a key exists
   * @param key - Storage key
   * @returns True if key exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(ENCRYPTED_PREFIX + key) !== null ||
           localStorage.getItem(key) !== null;
  }

  /**
   * Migrate existing plaintext data to encrypted storage
   * Call this once to upgrade existing data
   */
  async migrateToEncrypted(): Promise<void> {
    if (this.fallbackToPlaintext) {
      console.log('Crypto not available, skipping migration');
      return;
    }

    console.log('Starting secure storage migration...');
    let migratedCount = 0;
    
    for (const sensitiveKey of SENSITIVE_KEYS) {
      try {
        // Check if plaintext version exists
        const plaintextValue = localStorage.getItem(sensitiveKey);
        if (plaintextValue && !localStorage.getItem(ENCRYPTED_PREFIX + sensitiveKey)) {
          // Migrate to encrypted
          await this.setItem(sensitiveKey, plaintextValue);
          migratedCount++;
          console.log(`Migrated: ${sensitiveKey}`);
        }
      } catch (error) {
        console.error(`Failed to migrate ${sensitiveKey}:`, error);
      }
    }
    
    console.log(`Migration complete. Migrated ${migratedCount} items.`);
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export class for testing
export { SecureStorage };