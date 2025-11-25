/**
 * Input Sanitization Utility
 * Prevents XSS attacks and sanitizes user input
 */

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters
 * @param str - String to escape
 * @returns Escaped string safe for HTML
 */
export const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
};

/**
 * Remove all HTML tags from a string
 * @param str - String to strip
 * @returns String with all HTML tags removed
 */
export const stripHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Sanitize string for use in SQL-like queries
 * Removes common SQL injection patterns
 * Note: This is a backup - always use parameterized queries
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeSql = (str: string): string => {
  if (typeof str !== 'string') return '';
  
  // Remove common SQL injection patterns
  const dangerous = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\bOR\b.*?=.*?)/gi,
    /(\bAND\b.*?=.*?)/gi,
    /('|"|\`)/g
  ];
  
  let sanitized = str;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
};

/**
 * Sanitize email address
 * Removes invalid characters and validates format
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  
  // Remove whitespace
  email = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) {
    return '';
  }
  
  return email;
};

/**
 * Sanitize phone number
 * Removes invalid characters, keeps only digits, +, -, (, ), and spaces
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';
  
  // Keep only valid phone characters
  return phone.replace(/[^\d\s+()-]/g, '').trim();
};

/**
 * Sanitize URL
 * Ensures URL is safe and properly formatted
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';
  
  url = url.trim();
  
  // Remove dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:'];
  for (const protocol of dangerousProtocols) {
    if (url.toLowerCase().startsWith(protocol)) {
      return '';
    }
  }
  
  // Ensure URL has a protocol
  if (!url.match(/^https?:\/\//i) && url.length > 0) {
    url = 'https://' + url;
  }
  
  // Validate URL format
  try {
    new URL(url);
    return url;
  } catch {
    return '';
  }
};

/**
 * Sanitize postcode (UK format)
 * @param postcode - Postcode to sanitize
 * @returns Sanitized postcode in uppercase
 */
export const sanitizePostcode = (postcode: string): string => {
  if (typeof postcode !== 'string') return '';
  
  // Remove invalid characters, keep only alphanumeric and spaces
  postcode = postcode.replace(/[^A-Z0-9\s]/gi, '').toUpperCase().trim();
  
  // Add space if missing (e.g., "SW1A1AA" -> "SW1A 1AA")
  if (postcode.length >= 5 && !postcode.includes(' ')) {
    postcode = postcode.slice(0, -3) + ' ' + postcode.slice(-3);
  }
  
  return postcode;
};

/**
 * Sanitize filename
 * Removes path traversal attempts and invalid characters
 * @param filename - Filename to sanitize
 * @returns Safe filename
 */
export const sanitizeFilename = (filename: string): string => {
  if (typeof filename !== 'string') return '';
  
  // Remove path components
  filename = filename.replace(/^.*[\\\/]/, '');
  
  // Remove invalid characters
  filename = filename.replace(/[^a-z0-9._-]/gi, '_');
  
  // Prevent hidden files
  if (filename.startsWith('.')) {
    filename = '_' + filename;
  }
  
  // Limit length
  if (filename.length > 255) {
    const extension = filename.split('.').pop();
    filename = filename.substring(0, 250) + '.' + extension;
  }
  
  return filename;
};

/**
 * Sanitize currency amount
 * Ensures value is a valid positive number
 * @param amount - Amount to sanitize
 * @returns Sanitized number or 0 if invalid
 */
export const sanitizeCurrency = (amount: any): number => {
  // Convert to number
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  
  // Check validity
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return 0;
  }
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
};

/**
 * Sanitize text input
 * General-purpose sanitization for text fields
 * @param text - Text to sanitize
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Sanitized text
 */
export const sanitizeText = (text: string, maxLength: number = 10000): string => {
  if (typeof text !== 'string') return '';
  
  // Trim whitespace
  text = text.trim();
  
  // Remove null bytes
  text = text.replace(/\0/g, '');
  
  // Limit length
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }
  
  return text;
};

/**
 * Deep sanitize an object
 * Recursively sanitizes all string values in an object
 * @param obj - Object to sanitize
 * @param sanitizer - Sanitization function to apply (default: sanitizeText)
 * @returns Sanitized object
 */
export const deepSanitize = <T extends Record<string, any>>(
  obj: T,
  sanitizer: (str: string) => string = sanitizeText
): T => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, sanitizer)) as any;
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizer(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = deepSanitize(value, sanitizer);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Sanitize client input
 * Specialized sanitization for client data
 * @param client - Client data to sanitize
 * @returns Sanitized client data
 */
export const sanitizeClientInput = (client: any): any => {
  if (!client || typeof client !== 'object') return client;
  
  return {
    ...client,
    name: sanitizeText(client.name || '', 100),
    email: sanitizeEmail(client.email || ''),
    phone: sanitizePhone(client.phone || ''),
    address: sanitizeText(client.address || '', 500),
    postcode: sanitizePostcode(client.postcode || ''),
    notes: sanitizeText(client.notes || '', 2000),
    company: sanitizeText(client.company || '', 100),
    vatNumber: sanitizeText(client.vatNumber || '', 20)
  };
};

/**
 * Sanitize job input
 * Specialized sanitization for job data
 * @param job - Job data to sanitize
 * @returns Sanitized job data
 */
export const sanitizeJobInput = (job: any): any => {
  if (!job || typeof job !== 'object') return job;
  
  return {
    ...job,
    title: sanitizeText(job.title || '', 200),
    description: sanitizeText(job.description || '', 2000),
    address: sanitizeText(job.address || '', 500),
    notes: sanitizeText(job.notes || '', 2000),
    estimatedValue: sanitizeCurrency(job.estimatedValue),
    subtotal: sanitizeCurrency(job.subtotal),
    vatAmount: sanitizeCurrency(job.vatAmount),
    cisAmount: sanitizeCurrency(job.cisAmount),
    total: sanitizeCurrency(job.total),
    materials: Array.isArray(job.materials) 
      ? job.materials.map((m: any) => ({
          ...m,
          name: sanitizeText(m.name || '', 200),
          quantity: sanitizeCurrency(m.quantity),
          rate: sanitizeCurrency(m.rate),
          total: sanitizeCurrency(m.total)
        }))
      : [],
    labour: Array.isArray(job.labour)
      ? job.labour.map((l: any) => ({
          ...l,
          name: sanitizeText(l.name || '', 200),
          hours: sanitizeCurrency(l.hours),
          rate: sanitizeCurrency(l.rate),
          total: sanitizeCurrency(l.total)
        }))
      : []
  };
};

/**
 * Create a sanitization middleware for API calls
 * Wraps API functions to automatically sanitize inputs
 * @param apiFunction - API function to wrap
 * @param sanitizer - Sanitization function to apply
 * @returns Wrapped API function with automatic sanitization
 */
export const withSanitization = <T extends (...args: any[]) => any>(
  apiFunction: T,
  sanitizer: (data: any) => any = deepSanitize
): T => {
  return ((...args: any[]) => {
    const sanitizedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return sanitizer(arg);
      }
      return arg;
    });
    return apiFunction(...sanitizedArgs);
  }) as T;
};