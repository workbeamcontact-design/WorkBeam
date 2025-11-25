import React from 'react';
import { BaseInvoiceTemplate, BaseTemplateProps, TEMPLATE_PAGINATION_CONFIGS } from './components/base-invoice-template';

interface ClassicTemplateProps extends Omit<BaseTemplateProps, 'style'> {}

export function ClassicTemplate(props: ClassicTemplateProps) {
  return (
    <BaseInvoiceTemplate
      {...props}
      style="classic"
      paginationConfig={TEMPLATE_PAGINATION_CONFIGS.classic}
      className="classic-template"
    />
  );
}