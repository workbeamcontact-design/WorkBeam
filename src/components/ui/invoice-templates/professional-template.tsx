import React from 'react';
import { BaseInvoiceTemplate, BaseTemplateProps, TEMPLATE_PAGINATION_CONFIGS } from './components/base-invoice-template';

interface ProfessionalTemplateProps extends Omit<BaseTemplateProps, 'style'> {}

export function ProfessionalTemplate(props: ProfessionalTemplateProps) {
  return (
    <BaseInvoiceTemplate
      {...props}
      style="professional"
      paginationConfig={TEMPLATE_PAGINATION_CONFIGS.professional}
      className="professional-template"
    />
  );
}