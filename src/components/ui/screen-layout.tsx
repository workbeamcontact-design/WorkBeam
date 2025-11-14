import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from './button';

interface ScreenLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  showNavSpacing?: boolean;
  className?: string;
}

export function ScreenLayout({ 
  children, 
  title, 
  subtitle, 
  onBack, 
  headerAction,
  footer,
  showNavSpacing = true,
  className = ""
}: ScreenLayoutProps) {

  return (
    <div className="flex flex-col h-full bg-surface-alt overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 bg-surface border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-11 h-11 flex items-center justify-center hover:bg-surface-alt rounded-lg transition-colors min-h-[44px]"
            >
              <ArrowLeft size={20} className="text-muted" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="trades-h1 text-ink whitespace-nowrap">{title}</h1>
            {subtitle && (
              <p className="trades-caption text-muted">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      </div>

      {/* Content */}
      <div 
        className={`flex-1 overflow-y-auto ${className}`}
        style={{ 
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: footer 
            ? (showNavSpacing ? '176px' : '96px') // 64px (nav) + 112px (footer+padding) OR just 96px footer
            : (showNavSpacing ? '80px' : '0px')  // Just nav spacing OR nothing
        }}
      >
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="fixed bottom-16 left-0 right-0 px-4 py-4 bg-surface-alt z-10 pointer-events-none max-w-sm mx-auto md:max-w-[390px]">
          <div className="pointer-events-auto">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

interface SaveFooterProps {
  onSave: () => void;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  saveText?: string;
}

export function SaveFooter({ 
  onSave, 
  saving = false, 
  hasUnsavedChanges = false,
  saveText = "Save Changes"
}: SaveFooterProps) {
  return (
    <div className="space-y-3">
      {hasUnsavedChanges && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-warning/10 text-warning rounded-full">
            <div className="w-2 h-2 bg-warning rounded-full" />
            <span className="trades-caption">Unsaved changes</span>
          </div>
        </div>
      )}
      
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-xl trades-body font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        style={{
          height: '56px',
          minHeight: '44px'
        }}
      >
        {saving ? (
          <>
            <div className="w-5 h-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
            Saving...
          </>
        ) : (
          <>
            <Check size={18} />
            {saveText}
          </>
        )}
      </button>
    </div>
  );
}