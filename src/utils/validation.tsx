/**
 * Validation Schemas using Zod
 * Provides type-safe validation for all data structures
 */

import { z } from 'zod';

/**
 * Common validation patterns
 */
const emailSchema = z.string().email('Invalid email address').optional().or(z.literal(''));
const phoneSchema = z.string().regex(/^[\d\s+()-]*$/, 'Invalid phone number').optional().or(z.literal(''));
const postcodeSchema = z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode').optional().or(z.literal(''));
const urlSchema = z.string().url('Invalid URL').optional().or(z.literal(''));
const positiveNumberSchema = z.number().nonnegative('Must be a positive number');
const currencySchema = z.number().nonnegative('Amount must be positive');

/**
 * Client validation schema
 */
export const clientSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  postcode: postcodeSchema,
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  vatNumber: z.string().max(20, 'VAT number too long').optional().or(z.literal('')),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type ClientInput = z.infer<typeof clientSchema>;

/**
 * Line item validation schema
 */
export const lineItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  qty: positiveNumberSchema,
  price: currencySchema,
  total: currencySchema.optional()
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

/**
 * Job validation schema
 */
export const jobSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  clientId: z.union([z.string(), z.number()]),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional().or(z.literal('')),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  status: z.enum(['quote_pending', 'quote_approved', 'scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  estimatedValue: currencySchema.optional(),
  materials: z.array(z.object({
    name: z.string().min(1, 'Material name required'),
    quantity: positiveNumberSchema,
    rate: currencySchema,
    total: currencySchema
  })).optional(),
  labour: z.array(z.object({
    name: z.string().min(1, 'Labour description required'),
    hours: positiveNumberSchema,
    rate: currencySchema,
    total: currencySchema
  })).optional(),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  vatEnabled: z.boolean().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  subtotal: currencySchema.optional(),
  vatAmount: currencySchema.optional(),
  total: currencySchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  dueDate: z.string().optional()
});

export type JobInput = z.infer<typeof jobSchema>;

/**
 * Quote validation schema
 */
export const quoteSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  clientId: z.union([z.string(), z.number()]),
  jobId: z.union([z.string(), z.number()]).optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional().or(z.literal('')),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item required'),
  subtotal: currencySchema,
  vatAmount: currencySchema.optional(),
  total: currencySchema,
  vatEnabled: z.boolean().optional(),
  validUntil: z.string().optional(),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type QuoteInput = z.infer<typeof quoteSchema>;

/**
 * Invoice validation schema
 */
export const invoiceSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  clientId: z.union([z.string(), z.number()]),
  jobId: z.union([z.string(), z.number()]).optional(),
  number: z.string().min(1, 'Invoice number required'),
  issueDate: z.string(),
  dueDate: z.string(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item required'),
  subtotal: currencySchema,
  vatAmount: currencySchema.optional(),
  total: currencySchema,
  amountDue: currencySchema.optional(),
  type: z.enum(['deposit', 'remaining', 'full']).optional(),
  status: z.enum(['draft', 'sent', 'part-paid', 'paid', 'overdue', 'pending']),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

/**
 * Business details validation schema
 */
export const businessDetailsSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  legalName: z.string().max(100, 'Legal name too long').optional().or(z.literal('')),
  tradingName: z.string().max(100, 'Trading name too long').optional().or(z.literal('')),
  registrationNumber: z.string().max(20, 'Registration number too long').optional().or(z.literal('')),
  vatNumber: z.string().max(20, 'VAT number too long').optional().or(z.literal('')),
  email: emailSchema,
  phone: phoneSchema,
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  website: urlSchema,
  registeredAddress: z.object({
    line1: z.string().max(100).optional(),
    line2: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    postcode: z.string().max(10).optional(),
    country: z.string().max(50).optional()
  }).optional(),
  tradingAddress: z.object({
    line1: z.string().max(100).optional(),
    line2: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    postcode: z.string().max(10).optional(),
    country: z.string().max(50).optional()
  }).optional(),
  tradingAddressDifferent: z.boolean().optional()
});

export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>;

/**
 * Bank details validation schema
 */
export const bankDetailsSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  accountName: z.string().min(1, 'Account name is required').max(100, 'Account name too long'),
  accountNumber: z.string().regex(/^\d{8}$/, 'Invalid account number (must be 8 digits)'),
  sortCode: z.string().regex(/^\d{2}-?\d{2}-?\d{2}$/, 'Invalid sort code (format: XX-XX-XX)'),
  bankName: z.string().max(100, 'Bank name too long').optional().or(z.literal('')),
  iban: z.string().max(34, 'IBAN too long').optional().or(z.literal('')),
  swiftBic: z.string().max(11, 'SWIFT/BIC too long').optional().or(z.literal(''))
});

export type BankDetailsInput = z.infer<typeof bankDetailsSchema>;

/**
 * Booking validation schema
 */
export const bookingSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  clientId: z.union([z.string(), z.number()]).optional(),
  jobId: z.union([z.string(), z.number()]).optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (use HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (use HH:MM)'),
  type: z.enum(['survey', 'installation', 'repair', 'inspection']),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  isAllDay: z.boolean().optional(),
  isLead: z.boolean().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional()
});

export type BookingInput = z.infer<typeof bookingSchema>;

/**
 * Payment validation schema
 */
export const paymentSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  invoiceId: z.union([z.string(), z.number()]),
  amount: currencySchema,
  method: z.enum(['cash', 'bank_transfer', 'card', 'cheque', 'other']),
  reference: z.string().max(100, 'Reference too long').optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
  date: z.string(),
  createdAt: z.string().optional()
});

export type PaymentInput = z.infer<typeof paymentSchema>;

/**
 * Validation helper functions
 */

/**
 * Validation result type
 */
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
};

/**
 * Validate data against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success flag and error messages
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors: Record<string, string[]> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(issue.message);
      });
      return { success: false, errors };
    }
  } catch (error) {
    console.error('Validation error:', error);
    return { 
      success: false, 
      errors: { _general: ['Validation failed'] } 
    };
  }
}

/**
 * Format validation errors for display
 * @param errors - Validation errors from validate()
 * @returns Array of error messages
 */
export const formatValidationErrors = (errors: Record<string, string[]>): string[] => {
  const messages: string[] = [];
  Object.entries(errors).forEach(([field, fieldErrors]) => {
    fieldErrors.forEach(error => {
      if (field === '_general') {
        messages.push(error);
      } else {
        messages.push(`${field}: ${error}`);
      }
    });
  });
  return messages;
};
