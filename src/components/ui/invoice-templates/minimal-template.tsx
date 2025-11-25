import React from 'react';
import { BaseInvoiceTemplate, BaseTemplateProps, TEMPLATE_PAGINATION_CONFIGS } from './components/base-invoice-template';

interface MinimalTemplateProps extends Omit<BaseTemplateProps, 'style'> {}

export function MinimalTemplate(props: MinimalTemplateProps) {
  return (
    <BaseInvoiceTemplate
      {...props}
      style="minimal"
      paginationConfig={TEMPLATE_PAGINATION_CONFIGS.minimal}
      className="minimal-template"
    />
  );
}