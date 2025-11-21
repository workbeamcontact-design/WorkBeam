"use client";

import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      closeButton={true}
      expand={false}
      richColors={false}
      visibleToasts={1}
      duration={3000}
      swipeable={true}
      dismissible={true}
      style={{
        '--normal-bg': '#ffffff',
        '--normal-text': '#111827',
        '--normal-border': '#E5E7EB',
        '--success-bg': '#16A34A',
        '--success-text': '#ffffff',
        '--error-bg': '#DC2626',
        '--error-text': '#ffffff',
        '--warning-bg': '#F59E0B',
        '--warning-text': '#ffffff',
        '--info-bg': '#0A84FF',
        '--info-text': '#ffffff',
        '--loading-bg': '#0A84FF',
        '--loading-text': '#ffffff',
      } as React.CSSProperties}
      toastOptions={{
        unstyled: false,
        style: {
          fontSize: '14px',
          fontWeight: '500',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          border: 'none',
        },
        classNames: {
          toast: 'group toast',
          description: 'group-[.toast]:text-sm group-[.toast]:opacity-90',
          actionButton: 'group-[.toast]:bg-white group-[.toast]:text-gray-900 group-[.toast]:font-medium',
          cancelButton: 'group-[.toast]:bg-white/20 group-[.toast]:text-white',
          closeButton: 'group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:border-0 group-[.toast]:hover:bg-white/30',
          success: 'group-[.toast]:!bg-green-600 group-[.toast]:!text-white',
          error: 'group-[.toast]:!bg-red-600 group-[.toast]:!text-white',
          warning: 'group-[.toast]:!bg-orange-500 group-[.toast]:!text-white',
          info: 'group-[.toast]:!bg-blue-600 group-[.toast]:!text-white',
          loading: 'group-[.toast]:!bg-blue-600 group-[.toast]:!text-white',
        },
        // Add aria attributes to handle accessibility warnings
        ariaProps: {
          role: 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
          'aria-describedby': undefined
        }
      }}
      {...props}
    />
  );
};

export { Toaster };