import React from 'react';
import { BaseInvoiceTemplate, BaseTemplateProps, TEMPLATE_PAGINATION_CONFIGS } from './components/base-invoice-template';

interface CorporateTemplateProps extends Omit<BaseTemplateProps, 'style'> {}

export function CorporateTemplate(props: CorporateTemplateProps) {
  return (
    <BaseInvoiceTemplate
      {...props}
      style="corporate"
      paginationConfig={TEMPLATE_PAGINATION_CONFIGS.corporate}
      className="corporate-template"
    />
  );
}