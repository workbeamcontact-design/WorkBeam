/**
 * Security Initialization
 * Sets up encryption and migrates existing data
 */

import { secureStorage } from './secure-storage';
import { isCryptoAvailable } from './encryption';

/**
 * Initialize security features
 * Should be called once on app startup
 */
export const initializeSecurity = async (): Promise<void> => {
  console.log('🔒 Initializing security features...');
  
  try {
    // Check if Web Crypto API is available
    if (!isCryptoAvailable()) {
      console.warn('⚠️ Web Crypto API not available. Encryption disabled.');
      console.warn('⚠️ Running in fallback mode with plaintext storage.');
      return;
    }
    
    console.log('✅ Web Crypto API available');
    
    // Migrate existing data to encrypted storage
    await secureStorage.migrateToEncrypted();
    
    console.log('✅ Security initialization complete');
  } catch (error) {
    console.error('❌ Security initialization failed:', error);
    // Don't throw - allow app to continue with degraded security
  }
};

/**
 * Security check for production environments
 * Logs warnings if security features are not fully enabled
 */
export const performSecurityCheck = (): void => {
  const checks = {
    crypto: isCryptoAvailable(),
    https: window.location.protocol === 'https:',
    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null
  };
  
  console.log('🔒 Security Check:');
  console.log('  - Web Crypto API:', checks.crypto ? '✅' : '❌');
  console.log('  - HTTPS:', checks.https ? '✅' : '⚠️');
  console.log('  - CSP Header:', checks.csp ? '✅' : '⚠️');
  
  // Production warnings
  if (import.meta.env.PROD) {
    if (!checks.crypto) {
      console.error('❌ PRODUCTION WARNING: Web Crypto API not available');
    }
    if (!checks.https) {
      console.warn('⚠️ PRODUCTION WARNING: Not running on HTTPS');
    }
  }
};

/**
 * Clear all sensitive data from storage
 * Call this on logout or security incident
 */
export const clearSensitiveData = (): void => {
  console.log('🧹 Clearing sensitive data...');
  
  const sensitiveKeys = [
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
  
  sensitiveKeys.forEach(key => {
    secureStorage.removeItem(key);
  });
  
  console.log('✅ Sensitive data cleared');
};