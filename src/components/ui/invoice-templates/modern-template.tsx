import React from 'react';
import { BaseInvoiceTemplate, BaseTemplateProps, TEMPLATE_PAGINATION_CONFIGS } from './components/base-invoice-template';

interface ModernTemplateProps extends Omit<BaseTemplateProps, 'style'> {}

export function ModernTemplate(props: ModernTemplateProps) {
  return (
    <BaseInvoiceTemplate
      {...props}
      style="modern"
      paginationConfig={TEMPLATE_PAGINATION_CONFIGS.modern}
      className="modern-template"
    />
  );
}