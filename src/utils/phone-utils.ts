/**
 * Phone number utilities for WorkBeam
 * Handles formatting phone numbers with country codes for international use
 */

/**
 * Formats a phone number for WhatsApp by combining with selected country code
 * @param phoneNumber - The phone number to format
 * @param selectedDialCode - The selected dial code (e.g., '+44', '+1')
 * @returns Formatted phone number with country code for WhatsApp (without +)
 */
export function formatPhoneForWhatsApp(phoneNumber: string, selectedDialCode: string = '+44'): string {
  if (!phoneNumber) return '';
  
  // Remove all spaces, dashes, and other non-numeric characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Extract the numeric part of the dial code
  const dialCodeNumeric = selectedDialCode.replace(/^\+/, '');
  
  // If the number already starts with +, remove it and check if it starts with our dial code
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
    if (cleaned.startsWith(dialCodeNumeric)) {
      return cleaned; // Already has the correct country code
    }
  }
  
  // If it starts with 00, replace with the dial code
  if (cleaned.startsWith('00')) {
    return dialCodeNumeric + cleaned.substring(2);
  }
  
  // If it already starts with the dial code, return as is
  if (cleaned.startsWith(dialCodeNumeric)) {
    return cleaned;
  }
  
  // For UK numbers starting with 0, replace 0 with country code
  if (selectedDialCode === '+44' && cleaned.startsWith('0')) {
    return dialCodeNumeric + cleaned.substring(1);
  }
  
  // For other countries, just prepend the dial code
  return dialCodeNumeric + cleaned;
}

/**
 * Legacy function for backward compatibility - uses default UK country code
 */
export function formatPhoneForWhatsAppLegacy(phoneNumber: string, defaultCountryCode: string = '44'): string {
  return formatPhoneForWhatsApp(phoneNumber, '+' + defaultCountryCode);
}

/**
 * Formats a phone number for display with proper spacing
 * @param phoneNumber - The phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If it starts with +44 (UK), format as +44 XXXX XXX XXX
  if (cleaned.startsWith('+44') || cleaned.startsWith('44')) {
    const withoutCode = cleaned.startsWith('+44') ? cleaned.substring(3) : cleaned.substring(2);
    if (withoutCode.length >= 10) {
      return `+44 ${withoutCode.substring(0, 4)} ${withoutCode.substring(4, 7)} ${withoutCode.substring(7)}`;
    }
  }
  
  // If it starts with 0 (UK format), format as 0XXXX XXX XXX
  if (cleaned.startsWith('0') && cleaned.length >= 11) {
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
  }
  
  // Return original if no formatting applied
  return phoneNumber;
}

/**
 * Validates if a phone number is valid
 * @param phoneNumber - The phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Must be at least 10 digits (excluding country code indicators)
  const digitsOnly = cleaned.replace(/[^0-9]/g, '');
  
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}