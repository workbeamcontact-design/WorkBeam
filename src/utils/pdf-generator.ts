/**
 * PDF Generation utility for quotes and invoices
 * Generates downloadable PDFs and handles WhatsApp sharing
 */

interface LineItem {
  description: string;
  qty: number;
  price: number;
  total: number;
}

interface QuoteData {
  id: string;
  number: string;
  title: string;
  createdAt: string;
  validUntil?: string;
  lineItems: LineItem[];
  subtotal: number;
  vatAmount?: number;
  total: number;
  notes?: string;
  status: string;
}

interface InvoiceData {
  id: string;
  number: string;
  client: string;
  job: string;
  issueDate: string;
  dueDate: string;
  lineItems?: LineItem[];
  subtotal: number;
  vatAmount?: number;
  vatRate?: number;
  vatEnabled?: boolean;
  cisAmount?: number;
  cisRate?: number;
  cisEnabled?: boolean;
  total: number;
  notes?: string;
  status: string;
}

interface VariationData {
  id: string;
  job: any;
  description: string;
  amount: number;
  timeEstimate?: number;
  photos?: string[];
  dateCreated: string;
}

interface ClientData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface CompanyData {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  vatNumber?: string;
  companyNumber?: string;
}

import { api } from "./api";

// Default company data - fallback when no business details are saved
const DEFAULT_COMPANY: CompanyData = {
  name: "Northern Windows Ltd",
  address: "123 Trade Street, Manchester, M1 1AA",
  phone: "0161 123 4567",
  email: "info@northernwindows.co.uk",
  website: "www.northernwindows.co.uk",
  vatNumber: "GB123456789",
  companyNumber: "12345678"
};

/**
 * Gets the current business details from storage, with fallback to defaults
 */
async function getBusinessDetails(): Promise<CompanyData> {
  try {
    const businessDetails = await api.getBusinessDetails();
    if (businessDetails) {
      // Map new structure to legacy CompanyData format
      const displayName = businessDetails.companyName || DEFAULT_COMPANY.name;
      
      // Get display address
      let displayAddress = DEFAULT_COMPANY.address;
      if (businessDetails.registeredAddress) {
        const address = businessDetails.tradingAddressDifferent 
          ? businessDetails.tradingAddress 
          : businessDetails.registeredAddress;
          
        if (address) {
          const parts = [
            address.line1,
            address.line2,
            address.city,
            address.postcode,
            address.country !== 'United Kingdom' ? address.country : ''
          ].filter(Boolean);
          
          displayAddress = parts.join(', ');
        }
      }
      
      // Format phone number
      let displayPhone = DEFAULT_COMPANY.phone;
      if (businessDetails.phoneCountryCode && businessDetails.phoneNumber) {
        displayPhone = `${businessDetails.phoneCountryCode} ${businessDetails.phoneNumber}`;
      }
      
      return {
        name: displayName,
        address: displayAddress,
        phone: displayPhone,
        email: businessDetails.email || DEFAULT_COMPANY.email,
        website: businessDetails.website || DEFAULT_COMPANY.website,
        vatNumber: businessDetails.vatNumber || DEFAULT_COMPANY.vatNumber,
        companyNumber: businessDetails.companyNumber || DEFAULT_COMPANY.companyNumber,
      };
    }
  } catch (error) {
    console.warn('Failed to load business details, using defaults:', error);
  }
  return DEFAULT_COMPANY;
}

/**
 * Gets the current bank details from storage
 */
async function getBankDetails() {
  try {
    const bankDetails = await api.getBankDetails();
    return bankDetails;
  } catch (error) {
    console.warn('Failed to load bank details:', error);
    return null;
  }
}

/**
 * Creates a canvas-based PDF document
 */
class PDFGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly pageWidth = 595; // A4 width in points
  private readonly pageHeight = 842; // A4 height in points
  private readonly margin = 40;
  private currentY = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pageWidth;
    this.canvas.height = this.pageHeight;
    this.ctx = this.canvas.getContext('2d')!;
    this.currentY = this.margin;
    
    // Set up canvas for high DPI
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = this.pageWidth * devicePixelRatio;
    this.canvas.height = this.pageHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Set white background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.pageWidth, this.pageHeight);
  }

  private setFont(size: number, weight: 'normal' | 'bold' = 'normal') {
    this.ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  }

  private drawText(text: string, x: number, y: number, color: string = '#111827', maxWidth?: number) {
    this.ctx.fillStyle = color;
    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, color: string = '#E5E7EB', width: number = 1) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  private drawRect(x: number, y: number, width: number, height: number, fillColor?: string, strokeColor?: string) {
    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fillRect(x, y, width, height);
    }
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }

  private formatDate(dateString: string): string {
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  }

  generateQuotePDF(quote: QuoteData, client: ClientData, company: CompanyData = DEFAULT_COMPANY): string {
    this.currentY = this.margin;

    // Ensure client name is not undefined or empty
    const clientName = client?.name || 'Unknown Client';
    const clientAddress = client?.address || '';
    const clientPhone = client?.phone || '';

    // Header
    this.setFont(24, 'bold');
    this.drawText('QUOTATION', this.margin, this.currentY);
    
    this.setFont(14);
    this.drawText(company.name, this.pageWidth - this.margin - 150, this.currentY, '#111827');
    this.currentY += 30;

    // Quote number and date
    this.setFont(16);
    this.drawText(quote.number || 'DRAFT', this.margin, this.currentY);
    
    this.setFont(12);
    const companyLines = [
      company.address,
      company.phone,
      ...(company.email ? [company.email] : []),
      ...(company.website ? [company.website] : [])
    ];
    
    let companyY = this.currentY;
    companyLines.forEach(line => {
      this.drawText(line, this.pageWidth - this.margin - 150, companyY, '#6B7280');
      companyY += 18;
    });

    this.currentY += 50;

    // Client details
    this.setFont(14, 'bold');
    this.drawText('Quote For:', this.margin, this.currentY);
    this.currentY += 25;

    this.setFont(12);
    this.drawText(clientName, this.margin, this.currentY);
    this.currentY += 18;
    
    if (clientAddress) {
      this.drawText(clientAddress, this.margin, this.currentY, '#6B7280');
      this.currentY += 18;
    }
    
    if (clientPhone) {
      this.drawText(clientPhone, this.margin, this.currentY, '#6B7280');
      this.currentY += 18;
    }

    this.currentY += 30;

    // Quote details
    this.setFont(12);
    this.drawText(`Date: ${this.formatDate(quote.createdAt)}`, this.margin, this.currentY);
    if (quote.validUntil) {
      this.drawText(`Valid Until: ${this.formatDate(quote.validUntil)}`, this.margin + 200, this.currentY);
    }
    this.currentY += 40;

    // Line items table
    this.setFont(12, 'bold');
    this.drawText('Description', this.margin, this.currentY);
    this.drawText('Qty', this.pageWidth - 200, this.currentY);
    this.drawText('Price', this.pageWidth - 150, this.currentY);
    this.drawText('Total', this.pageWidth - 80, this.currentY);
    this.currentY += 5;

    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    // Line items
    this.setFont(12);
    quote.lineItems.forEach(item => {
      this.drawText(item.description, this.margin, this.currentY, '#111827', this.pageWidth - 250);
      this.drawText(item.qty.toString(), this.pageWidth - 200, this.currentY);
      this.drawText(this.formatCurrency(item.price), this.pageWidth - 150, this.currentY);
      this.drawText(this.formatCurrency(item.total), this.pageWidth - 80, this.currentY);
      this.currentY += 25;
    });

    this.currentY += 20;
    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    // Totals
    this.setFont(12);
    this.drawText('Subtotal:', this.pageWidth - 150, this.currentY);
    this.drawText(this.formatCurrency(quote.subtotal), this.pageWidth - 80, this.currentY);
    this.currentY += 20;

    if (quote.vatAmount && quote.vatAmount > 0) {
      this.drawText('VAT:', this.pageWidth - 150, this.currentY);
      this.drawText(this.formatCurrency(quote.vatAmount), this.pageWidth - 80, this.currentY);
      this.currentY += 20;
    }

    this.setFont(14, 'bold');
    this.drawText('Total:', this.pageWidth - 150, this.currentY);
    this.drawText(this.formatCurrency(quote.total), this.pageWidth - 80, this.currentY, '#16A34A');
    this.currentY += 40;

    // Notes
    if (quote.notes) {
      this.setFont(12, 'bold');
      this.drawText('Notes:', this.margin, this.currentY);
      this.currentY += 20;
      
      this.setFont(12);
      this.drawText(quote.notes, this.margin, this.currentY, '#6B7280', this.pageWidth - 2 * this.margin);
      this.currentY += 40;
    }

    // Footer
    this.currentY = this.pageHeight - 80;
    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(10);
    const footerText = `${company.name}${company.companyNumber ? ` • Company No: ${company.companyNumber}` : ''}${company.vatNumber ? ` • VAT No: ${company.vatNumber}` : ''}`;
    this.drawText(footerText, this.margin, this.currentY, '#6B7280');

    return this.canvas.toDataURL('image/png', 0.9);
  }

  generateVariationPDF(variation: VariationData, client: ClientData, company: CompanyData = DEFAULT_COMPANY): string {
    this.currentY = this.margin;

    // Ensure client name is not undefined or empty
    const clientName = client?.name || 'Unknown Client';
    const clientAddress = client?.address || '';
    const clientPhone = client?.phone || '';

    // Header
    this.setFont(24, 'bold');
    this.drawText('VARIATION ORDER', this.margin, this.currentY);
    
    this.setFont(14);
    this.drawText(company.name, this.pageWidth - this.margin - 150, this.currentY, '#111827');
    this.currentY += 30;

    // Variation number and date
    this.setFont(16);
    this.drawText(`VAR-${variation.id.substring(0, 8)}`, this.margin, this.currentY);
    
    // Company details
    this.setFont(12);
    const companyLines = [
      company.address,
      company.phone,
      ...(company.email ? [company.email] : []),
      ...(company.website ? [company.website] : [])
    ];
    
    let companyY = this.currentY;
    companyLines.forEach(line => {
      this.drawText(line, this.pageWidth - this.margin - 150, companyY, '#6B7280');
      companyY += 18;
    });

    this.currentY += 50;

    // Client details
    this.setFont(14, 'bold');
    this.drawText('Variation For:', this.margin, this.currentY);
    this.currentY += 25;

    this.setFont(12);
    this.drawText(clientName, this.margin, this.currentY);
    this.currentY += 18;
    
    if (clientAddress) {
      this.drawText(clientAddress, this.margin, this.currentY, '#6B7280');
      this.currentY += 18;
    }
    
    this.drawText(`Job: ${variation.job?.title || 'Project'}`, this.margin, this.currentY, '#6B7280');
    this.currentY += 40;

    // Variation details
    this.setFont(12);
    this.drawText(`Date: ${this.formatDate(variation.dateCreated)}`, this.margin, this.currentY);
    if (variation.timeEstimate) {
      this.drawText(`Time Estimate: ${variation.timeEstimate}h`, this.margin + 200, this.currentY);
    }
    this.currentY += 40;

    // Description section
    this.setFont(12, 'bold');
    this.drawText('Description of Additional Work:', this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(12);
    this.drawText(variation.description, this.margin, this.currentY, '#111827', this.pageWidth - 2 * this.margin);
    this.currentY += 60;

    // Photos section (placeholder)
    if (variation.photos && variation.photos.length > 0) {
      this.setFont(12, 'bold');
      this.drawText('Photos:', this.margin, this.currentY);
      this.currentY += 20;

      this.setFont(12);
      this.drawText(`${variation.photos.length} photo(s) attached`, this.margin, this.currentY, '#6B7280');
      this.currentY += 40;
    }

    // Cost section
    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(14, 'bold');
    this.drawText('Additional Cost:', this.pageWidth - 150, this.currentY);
    this.drawText(this.formatCurrency(variation.amount), this.pageWidth - 80, this.currentY, '#0A84FF');
    this.currentY += 40;

    // Approval section
    this.setFont(12, 'bold');
    this.drawText('Client Approval Required:', this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(12);
    this.drawText('By approving this variation, you agree to the additional cost and time required.', this.margin, this.currentY, '#6B7280', this.pageWidth - 2 * this.margin);
    this.currentY += 30;

    // Signature area
    this.drawLine(this.margin, this.currentY, this.margin + 200, this.currentY);
    this.currentY += 10;
    this.drawText('Client Signature', this.margin, this.currentY, '#6B7280');

    this.drawLine(this.margin + 250, this.currentY - 10, this.margin + 400, this.currentY - 10);
    this.drawText('Date', this.margin + 250, this.currentY, '#6B7280');

    // Footer
    this.currentY = this.pageHeight - 80;
    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(10);
    const footerText = `${company.name}${company.companyNumber ? ` • Company No: ${company.companyNumber}` : ''}${company.vatNumber ? ` • VAT No: ${company.vatNumber}` : ''}`;
    this.drawText(footerText, this.margin, this.currentY, '#6B7280');

    return this.canvas.toDataURL('image/png', 0.9);
  }

  generateInvoicePDF(invoice: InvoiceData, client: ClientData, company: CompanyData = DEFAULT_COMPANY, bankDetails?: any): string {
    this.currentY = this.margin;

    // Ensure client name is not undefined or empty
    const clientName = client?.name || 'Unknown Client';
    const clientAddress = client?.address || '';
    const clientPhone = client?.phone || '';

    // Header
    this.setFont(24, 'bold');
    this.drawText('INVOICE', this.margin, this.currentY);
    
    this.setFont(14);
    this.drawText(company.name, this.pageWidth - this.margin - 150, this.currentY, '#111827');
    this.currentY += 30;

    // Invoice number and status
    this.setFont(16);
    this.drawText(invoice.number || 'DRAFT', this.margin, this.currentY);
    
    if (invoice.status === 'paid') {
      this.setFont(12, 'bold');
      this.drawText('PAID', this.margin + 150, this.currentY, '#16A34A');
    }

    // Company details
    this.setFont(12);
    const companyLines = [
      company.address,
      company.phone,
      ...(company.email ? [company.email] : []),
      ...(company.website ? [company.website] : [])
    ];
    
    let companyY = this.currentY;
    companyLines.forEach(line => {
      this.drawText(line, this.pageWidth - this.margin - 150, companyY, '#6B7280');
      companyY += 18;
    });

    this.currentY += 50;

    // Bill to
    this.setFont(14, 'bold');
    this.drawText('Bill To:', this.margin, this.currentY);
    this.currentY += 25;

    this.setFont(12);
    this.drawText(clientName, this.margin, this.currentY);
    this.currentY += 18;
    
    if (clientAddress) {
      this.drawText(clientAddress, this.margin, this.currentY, '#6B7280');
      this.currentY += 18;
    }
    
    this.drawText(`Job: ${invoice.job}`, this.margin, this.currentY, '#6B7280');
    this.currentY += 40;

    // Dates
    this.setFont(12);
    this.drawText(`Issue Date: ${this.formatDate(invoice.issueDate)}`, this.margin, this.currentY);
    this.drawText(`Due Date: ${this.formatDate(invoice.dueDate)}`, this.margin + 200, this.currentY);
    this.currentY += 40;

    // Line items (simplified - using single line)
    this.setFont(12, 'bold');
    this.drawText('Description', this.margin, this.currentY);
    this.drawText('Amount', this.pageWidth - 80, this.currentY);
    this.currentY += 5;

    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(12);
    this.drawText(`${invoice.job} - Materials and labour`, this.margin, this.currentY, '#111827', this.pageWidth - 150);
    this.drawText(this.formatCurrency(invoice.subtotal), this.pageWidth - 80, this.currentY);
    this.currentY += 40;

    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    // Totals
    this.setFont(12);
    this.drawText('Subtotal:', this.pageWidth - 150, this.currentY);
    this.drawText(this.formatCurrency(invoice.subtotal), this.pageWidth - 80, this.currentY);
    this.currentY += 20;

    if (invoice.vatEnabled && invoice.vatAmount && invoice.vatAmount > 0) {
      this.drawText(`VAT (${invoice.vatRate}%):`, this.pageWidth - 150, this.currentY);
      this.drawText(this.formatCurrency(invoice.vatAmount), this.pageWidth - 80, this.currentY);
      this.currentY += 20;
    }

    if (invoice.cisEnabled && invoice.cisAmount && invoice.cisAmount > 0) {
      this.drawText(`CIS Deduction (${invoice.cisRate}%):`, this.pageWidth - 150, this.currentY);
      this.drawText(`-${this.formatCurrency(invoice.cisAmount)}`, this.pageWidth - 80, this.currentY);
      this.currentY += 20;
    }

    this.drawLine(this.pageWidth - 160, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;

    this.setFont(14, 'bold');
    this.drawText('Total Due:', this.pageWidth - 150, this.currentY);
    this.drawText(this.formatCurrency(invoice.total), this.pageWidth - 80, this.currentY, '#0A84FF');
    this.currentY += 40;

    // Payment details
    this.setFont(12, 'bold');
    this.drawText('Payment Details:', this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(12);
    if (bankDetails && (bankDetails.account_holder_name || bankDetails.bank_name || bankDetails.sort_code || bankDetails.account_number)) {
      // Use actual bank details
      if (bankDetails.account_holder_name) {
        this.drawText(`Account Name: ${bankDetails.account_holder_name}`, this.margin, this.currentY);
        this.currentY += 18;
      }
      if (bankDetails.bank_name) {
        this.drawText(`Bank: ${bankDetails.bank_name}`, this.margin, this.currentY);
        this.currentY += 18;
      }
      if (bankDetails.sort_code && bankDetails.account_number) {
        this.drawText(`Sort Code: ${bankDetails.sort_code}`, this.margin, this.currentY);
        this.drawText(`Account Number: ${bankDetails.account_number}`, this.margin + 200, this.currentY);
        this.currentY += 18;
      }
      if (bankDetails.iban) {
        this.drawText(`IBAN: ${bankDetails.iban}`, this.margin, this.currentY);
        this.currentY += 18;
      }
      this.drawText(`Reference: ${invoice.number}`, this.margin, this.currentY);
      this.currentY += 40;
    } else {
      // Fallback when no bank details configured
      this.drawText('Bank details not configured', this.margin, this.currentY, '#6B7280');
      this.drawText(`Reference: ${invoice.number}`, this.margin + 200, this.currentY);
      this.currentY += 40;
    }

    // Notes
    if (invoice.notes) {
      this.setFont(12, 'bold');
      this.drawText('Notes:', this.margin, this.currentY);
      this.currentY += 20;
      
      this.setFont(12);
      this.drawText(invoice.notes, this.margin, this.currentY, '#6B7280', this.pageWidth - 2 * this.margin);
    }

    // Footer
    this.currentY = this.pageHeight - 80;
    this.drawLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 20;

    this.setFont(10);
    const footerText = `${company.name}${company.companyNumber ? ` • Company No: ${company.companyNumber}` : ''}${company.vatNumber ? ` • VAT No: ${company.vatNumber}` : ''}`;
    this.drawText(footerText, this.margin, this.currentY, '#6B7280');

    return this.canvas.toDataURL('image/png', 0.9);
  }
}

/**
 * Converts a data URL to a blob for download
 */
function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Downloads a quote as PDF and opens WhatsApp
 */
export async function downloadQuoteAndOpenWhatsApp(
  quote: QuoteData, 
  client: ClientData, 
  whatsappPhone?: string,
  company?: CompanyData
): Promise<void> {
  try {
    // Validate required parameters
    if (!quote || !client) {
      throw new Error('Quote and client data are required');
    }

    // Ensure client has a name
    if (!client.name && typeof client === 'string') {
      // Handle case where client is passed as a string instead of object
      client = { name: client };
    } else if (!client.name) {
      client.name = 'Unknown Client';
    }

    const businessDetails = company || await getBusinessDetails();
    const generator = new PDFGenerator();
    const dataURL = generator.generateQuotePDF(quote, client, businessDetails);
    
    // Convert to blob and create download
    const blob = dataURLToBlob(dataURL);
    const url = URL.createObjectURL(blob);
    
    // Open WhatsApp FIRST (must be synchronous to avoid popup blocking)
    if (whatsappPhone) {
      const message = `Hi ${client.name}, I've just sent you your quote for ${quote.title}. The total is ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(quote.total)}. Please see the attached quote document and let me know if you have any questions!`;
      
      const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp immediately (synchronously) to avoid popup blocking
      console.log('Opening WhatsApp (legacy) with phone:', whatsappPhone);
      console.log('WhatsApp URL:', whatsappUrl);
      window.open(whatsappUrl, '_blank');
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `Quote-${quote.number || 'DRAFT'}-${(client.name || 'Unknown').replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
  } catch (error) {
    console.error('Failed to generate quote PDF:', error);
    throw new Error('Failed to generate and download quote PDF');
  }
}

/**
 * Downloads an invoice as PDF and opens WhatsApp
 */
export async function downloadInvoiceAndOpenWhatsApp(
  invoice: InvoiceData, 
  client: ClientData, 
  whatsappPhone?: string,
  company?: CompanyData
): Promise<void> {
  try {
    // Validate required parameters
    if (!invoice || !client) {
      throw new Error('Invoice and client data are required');
    }

    // Ensure client has a name
    if (!client.name && typeof client === 'string') {
      // Handle case where client is passed as a string instead of object
      client = { name: client };
    } else if (!client.name) {
      client.name = 'Unknown Client';
    }

    const businessDetails = company || await getBusinessDetails();
    const bankDetails = await getBankDetails();
    const generator = new PDFGenerator();
    const dataURL = generator.generateInvoicePDF(invoice, client, businessDetails, bankDetails);
    
    // Convert to blob and create download
    const blob = dataURLToBlob(dataURL);
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoice.number || 'DRAFT'}-${(client.name || 'Unknown').replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    // Open WhatsApp with message
    if (whatsappPhone) {
      // Comprehensive deposit invoice detection
      const isDepositInvoice = invoice.billType === 'deposit' || 
                               invoice.isDepositInvoice === true ||
                               invoice.type === 'deposit' || 
                               invoice.description?.toLowerCase().includes('deposit') ||
                               invoice.notes?.toLowerCase().includes('deposit') ||
                               invoice.paymentTerms?.toLowerCase().includes('deposit') ||
                               (invoice.number && invoice.number.toLowerCase().includes('deposit'));
      
      const invoiceType = isDepositInvoice ? 'deposit invoice' : 'invoice';
      
      const message = `Hi ${client.name}, here's your ${invoiceType} ${invoice.number || 'DRAFT'} for ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(invoice.total)}. Payment is due by ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}. Please see the attached ${invoiceType} and bank details for payment.`;
      
      const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      
      // Small delay to allow download to start
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    throw new Error('Failed to generate and download invoice PDF');
  }
}

/**
 * Downloads a quote as PDF only (no WhatsApp)
 */
export async function downloadQuotePDF(
  quote: QuoteData, 
  client: ClientData, 
  company?: CompanyData
): Promise<void> {
  // Ensure client has a name
  if (!client.name && typeof client === 'string') {
    client = { name: client };
  } else if (!client.name) {
    client.name = 'Unknown Client';
  }

  const businessDetails = company || await getBusinessDetails();
  const generator = new PDFGenerator();
  const dataURL = generator.generateQuotePDF(quote, client, businessDetails);
  
  const blob = dataURLToBlob(dataURL);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Quote-${quote.number || 'DRAFT'}-${(client.name || 'Unknown').replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads an invoice as PDF only (no WhatsApp)
 */
export async function downloadInvoicePDF(
  invoice: InvoiceData, 
  client: ClientData, 
  company?: CompanyData
): Promise<void> {
  // Ensure client has a name
  if (!client.name && typeof client === 'string') {
    client = { name: client };
  } else if (!client.name) {
    client.name = 'Unknown Client';
  }

  const businessDetails = company || await getBusinessDetails();
  const bankDetails = await getBankDetails();
  const generator = new PDFGenerator();
  const dataURL = generator.generateInvoicePDF(invoice, client, businessDetails, bankDetails);
  
  const blob = dataURLToBlob(dataURL);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${invoice.number || 'DRAFT'}-${(client.name || 'Unknown').replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Downloads a variation as PDF and opens WhatsApp
 */
export async function downloadVariationAndOpenWhatsApp(
  variation: VariationData, 
  client: ClientData, 
  whatsappPhone?: string,
  company?: CompanyData
): Promise<void> {
  try {
    // Validate required parameters
    if (!variation || !client) {
      throw new Error('Variation and client data are required');
    }

    // Ensure client has a name
    if (!client.name && typeof client === 'string') {
      // Handle case where client is passed as a string instead of object
      client = { name: client };
    } else if (!client.name) {
      client.name = 'Unknown Client';
    }

    const businessDetails = company || await getBusinessDetails();
    const generator = new PDFGenerator();
    const dataURL = generator.generateVariationPDF(variation, client, businessDetails);
    
    // Convert to blob and create download
    const blob = dataURLToBlob(dataURL);
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `Variation-${variation.id.substring(0, 8)}-${(client.name || 'Unknown').replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    // Open WhatsApp with message
    if (whatsappPhone) {
      const formattedAmount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(variation.amount);
      
      let message = `Hi ${client.name.split(' ')[0]},\n\n`;
      message += `I've prepared a variation order for additional work on your project.\n\n`;
      message += `*📋 VARIATION DETAILS*\n`;
      message += `Project: ${variation.job?.title || 'Your Project'}\n\n`;
      message += `*💰 ADDITIONAL COST*\n`;
      message += `${formattedAmount}\n\n`;
      if (variation.timeEstimate) {
        message += `*⏱️ TIME ESTIMATE*\n`;
        message += `Approximately ${variation.timeEstimate} hour(s)\n\n`;
      }
      if (variation.description) {
        message += `*📝 DESCRIPTION*\n`;
        message += `${variation.description}\n\n`;
      }
      message += `────────────────\n\n`;
      message += `Please review the attached variation order PDF.\n\n`;
      message += `Let me know if you approve and would like to proceed!\n\n`;
      message += `Thanks`;
      
      const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
      
      // Small delay to allow download to start
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);
    }
    
  } catch (error) {
    console.error('Failed to generate variation PDF:', error);
    throw new Error('Failed to generate and download variation PDF');
  }
}

/**
 * Downloads a variation as PDF only (no WhatsApp)
 */
export async function downloadVariationPDF(
  variation: VariationData, 
  client: ClientData, 
  company?: CompanyData
): Promise<void> {
  // Ensure client has a name
  if (!client.name && typeof client === 'string') {
    client = { name: client };
  } else if (!client.name) {
    client.name = 'Unknown Client';
  }

  const businessDetails = company || await getBusinessDetails();
  const generator = new PDFGenerator();
  const dataURL = generator.generateVariationPDF(variation, client, businessDetails);
  
  const blob = dataURLToBlob(dataURL);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Variation-${variation.id.substring(0, 8)}-${(client.name || 'Unknown').replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}