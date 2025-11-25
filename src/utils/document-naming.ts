/**
 * Unified Document Naming System
 * Provides consistent naming for invoices, quotes, and variations
 */

export interface DocumentNumberOptions {
  year?: number;
  sequence?: number;
}

export interface FileNameOptions {
  documentNumber: string;
  clientName?: string;
  jobTitle?: string;
  date?: string;
  invoiceType?: 'deposit' | 'remaining' | 'selected' | 'custom';
}

/**
 * Generate sequential document numbers
 */
export const generateDocumentNumber = (
  type: 'invoice' | 'quote' | 'variation',
  options: DocumentNumberOptions = {}
): string => {
  const year = options.year || new Date().getFullYear();
  const sequence = options.sequence || 1;
  
  const prefix = {
    invoice: 'INV',
    quote: 'QUO', 
    variation: 'VAR'
  }[type];
  
  // Ensure sequence is always 3 digits with leading zeros
  const formattedSequence = String(sequence).padStart(3, '0');
  
  return `${prefix}-${year}-${formattedSequence}`;
};

export interface FileNameOptions {
  documentNumber: string;
  clientName?: string;
  jobTitle?: string;
  date?: string;
  invoiceType?: 'deposit' | 'remaining' | 'selected' | 'custom';
}

/**
 * Generate professional download filenames with invoice type
 */
export const generateFileName = (
  type: 'invoice' | 'quote' | 'variation',
  options: FileNameOptions
): string => {
  const { documentNumber, clientName, jobTitle, date, invoiceType } = options;
  
  // Sanitize strings for filename use
  const sanitize = (str: string): string => {
    return str
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };
  
  // Generate type label with invoice type if applicable
  let typeLabel = {
    invoice: 'Invoice',
    quote: 'Quote',
    variation: 'Variation'
  }[type];
  
  if (type === 'invoice' && invoiceType) {
    const typeLabels = {
      deposit: 'Deposit_Invoice',
      remaining: 'Remaining_Balance_Invoice',
      selected: 'Partial_Invoice',
      custom: 'Invoice'
    };
    typeLabel = typeLabels[invoiceType];
  }
  
  // Build filename parts
  const parts = [typeLabel, documentNumber];
  
  if (clientName) {
    parts.push(sanitize(clientName));
  }
  
  if (jobTitle && jobTitle !== clientName) {
    parts.push(sanitize(jobTitle));
  }
  
  if (date) {
    parts.push(date);
  }
  
  return `${parts.join('_')}.pdf`;
};

/**
 * Format client name for display and filenames
 */
export const formatClientName = (client: any): string => {
  if (typeof client === 'string') {
    return client;
  }
  
  if (client?.name) {
    return client.name;
  }
  
  if (client?.firstName && client?.lastName) {
    return `${client.firstName} ${client.lastName}`;
  }
  
  return 'Unknown Client';
};

/**
 * Format job title for filenames
 */
export const formatJobTitle = (job: any): string => {
  if (typeof job === 'string') {
    return job;
  }
  
  if (job?.title) {
    return job.title;
  }
  
  if (job?.description) {
    return job.description.split('\n')[0]; // First line only
  }
  
  return 'Project';
};

/**
 * Generate display-friendly document reference with invoice type
 */
export const generateDisplayReference = (
  type: 'invoice' | 'quote' | 'variation',
  documentNumber: string,
  clientName?: string,
  invoiceType?: 'deposit' | 'remaining' | 'selected' | 'custom'
): string => {
  let typeLabel = {
    invoice: 'Invoice',
    quote: 'Quote', 
    variation: 'Variation'
  }[type];
  
  // Add invoice type suffix for invoices
  if (type === 'invoice' && invoiceType) {
    const typeLabels = {
      deposit: 'Deposit Invoice',
      remaining: 'Remaining Balance Invoice',
      selected: 'Partial Invoice',
      custom: 'Invoice'
    };
    typeLabel = typeLabels[invoiceType];
  }
  
  if (clientName) {
    return `${typeLabel} ${documentNumber} - ${clientName}`;
  }
  
  return `${typeLabel} ${documentNumber}`;
};

/**
 * Parse document number to extract components
 */
export const parseDocumentNumber = (documentNumber: string): {
  type: 'invoice' | 'quote' | 'variation' | null;
  year: number | null;
  sequence: number | null;
} => {
  const match = documentNumber.match(/^(INV|QUO|VAR)-(\d{4})-(\d{3})$/);
  
  if (!match) {
    return { type: null, year: null, sequence: null };
  }
  
  const typeMap = {
    'INV': 'invoice' as const,
    'QUO': 'quote' as const,
    'VAR': 'variation' as const
  };
  
  return {
    type: typeMap[match[1] as keyof typeof typeMap],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10)
  };
};

/**
 * Get next sequence number for a document type
 */
export const getNextSequenceNumber = (
  existingDocuments: { number?: string }[],
  type: 'invoice' | 'quote' | 'variation',
  year: number = new Date().getFullYear()
): number => {
  const prefix = {
    invoice: 'INV',
    quote: 'QUO',
    variation: 'VAR'
  }[type];
  
  // Filter documents of the same type and year
  const sameTypeYearDocs = existingDocuments.filter(doc => {
    if (!doc.number) return false;
    const parsed = parseDocumentNumber(doc.number);
    return parsed.type === type && parsed.year === year;
  });
  
  // Find the highest sequence number
  let maxSequence = 0;
  sameTypeYearDocs.forEach(doc => {
    const parsed = parseDocumentNumber(doc.number!);
    if (parsed.sequence && parsed.sequence > maxSequence) {
      maxSequence = parsed.sequence;
    }
  });
  
  return maxSequence + 1;
};

/**
 * Format date for filenames (YYYY-MM-DD)
 */
export const formatDateForFilename = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

/**
 * Validate document number format
 */
export const isValidDocumentNumber = (documentNumber: string): boolean => {
  return /^(INV|QUO|VAR)-\d{4}-\d{3}$/.test(documentNumber);
};