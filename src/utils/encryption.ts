/**
 * Encryption Utility using Web Crypto API
 * Provides secure encryption/decryption for sensitive data
 */

// Convert string to ArrayBuffer
const str2ab = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str);
};

// Convert ArrayBuffer to string
const ab2str = (buffer: ArrayBuffer): string => {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
};

// Convert ArrayBuffer to base64
const ab2base64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert base64 to ArrayBuffer
const base642ab = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Generate or retrieve encryption key
 * Stores key in sessionStorage for session persistence
 */
const getEncryptionKey = async (): Promise<CryptoKey> => {
  // Check if we have a key in sessionStorage
  const storedKey = sessionStorage.getItem('_ek');
  
  if (storedKey) {
    try {
      const keyData = base642ab(storedKey);
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.warn('Failed to import stored key, generating new one');
    }
  }
  
  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Export and store key
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem('_ek', ab2base64(exportedKey));
  
  return key;
};

/**
 * Encrypt data using AES-GCM
 * @param data - Data to encrypt (will be stringified if object)
 * @returns Base64-encoded encrypted data with IV prepended
 */
export const encrypt = async (data: any): Promise<string> => {
  try {
    // Convert data to string if necessary
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Get encryption key
    const key = await getEncryptionKey();
    
    // Generate random IV (12 bytes for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      str2ab(dataStr)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Return as base64
    return ab2base64(combined.buffer);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES-GCM
 * @param encryptedData - Base64-encoded encrypted data with IV
 * @returns Decrypted data (parsed as JSON if possible)
 */
export const decrypt = async (encryptedData: string): Promise<any> => {
  try {
    // Convert from base64
    const combined = base642ab(encryptedData);
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    // Get encryption key
    const key = await getEncryptionKey();
    
    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Convert to string
    const dataStr = ab2str(decryptedData);
    
    // Try to parse as JSON
    try {
      return JSON.parse(dataStr);
    } catch {
      return dataStr;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash data using SHA-256
 * Useful for creating checksums or hashing passwords
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export const hash = async (data: string): Promise<string> => {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', str2ab(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Hashing failed:', error);
    throw new Error('Failed to hash data');
  }
};

/**
 * Clear encryption key from sessionStorage
 * Call this on logout or when security context changes
 */
export const clearEncryptionKey = (): void => {
  sessionStorage.removeItem('_ek');
};

/**
 * Check if Web Crypto API is available
 */
export const isCryptoAvailable = (): boolean => {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues === 'function';
};