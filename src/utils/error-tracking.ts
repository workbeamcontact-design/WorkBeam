/**
 * Enhanced error tracking and monitoring system
 * Provides comprehensive error handling, reporting, and user feedback
 */

export interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'validation' | 'rendering' | 'performance' | 'unknown';
}

class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors = 100; // Keep only last 100 errors
  private reportEndpoint?: string;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      try {
        // CRITICAL: Every property access must be wrapped in try-catch
        let message = 'Unknown error';
        try {
          message = event.message ? String(event.message) : 'Unknown error';
        } catch (e) {
          // Even accessing event.message can cause cross-origin errors
          return;
        }

        // Check if this is a circular reference or cross-origin error
        if (message.includes('circular structure') || 
            message.includes('cross-origin') ||
            message.includes('toJSON')) {
          // Silently ignore these errors to prevent error tracking loops
          return;
        }

        // Extract safe properties with individual try-catch for each
        const safeContext: any = { action: 'global_error' };
        try { if (event.filename) safeContext.filename = String(event.filename); } catch (e) {}
        try { if (event.lineno) safeContext.lineno = Number(event.lineno); } catch (e) {}
        try { if (event.colno) safeContext.colno = Number(event.colno); } catch (e) {}

        this.captureError(new Error(message), safeContext);
      } catch (handlerError) {
        // Silently fail to prevent infinite error loops - don't even log
      }
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      try {
        // Extract reason safely with try-catch
        let reasonMsg = 'Unknown rejection';
        try {
          const reason = event.reason;
          reasonMsg = reason?.message || String(reason);
        } catch (e) {
          // Even accessing event.reason can cause cross-origin errors
          return;
        }
        
        // Check for problematic errors
        if (reasonMsg.includes('circular structure') || 
            reasonMsg.includes('cross-origin') ||
            reasonMsg.includes('toJSON')) {
          // Silently ignore to prevent error tracking loops
          try { event.preventDefault(); } catch (e) {}
          return;
        }

        let errorObj: Error;
        try {
          errorObj = event.reason instanceof Error ? event.reason : new Error(reasonMsg);
        } catch (e) {
          errorObj = new Error(reasonMsg);
        }

        this.captureError(errorObj, { action: 'unhandled_promise_rejection' });
      } catch (handlerError) {
        // Silently fail to prevent infinite error loops - don't even log
      }
    });

    // React error boundaries will call this manually
    // Note: JSON.stringify override is handled by error-interceptor.ts
  }

  captureError(
    error: Error,
    context: Partial<ErrorContext> = {},
    severity: ErrorReport['severity'] = 'medium'
  ): string {
    try {
      // Don't track cross-origin or circular errors to prevent loops
      if (error.message.includes('cross-origin') || 
          error.message.includes('toJSON') ||
          error.message.includes('circular structure')) {
        return 'ignored';
      }

      const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Sanitize context to prevent circular references
      const safeContext = this.createSafeContext(context);
      
      const errorReport: ErrorReport = {
        id: errorId,
        message: error.message,
        stack: error.stack,
        severity,
        category: this.categorizeError(error),
        context: {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          ...safeContext
        }
      };

      // Store error locally
      this.errors.push(errorReport);
      
      // Keep only recent errors
      if (this.errors.length > this.maxErrors) {
        this.errors = this.errors.slice(-this.maxErrors);
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group(`🚨 Error Captured [${severity.toUpperCase()}]`);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.info('Context:', errorReport.context);
        console.groupEnd();
      }

      // Store in localStorage for persistence
      this.persistErrors();

      // Report to external service if configured
      this.reportError(errorReport);

      return errorId;
    } catch (captureError) {
      // If error tracking itself fails, silently log and return
      console.debug('Failed to capture error:', captureError);
      return 'failed';
    }
  }

  // Create a safe context object that won't cause circular references
  private createSafeContext(context: Partial<ErrorContext>): Partial<ErrorContext> {
    const safeContext: Partial<ErrorContext> = {};
    
    // Skip problematic keys entirely - includes Window-related properties
    const dangerousKeys = [
      'target', 'currentTarget', 'relatedTarget', 'srcElement',
      'path', 'composedPath', 'view', 'detail', 'sourceCapabilities',
      'returnValue', 'cancelBubble', 'defaultPrevented',
      'window', 'self', 'top', 'parent', 'frames', 'opener',
      'defaultView', 'ownerDocument', 'document'
    ];
    
    for (const [key, value] of Object.entries(context)) {
      // Skip dangerous keys that might contain DOM/Window references
      if (dangerousKeys.includes(key)) {
        continue;
      }
      
      // Check if value is a Window object before processing
      try {
        if (value === window || value?.window === window || 
            (typeof Window !== 'undefined' && value instanceof Window)) {
          continue; // Skip Window objects entirely
        }
      } catch (e) {
        // If we can't even check, skip it
        continue;
      }
      
      try {
        safeContext[key] = this.sanitizeValue(value);
      } catch (error) {
        // Don't even record the error if it's a cross-origin issue
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (!errorMsg.includes('cross-origin')) {
          safeContext[key] = { __type: 'CONTEXT_ERROR', error: 'Failed to serialize' };
        }
      }
    }
    
    return safeContext;
  }

  // Recursively sanitize values to prevent circular references
  private sanitizeValue(value: any, depth: number = 0): any {
    // Prevent infinite recursion
    if (depth > 3) {
      return { __type: 'MAX_DEPTH_REACHED' };
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    // CRITICAL FIX: Check for Window object first to prevent cross-origin errors
    try {
      if (value === window || value?.window === window || value?.self === window || 
          (typeof Window !== 'undefined' && value instanceof Window) ||
          value?.constructor?.name === 'Window') {
        return { __type: 'WINDOW_OBJECT' };
      }
    } catch (e) {
      // If we get a cross-origin error just checking, treat it as a Window
      return { __type: 'WINDOW_OBJECT' };
    }

    // Handle DOM elements and nodes
    if (value instanceof Element || value instanceof Node || value instanceof EventTarget) {
      try {
        return {
          __type: 'DOM_ELEMENT',
          tagName: (value as any).nodeName || 'Unknown',
          id: (value as any).id || null,
          className: (value as any).className || null
        };
      } catch (e) {
        // Cross-origin access error
        return { __type: 'DOM_ELEMENT', error: 'Cross-origin access denied' };
      }
    }

    // Handle functions
    if (typeof value === 'function') {
      return { __type: 'FUNCTION', name: value.name || 'anonymous' };
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.slice(0, 5).map(item => this.sanitizeValue(item, depth + 1));
    }

    // Handle objects
    if (typeof value === 'object') {
      // Check for React fiber or other problematic objects
      if (value.constructor && (
        value.constructor.name.includes('Fiber') ||
        value.constructor.name.includes('React') ||
        value.constructor.name === 'yL' ||
        value.constructor.name === 'HTMLElement' ||
        value.constructor.name.startsWith('HTML')
      )) {
        return { __type: 'REACT_OBJECT', constructor: value.constructor.name };
      }

      // Check for circular references by looking for common circular properties
      const circularProps = ['return', 'child', 'sibling', 'stateNode', 'alternate', '_owner'];
      if (circularProps.some(prop => prop in value)) {
        return { __type: 'CIRCULAR_OBJECT' };
      }

      const safeObject: any = {};
      let propertyCount = 0;
      
      for (const [objKey, objValue] of Object.entries(value)) {
        // Limit number of properties to prevent large objects
        if (propertyCount >= 10) {
          safeObject.__truncated = true;
          break;
        }

        // Skip React fiber properties and other problematic keys including Window refs
        if (objKey.startsWith('__react') || 
            objKey.startsWith('_react') || 
            objKey.includes('Fiber') ||
            objKey === 'stateNode' ||
            objKey === 'return' ||
            objKey === 'child' ||
            objKey === 'sibling' ||
            objKey === 'alternate' ||
            objKey === '_owner' ||
            objKey === 'ref' ||
            objKey === 'window' ||
            objKey === 'self' ||
            objKey === 'top' ||
            objKey === 'parent' ||
            objKey === 'frames' ||
            objKey === 'defaultView' ||
            objKey === 'view' ||
            objKey === 'ownerDocument') {
          continue;
        }

        try {
          safeObject[objKey] = this.sanitizeValue(objValue, depth + 1);
          propertyCount++;
        } catch (error) {
          // Don't record cross-origin errors
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (!errorMsg.includes('cross-origin') && !errorMsg.includes('toJSON')) {
            safeObject[objKey] = { __type: 'PROPERTY_ERROR' };
          }
        }
      }
      
      return safeObject;
    }

    // For unknown types, just record the type
    return { __type: typeof value };
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (stack.includes('react') || message.includes('render')) {
      return 'rendering';
    }
    if (message.includes('performance') || message.includes('memory')) {
      return 'performance';
    }
    
    return 'unknown';
  }

  private persistErrors() {
    try {
      const recentErrors = this.errors.slice(-20); // Store only 20 most recent
      const sanitizedErrors = this.sanitizeForSerialization(recentErrors);
      localStorage.setItem('trades_app_errors', JSON.stringify(sanitizedErrors));
    } catch (error) {
      console.warn('Failed to persist errors to localStorage:', error);
    }
  }

  // Sanitize data to prevent circular reference errors during JSON.stringify
  private sanitizeForSerialization(data: any): any {
    const seen = new WeakSet();
    
    const sanitize = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      // CRITICAL: Check for Window object first to prevent cross-origin errors
      try {
        if (obj === window || obj?.window === window || obj?.self === window ||
            (typeof Window !== 'undefined' && obj instanceof Window)) {
          return { __type: 'WINDOW_OBJECT' };
        }
      } catch (e) {
        // Cross-origin error - treat as Window
        return { __type: 'WINDOW_OBJECT' };
      }

      // Handle DOM elements
      try {
        if (obj instanceof Element || obj instanceof Node) {
          return {
            __type: 'DOM_ELEMENT',
            tagName: obj.nodeName || 'Unknown',
            id: (obj as any).id || null,
            className: (obj as any).className || null
          };
        }
      } catch (e) {
        // Cross-origin error
        return { __type: 'DOM_ELEMENT', error: 'Cross-origin' };
      }

      // Handle circular references
      if (seen.has(obj)) {
        return { __type: 'CIRCULAR_REFERENCE' };
      }
      seen.add(obj);

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item));
      }

      // Handle objects
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip React fiber properties and other problematic keys including Window refs
        if (key.startsWith('__react') || 
            key.startsWith('_react') || 
            key.includes('Fiber') ||
            key === 'stateNode' ||
            key === 'return' ||
            key === 'child' ||
            key === 'sibling' ||
            key === 'window' ||
            key === 'self' ||
            key === 'top' ||
            key === 'parent' ||
            key === 'frames' ||
            key === 'defaultView' ||
            key === 'view' ||
            key === 'ownerDocument') {
          continue;
        }

        try {
          sanitized[key] = sanitize(value);
        } catch (error) {
          // Don't record cross-origin errors
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (!errorMsg.includes('cross-origin') && !errorMsg.includes('toJSON')) {
            sanitized[key] = { __type: 'SERIALIZATION_ERROR', error: errorMsg };
          }
        }
      }

      return sanitized;
    };

    return sanitize(data);
  }

  private reportError(errorReport: ErrorReport) {
    if (!this.reportEndpoint) return;

    try {
      // Sanitize the error report before sending
      const sanitizedReport = this.sanitizeForSerialization(errorReport);
      
      // Send to external error reporting service
      fetch(this.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedReport)
      }).catch(() => {
        // Silently fail - we don't want error reporting to cause more errors
      });
    } catch (serializationError) {
      // If even sanitization fails, send minimal error report
      fetch(this.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: errorReport.id,
          message: errorReport.message,
          severity: errorReport.severity,
          category: errorReport.category,
          timestamp: errorReport.context.timestamp,
          serializationError: serializationError.message
        })
      }).catch(() => {
        // Final fallback - silently fail
      });
    }
  }

  // Get error summary for debugging
  getErrorSummary(): {
    totalErrors: number;
    recentErrors: ErrorReport[];
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  } {
    const recentErrors = this.errors.slice(-10);
    
    const errorsByCategory = this.errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errors.length,
      recentErrors,
      errorsByCategory,
      errorsBySeverity
    };
  }

  // Clear all errors
  clearErrors() {
    this.errors = [];
    localStorage.removeItem('trades_app_errors');
  }

  // Load persisted errors on startup
  loadPersistedErrors() {
    try {
      const stored = localStorage.getItem('trades_app_errors');
      if (stored) {
        const errors = JSON.parse(stored);
        if (Array.isArray(errors)) {
          this.errors = errors.filter((error: any) => {
            // Validate error structure and only load errors from last 24 hours
            return error && 
                   error.context && 
                   error.context.timestamp &&
                   typeof error.context.timestamp === 'number' &&
                   Date.now() - error.context.timestamp < 24 * 60 * 60 * 1000;
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted errors:', error);
      // Clear corrupted data
      localStorage.removeItem('trades_app_errors');
    }
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Enhanced error boundary hook
export const useErrorBoundary = () => {
  const captureError = (error: Error, context?: Partial<ErrorContext>) => {
    return errorTracker.captureError(error, context, 'high');
  };

  return { captureError };
};

// Network error handler
export const handleNetworkError = (error: Error, context?: Partial<ErrorContext>) => {
  return errorTracker.captureError(error, {
    ...context,
    action: 'network_request'
  }, 'medium');
};

// Form validation error handler
export const handleValidationError = (error: Error, context?: Partial<ErrorContext>) => {
  return errorTracker.captureError(error, {
    ...context,
    action: 'form_validation'
  }, 'low');
};

// Performance error handler
export const handlePerformanceError = (error: Error, context?: Partial<ErrorContext>) => {
  return errorTracker.captureError(error, {
    ...context,
    action: 'performance_issue'
  }, 'medium');
};

// Initialize error tracking
export const initializeErrorTracking = () => {
  errorTracker.loadPersistedErrors();
  
  // Report app initialization
  console.log('🛡️ Error tracking initialized');
  
  // Expose error tracker to window for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    (window as any).errorTracker = errorTracker;
    console.log('💡 Error tracker available at window.errorTracker');
  }
};