/**
 * Global error interceptor to handle circular reference errors
 * and other problematic serialization issues
 */

// Safe JSON stringifier that handles circular references
export const safeStringify = (obj: any, space?: string | number): string => {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    // Skip Window-related properties first (CRITICAL for cross-origin)
    if (key === 'window' || key === 'self' || key === 'top' || 
        key === 'parent' || key === 'frames' || key === 'defaultView' ||
        key === 'view' || key === 'ownerDocument') {
      return '[Window Reference]';
    }

    // Skip problematic React properties
    if (key.startsWith('__react') || 
        key.startsWith('_react') || 
        key.includes('Fiber') ||
        key === 'stateNode' ||
        key === 'return' ||
        key === 'child' ||
        key === 'sibling' ||
        key === 'alternate' ||
        key === '_owner') {
      return '[Filtered React Property]';
    }

    // Check for Window object (CRITICAL: wrap in try-catch)
    try {
      if (value === window || 
          (typeof Window !== 'undefined' && value instanceof Window)) {
        return '[Window Object]';
      }
    } catch (e) {
      // Cross-origin error during check - treat as Window
      return '[Window Object]';
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    // Handle DOM elements
    try {
      if (value instanceof Element || value instanceof Node) {
        return {
          __type: 'DOM_Element',
          tagName: value.nodeName,
          id: (value as any).id || null,
          className: (value as any).className || null
        };
      }
    } catch (e) {
      return '[DOM Element - Cross-origin]';
    }

    // Handle functions
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    return value;
  }, space);
};

// Initialize error interceptor immediately at module level
const initErrorInterceptorImmediately = () => {
  // Intercept console.error to catch circular reference warnings
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args) => {
    const message = args[0];
    const secondArg = args[1];
    
    // Check for 401 errors in various formats
    const is401Error = (
      (typeof message === 'string' && message.includes('API Error: 401')) ||
      (typeof message === 'string' && message.includes('401') && 
       secondArg && typeof secondArg === 'object' && secondArg.error === 'Unauthorized') ||
      (secondArg && typeof secondArg === 'object' && 
       (secondArg.error === 'Unauthorized' || secondArg.status === 401))
    );
    
    if (typeof message === 'string' && (
      message.includes('circular structure') ||
      message.includes('Converting circular structure') ||
      message.includes('JSON.stringify') ||
      message.includes('circular reference') ||
      is401Error
    )) {
      // Silently handle circular reference errors and expected 401 auth errors
      return;
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('circular structure') ||
      message.includes('Converting circular structure') ||
      message.includes('JSON.stringify') ||
      message.includes('circular reference') ||
      message.includes('touch targets smaller than 44px') ||
      message.includes('Accessibility warnings') ||
      message.includes('Button without accessible name') ||
      message.includes('Performance Issue') ||
      message.includes('long_task') ||
      message.includes('threshold') ||
      message.includes('API Not Found (404)') ||
      message.includes('not found') && message.includes('404')
    )) {
      // Suppress all performance warnings, circular reference warnings, 404 warnings, and repetitive accessibility warnings
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Override global JSON.stringify to handle circular references
  const originalStringify = JSON.stringify;
  (window as any).JSON.stringify = (value: any, replacer?: any, space?: any) => {
    try {
      return originalStringify.call(JSON, value, replacer, space);
    } catch (error) {
      if (error.message && error.message.includes('circular')) {
        // Silently use safe stringify for circular references
        return safeStringify(value, space);
      }
      throw error;
    }
  };

  // Add error event listener with safe handling
  window.addEventListener('error', (event) => {
    try {
      // CRITICAL: Wrap ALL event property access in try-catch
      let message = '';
      try {
        message = event.message ? String(event.message) : '';
      } catch (e) {
        // Cross-origin error - just return silently
        return;
      }

      if (message && (
        message.includes('circular structure') ||
        message.includes('Converting circular structure') ||
        message.includes('cross-origin') ||
        message.includes('toJSON')
      )) {
        // Silently handle these errors
        try { event.preventDefault(); } catch (e) {}
      }
    } catch (e) {
      // Silently fail
    }
  });

  // Handle unhandled promise rejections with circular references
  window.addEventListener('unhandledrejection', (event) => {
    try {
      // CRITICAL: Wrap ALL event property access in try-catch
      let message = '';
      try {
        message = event.reason?.message ? String(event.reason.message) : '';
      } catch (e) {
        // Cross-origin error - just return silently
        return;
      }

      if (message && (
        message.includes('circular structure') ||
        message.includes('Converting circular structure') ||
        message.includes('cross-origin') ||
        message.includes('toJSON')
      )) {
        // Silently handle these errors
        try { event.preventDefault(); } catch (e) {}
      }
    } catch (e) {
      // Silently fail
    }
  });
};

// Initialize immediately at module load (before any other code runs)
initErrorInterceptorImmediately();

// Export a no-op version for backwards compatibility
export const initializeErrorInterceptor = () => {
  // Already initialized at module level, this is a no-op
};