import React from 'react';

interface QuoteStatusBadgeProps {
  status: string;
  className?: string;
}

export function QuoteStatusBadge({ status, className = "" }: QuoteStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          text: 'Draft',
          bg: '#F3F4F6',
          color: '#6B7280',
          border: '#E5E7EB'
        };
      case 'sent':
        return {
          text: 'Sent',
          bg: '#FEF3C7',
          color: '#D97706',
          border: '#FCD34D'
        };
      case 'pending':
        return {
          text: 'Pending',
          bg: '#DBEAFE',
          color: '#2563EB',
          border: '#93C5FD'
        };
      case 'approved':
        return {
          text: 'Approved',
          bg: '#D1FAE5',
          color: '#059669',
          border: '#6EE7B7'
        };
      case 'declined':
      case 'rejected':
        return {
          text: 'Rejected',
          bg: '#FEE2E2',
          color: '#DC2626',
          border: '#FECACA'
        };
      case 'converted':
        return {
          text: 'Converted',
          bg: '#E0E7FF',
          color: '#5B21B6',
          border: '#C7D2FE'
        };
      case 'expired':
        return {
          text: 'Expired',
          bg: '#F3F4F6',
          color: '#6B7280',
          border: '#E5E7EB'
        };
      default:
        return {
          text: status,
          bg: '#F3F4F6',
          color: '#6B7280',
          border: '#E5E7EB'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg trades-caption font-medium ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`
      }}
    >
      {config.text}
    </span>
  );
}