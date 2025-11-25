import React, { Component, ReactNode } from 'react';
import { errorTracker } from '../../utils/error-tracking';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Enhanced Error Boundary with comprehensive error tracking
 * Provides better error recovery and user experience
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Capture error with safe context (avoid circular references)
      const errorId = errorTracker.captureError(error, {
        action: 'component_error',
        additionalData: {
          // Only include safe, primitive data
          componentStackLength: errorInfo.componentStack?.length || 0,
          errorBoundary: true,
          retryCount: this.state.retryCount,
          errorMessage: error.message,
          errorName: error.name
          // Don't include full componentStack as it may contain circular references
        }
      }, 'high');

      this.setState({ errorId });

      // Call custom error handler if provided
      this.props.onError?.(error, errorInfo);

      // Auto-retry for certain types of errors (max 2 retries)
      if (this.state.retryCount < 2 && this.isRetryableError(error)) {
        this.resetTimeoutId = window.setTimeout(() => {
          this.handleRetry();
        }, 2000);
      }
    } catch (captureError) {
      // If error capture fails, just log and continue
      console.error('Error boundary failed to capture error:', captureError);
      this.setState({ 
        errorId: `fallback-${Date.now()}`,
        error 
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && (resetOnPropsChange || resetKeys)) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      } else if (resetKeys) {
        const prevResetKeys = prevProps.resetKeys || [];
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevResetKeys[index]
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryablePatterns = [
      /loading/i,
      /network/i,
      /timeout/i,
      /chunk/i // Dynamic import errors
    ];

    return retryablePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.stack || '')
    );
  }

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    });
  };

  private handleGoHome = () => {
    this.resetErrorBoundary();
    // Navigate to dashboard using global navigation
    if ((window as any).appNavigate) {
      (window as any).appNavigate('dashboard');
    } else {
      window.location.href = '/';
    }
  };

  private handleReportProblem = () => {
    const { error, errorId } = this.state;
    if (!error || !errorId) return;

    // Create a simple error report
    const report = {
      errorId,
      message: error.message,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Copy to clipboard for user to send
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please send this to support.');
    }).catch(() => {
      // Fallback: show in alert
      alert(`Error ID: ${errorId}\nPlease provide this ID to support.`);
    });
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Determine error severity and appropriate message
      const isRetryableError = error ? this.isRetryableError(error) : false;
      const maxRetriesReached = retryCount >= 2;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gray-50 text-center">
          <div className="max-w-md w-full">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <h2 className="trades-h2 text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            <p className="trades-body text-gray-600 mb-6">
              {isRetryableError && !maxRetriesReached
                ? 'We encountered a temporary issue. Retrying automatically...'
                : 'We encountered an unexpected error. Please try one of the options below.'
              }
            </p>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
                  {error.message}
                  {error.stack && '\n\n' + error.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Retry Button (for retryable errors) */}
              {isRetryableError && !maxRetriesReached && (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors"
                >
                  Try Again {retryCount > 0 && `(${retryCount}/2)`}
                </button>
              )}

              {/* Go Home Button */}
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-xl trades-body hover:bg-gray-700 transition-colors"
              >
                Go to Dashboard
              </button>

              {/* Report Problem Button */}
              <button
                onClick={this.handleReportProblem}
                className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-xl trades-body hover:bg-gray-50 transition-colors"
              >
                Report Problem
              </button>
            </div>

            {/* Helpful Tips */}
            <div className="mt-6 text-sm text-gray-500">
              <p>Try refreshing the page or clearing your browser cache if the problem persists.</p>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// HOC wrapper for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};