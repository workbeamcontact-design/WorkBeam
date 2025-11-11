import React from 'react';

interface InvoiceLineItem {
  description: string;
  qty: number;
  price: number;
  type?: 'materials' | 'labour';
}

interface InvoiceData {
  // Business Details
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  vatNumber?: string;
  companyNumber?: string;
  
  // Invoice Details
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  
  // Client Details
  clientName: string;
  clientAddress: string;
  
  // Job Details
  jobTitle: string;
  jobAddress?: string;
  
  // Financial Details
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatEnabled: boolean;
  
  // Terms
  paymentTerms?: string;
  notes?: string;
}

interface BankDetails {
  account_holder_name?: string;
  bank_name?: string;
  sort_code?: string;
  account_number?: string;
  iban?: string;
}

interface ProfessionalInvoiceTemplateProps {
  data: InvoiceData;
  className?: string;
  bankDetails?: BankDetails;
}

export function ProfessionalInvoiceTemplate({ data, className = "", bankDetails }: ProfessionalInvoiceTemplateProps) {
  const formatDate = (dateString: string) => {
    try {
      const [day, month, year] = dateString.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className={`bg-white max-w-4xl mx-auto shadow-lg ${className}`} style={{ minHeight: '842px', aspectRatio: '210/297' }}>
      {/* A4 Invoice Container */}
      <div className="p-12" style={{ fontSize: '14px', lineHeight: '1.4' }}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          {/* Business Details */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{data.businessName}</h1>
            <div className="text-gray-600 space-y-1">
              <p>{data.businessAddress}</p>
              <p>Tel: {data.businessPhone}</p>
              <p>Email: {data.businessEmail}</p>
              {data.businessWebsite && <p>Web: {data.businessWebsite}</p>}
            </div>
            {data.vatNumber && (
              <div className="mt-4 text-sm text-gray-500">
                <p>VAT Registration No: {data.vatNumber}</p>
                {data.companyNumber && <p>Company Registration No: {data.companyNumber}</p>}
              </div>
            )}
          </div>
          
          {/* Invoice Title */}
          <div className="text-right">
            <h2 className="text-4xl font-bold text-blue-600 mb-2">INVOICE</h2>
            <div className="text-right text-gray-600">
              <p className="text-lg font-semibold">{data.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* Invoice and Client Details */}
        <div className="grid grid-cols-2 gap-12 mb-12">
          {/* Invoice To */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">INVOICE TO:</h3>
            <div className="text-gray-700">
              <p className="font-semibold">{data.clientName}</p>
              <div className="mt-2 whitespace-pre-line">{data.clientAddress}</div>
            </div>
          </div>
          
          {/* Invoice Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">INVOICE DETAILS:</h3>
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium">Invoice Date:</span>
                <span>{formatDate(data.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Due Date:</span>
                <span>{formatDate(data.dueDate)}</span>
              </div>
              {data.jobTitle && (
                <div className="flex justify-between">
                  <span className="font-medium">Project:</span>
                  <span>{data.jobTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Job Address (if different) */}
        {data.jobAddress && data.jobAddress !== data.clientAddress && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">WORK ADDRESS:</h3>
            <p className="text-gray-700">{data.jobAddress}</p>
          </div>
        )}

        {/* Line Items Table */}
        <div className="mb-12">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-3 font-semibold">DESCRIPTION</th>
                <th className="text-center py-3 font-semibold w-16">QTY</th>
                <th className="text-right py-3 font-semibold w-24">UNIT PRICE</th>
                <th className="text-right py-3 font-semibold w-24">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      {item.type && (
                        <p className="text-sm text-gray-500 capitalize">({item.type})</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-center">{item.qty}</td>
                  <td className="py-3 text-right">£{item.price.toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">£{(item.qty * item.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-12">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2">
                <span className="font-medium">Subtotal:</span>
                <span>£{data.subtotal.toFixed(2)}</span>
              </div>
              
              {data.vatEnabled && (
                <div className="flex justify-between py-2">
                  <span className="font-medium">VAT (20%):</span>
                  <span>£{data.vatAmount.toFixed(2)}</span>
                </div>
              )}
              
              <hr className="border-gray-400" />
              
              <div className="flex justify-between py-3 text-xl font-bold bg-blue-50 px-4 rounded">
                <span>TOTAL DUE:</span>
                <span className="text-blue-600">£{data.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">PAYMENT INFORMATION:</h3>
            <div className="text-gray-700 space-y-1">
              {bankDetails && (bankDetails.account_holder_name || bankDetails.bank_name || bankDetails.sort_code || bankDetails.account_number) ? (
                <>
                  {bankDetails.account_holder_name && (
                    <p><strong>Account Name:</strong> {bankDetails.account_holder_name}</p>
                  )}
                  {bankDetails.bank_name && (
                    <p><strong>Bank:</strong> {bankDetails.bank_name}</p>
                  )}
                  {bankDetails.sort_code && (
                    <p><strong>Sort Code:</strong> {bankDetails.sort_code}</p>
                  )}
                  {bankDetails.account_number && (
                    <p><strong>Account Number:</strong> {bankDetails.account_number}</p>
                  )}
                  {bankDetails.iban && (
                    <p><strong>IBAN:</strong> {bankDetails.iban}</p>
                  )}
                  <p><strong>Reference:</strong> {data.invoiceNumber}</p>
                </>
              ) : (
                <>
                  <p><strong>Account Name:</strong> {data.businessName}</p>
                  <p><strong>Sort Code:</strong> Please contact us</p>
                  <p><strong>Account Number:</strong> Please contact us</p>
                  <p><strong>Reference:</strong> {data.invoiceNumber}</p>
                </>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">PAYMENT TERMS:</h3>
            <div className="text-gray-700">
              <p>{data.paymentTerms || 'Payment due within 30 days of invoice date'}</p>
              <p className="mt-2 text-sm">Late payment charges may apply after due date.</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">NOTES:</h3>
            <p className="text-gray-700 whitespace-pre-line">{data.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-6 text-center text-sm text-gray-500">
          <p className="mb-2">Thank you for your business!</p>
          <p>If you have any questions about this invoice, please contact us at {data.businessPhone} or {data.businessEmail}</p>
        </div>
      </div>
    </div>
  );
}