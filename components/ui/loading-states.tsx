import React from 'react';
import { Skeleton } from './skeleton';

/**
 * Consistent loading components for the entire app
 * Provides skeleton screens and loading indicators
 */

// Full screen loading overlay
export const FullScreenLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
    <p className="trades-body text-gray-600">{message}</p>
  </div>
);

// Inline loader (for buttons, cards, etc.)
export const InlineLoader: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2'
  };

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-primary border-t-transparent`} />
  );
};

// List skeleton loader
export const ListSkeleton: React.FC<{ count?: number; height?: number }> = ({ 
  count = 5, 
  height = 80 
}) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="w-full" style={{ height: `${height}px` }} />
    ))}
  </div>
);

// Card skeleton loader
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl p-4 space-y-3">
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="p-4 space-y-4">
    {/* Stats cards */}
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>

    {/* Recent activity */}
    <div className="space-y-3 mt-6">
      <Skeleton className="h-6 w-1/3" />
      <ListSkeleton count={3} height={60} />
    </div>
  </div>
);

// Client list skeleton
export const ClientListSkeleton: React.FC = () => (
  <div className="p-4 space-y-3">
    <Skeleton className="h-10 w-full rounded-lg" /> {/* Search bar */}
    <div className="space-y-2 mt-4">
      <ListSkeleton count={6} height={72} />
    </div>
  </div>
);

// Form skeleton
export const FormSkeleton: React.FC = () => (
  <div className="p-4 space-y-4">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" /> {/* Label */}
        <Skeleton className="h-12 w-full rounded-lg" /> {/* Input */}
      </div>
    ))}
    <Skeleton className="h-12 w-full rounded-xl mt-6" /> {/* Submit button */}
  </div>
);

// Invoice skeleton
export const InvoiceSkeleton: React.FC = () => (
  <div className="p-4 space-y-4">
    {/* Header */}
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>

    {/* Details */}
    <div className="space-y-3 mt-6">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>

    {/* Line items */}
    <div className="mt-6">
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>

    {/* Total */}
    <div className="flex justify-end mt-6">
      <Skeleton className="h-8 w-32" />
    </div>
  </div>
);

// Calendar skeleton
export const CalendarSkeleton: React.FC = () => (
  <div className="p-4 space-y-4">
    {/* Week header */}
    <Skeleton className="h-12 w-full rounded-lg" />
    
    {/* Time slots */}
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="flex gap-2">
          <Skeleton className="h-16 w-12" /> {/* Time */}
          <Skeleton className="h-16 flex-1 rounded-lg" /> {/* Event */}
        </div>
      ))}
    </div>
  </div>
);

// Empty state (not loading, but no data)
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center">
    {icon && <div className="mb-4 text-gray-400">{icon}</div>}
    <h3 className="trades-h2 text-gray-900 mb-2">{title}</h3>
    {description && (
      <p className="trades-body text-gray-600 mb-6 max-w-md">{description}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl trades-body hover:bg-primary/90 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

// Suspense fallback wrapper
export const SuspenseFallback: React.FC<{ type?: 'dashboard' | 'list' | 'form' | 'full' }> = ({ 
  type = 'full' 
}) => {
  const fallbacks = {
    dashboard: <DashboardSkeleton />,
    list: <ClientListSkeleton />,
    form: <FormSkeleton />,
    full: <FullScreenLoader />
  };

  return fallbacks[type];
};

/**
 * Loading wrapper component - shows loading state while children are loading
 */
export const LoadingWrapper: React.FC<{
  isLoading: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  type?: 'dashboard' | 'list' | 'form' | 'full';
}> = ({ isLoading, fallback, children, type = 'full' }) => {
  if (isLoading) {
    return <>{fallback || <SuspenseFallback type={type} />}</>;
  }

  return <>{children}</>;
};