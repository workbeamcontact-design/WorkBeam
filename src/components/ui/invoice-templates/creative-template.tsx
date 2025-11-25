import React from 'react';
import { BaseInvoiceTemplate, BaseTemplateProps, TEMPLATE_PAGINATION_CONFIGS } from './components/base-invoice-template';

interface CreativeTemplateProps extends Omit<BaseTemplateProps, 'style'> {}

export function CreativeTemplate(props: CreativeTemplateProps) {
  return (
    <BaseInvoiceTemplate
      {...props}
      style="creative"
      paginationConfig={TEMPLATE_PAGINATION_CONFIGS.creative}
      className="creative-template"
    />
  );
}