/**
 * Multi-User Organization Types
 * 
 * These types define the data structures for multi-user functionality.
 * Created as part of Phase 1 - Foundation (Non-Breaking)
 */

// ============================================================================
// ORGANIZATION
// ============================================================================

export interface Organization {
  // Identity
  id: string;                    // UUID v4
  name: string;                  // Business name (1-100 chars)
  
  // Ownership
  owner_user_id: string;         // Supabase Auth user ID
  
  // Subscription
  plan: 'solo' | 'team' | 'business';
  max_seats: number;             // 1, 3, or 6
  current_seats: number;         // Count of active members
  stripe_customer_id: string;    // Stripe customer ID
  stripe_subscription_id: string; // Stripe subscription ID
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  
  // Billing
  current_period_end: number | null;    // Unix timestamp
  cancel_at_period_end: boolean;
  trial_end: number | null;              // Unix timestamp
  
  // Metadata
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  
  // Settings
  settings: {
    require_admin_approval_for_deletes: boolean;  // Future feature
    allow_members_to_invite: boolean;              // Future feature
  };
}

// ============================================================================
// ORGANIZATION MEMBER
// ============================================================================

export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'suspended' | 'removed';

export interface OrganizationMember {
  // Identity
  id: string;                    // UUID v4
  organization_id: string;       // FK to Organization
  user_id: string;               // Supabase Auth user ID
  
  // User Info (Cached from Auth)
  email: string;                 // User's email
  name: string;                  // User's display name
  
  // Role & Permissions
  role: MemberRole;
  
  // Status
  status: MemberStatus;
  
  // Invitation Tracking
  invited_by_user_id: string;    // Who invited this user
  invited_at: string;            // ISO 8601
  joined_at: string;             // ISO 8601
  
  // Metadata
  last_active_at: string | null; // Last login time
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

// ============================================================================
// INVITATION
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'canceled';

export interface Invitation {
  // Identity
  id: string;                    // UUID v4
  token: string;                 // UUID v4 (used in invitation URL)
  
  // Organization
  organization_id: string;       // FK to Organization
  organization_name: string;     // Cached for display
  
  // Invitee
  email: string;                 // Email address to invite
  role: 'admin' | 'member';      // Cannot invite as owner
  
  // Inviter
  invited_by_user_id: string;    // Who sent the invitation
  invited_by_name: string;       // Cached for display
  
  // Status
  status: InvitationStatus;
  
  // Timestamps
  created_at: string;            // ISO 8601
  expires_at: string;            // ISO 8601 (created_at + 7 days)
  accepted_at: string | null;    // ISO 8601
  canceled_at: string | null;    // ISO 8601
  
  // Metadata
  accepted_by_user_id: string | null; // Filled when accepted
}

// ============================================================================
// ACTIVITY LOG (Audit Trail)
// ============================================================================

export enum ActivityAction {
  // Organization
  ORGANIZATION_CREATED = 'organization.created',
  ORGANIZATION_UPDATED = 'organization.updated',
  
  // Members
  MEMBER_INVITED = 'member.invited',
  MEMBER_JOINED = 'member.joined',
  MEMBER_ROLE_CHANGED = 'member.role_changed',
  MEMBER_REMOVED = 'member.removed',
  MEMBER_SUSPENDED = 'member.suspended',
  
  // Invitations
  INVITATION_SENT = 'invitation.sent',
  INVITATION_ACCEPTED = 'invitation.accepted',
  INVITATION_CANCELED = 'invitation.canceled',
  INVITATION_EXPIRED = 'invitation.expired',
  
  // Clients
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',
  CLIENT_DELETED = 'client.deleted',
  
  // Jobs
  JOB_CREATED = 'job.created',
  JOB_UPDATED = 'job.updated',
  JOB_STATUS_CHANGED = 'job.status_changed',
  JOB_DELETED = 'job.deleted',
  
  // Invoices
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_DELETED = 'invoice.deleted',
  
  // Quotes
  QUOTE_CREATED = 'quote.created',
  QUOTE_UPDATED = 'quote.updated',
  QUOTE_SENT = 'quote.sent',
  QUOTE_APPROVED = 'quote.approved',
  QUOTE_REJECTED = 'quote.rejected',
  QUOTE_DELETED = 'quote.deleted',
  
  // Payments
  PAYMENT_RECORDED = 'payment.recorded',
  PAYMENT_UPDATED = 'payment.updated',
  PAYMENT_DELETED = 'payment.deleted',
  
  // Settings
  BUSINESS_DETAILS_UPDATED = 'business_details.updated',
  BANK_DETAILS_UPDATED = 'bank_details.updated',
  BRANDING_UPDATED = 'branding.updated',
}

export enum ResourceType {
  ORGANIZATION = 'organization',
  MEMBER = 'member',
  INVITATION = 'invitation',
  CLIENT = 'client',
  JOB = 'job',
  INVOICE = 'invoice',
  QUOTE = 'quote',
  PAYMENT = 'payment',
  BUSINESS_DETAILS = 'business_details',
  BANK_DETAILS = 'bank_details',
  BRANDING = 'branding',
}

export interface ActivityLog {
  // Identity
  id: string;                    // UUID v4
  organization_id: string;       // FK to Organization
  
  // Actor
  user_id: string;               // Who performed the action
  user_name: string;             // Cached for display
  user_email: string;            // Cached for display
  
  // Action
  action: ActivityAction;        // What was done
  resource_type: ResourceType;   // What was affected
  resource_id: string;           // ID of affected resource
  resource_name: string;         // Display name of resource
  
  // Details
  details: {
    old_value?: any;             // Before state (for updates)
    new_value?: any;             // After state (for updates)
    metadata?: Record<string, any>; // Additional context
  };
  
  // Metadata
  timestamp: string;             // ISO 8601
  ip_address: string | null;     // User's IP
  user_agent: string | null;     // Browser info
}

// ============================================================================
// ENHANCED RESOURCE TYPES (with multi-user fields)
// ============================================================================

/**
 * Base fields that all resources should have for multi-user support
 */
export interface MultiUserResourceFields {
  organization_id: string;       // FK to Organization
  created_by_user_id: string;    // Who created this
  created_by_name: string;       // Cached for display
  updated_by_user_id: string;    // Who last updated this
  updated_by_name: string;       // Cached for display
}

/**
 * Phase 4: Extended types for existing WorkBeam data models
 * These add multi-user collaboration fields to existing types
 */

// Client with multi-user fields
export interface MultiUserClient {
  // Existing client fields
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  tags: string[];
  isActive: boolean;
  totalSpent: number;
  outstandingBalance: number;
  jobCount: number;
  lastJobDate: string | null;
  created_at: string;
  updated_at: string;
  
  // Multi-user fields
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
}

// Job with multi-user fields
export interface MultiUserJob {
  // Existing job fields
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string | null;
  endDate: string | null;
  estimatedCost: number;
  actualCost: number;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  
  // Multi-user fields
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
  assigned_to_user_id?: string;  // Optional: who's assigned to this job
  assigned_to_name?: string;      // Optional: display name of assignee
}

// Invoice with multi-user fields
export interface MultiUserInvoice {
  // Existing invoice fields
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  jobId: string | null;
  jobTitle: string | null;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  lineItems: any[];
  notes: string;
  terms: string;
  created_at: string;
  updated_at: string;
  templateId?: string;
  
  // Multi-user fields
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
  sent_by_user_id?: string;      // Optional: who sent the invoice
  sent_by_name?: string;          // Optional: display name
}

// Quote with multi-user fields
export interface MultiUserQuote {
  // Existing quote fields
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  jobId: string | null;
  jobTitle: string | null;
  issueDate: string;
  expiryDate: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  subtotal: number;
  tax: number;
  total: number;
  lineItems: any[];
  notes: string;
  terms: string;
  validUntil: string;
  created_at: string;
  updated_at: string;
  
  // Multi-user fields
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
  sent_by_user_id?: string;      // Optional: who sent the quote
  sent_by_name?: string;          // Optional: display name
}

// Payment with multi-user fields
export interface MultiUserPayment {
  // Existing payment fields
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'other';
  reference: string;
  notes: string;
  created_at: string;
  updated_at: string;
  
  // Multi-user fields
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
  recorded_by_user_id: string;   // Who recorded this payment
  recorded_by_name: string;       // Display name
}

// Variation with multi-user fields
export interface MultiUserVariation {
  // Existing variation fields
  id: string;
  quoteId: string;
  title: string;
  description: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  amount: number;
  created_at: string;
  updated_at: string;
  
  // Multi-user fields
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
}

// Business Details with multi-user fields
export interface MultiUserBusinessDetails {
  // Existing business details fields
  businessName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  registrationNumber: string;
  website: string;
  
  // Multi-user fields
  organization_id: string;
  updated_by_user_id: string;
  updated_by_name: string;
  updated_at: string;
}

// Bank Details with multi-user fields
export interface MultiUserBankDetails {
  // Existing bank details fields
  accountName: string;
  accountNumber: string;
  sortCode: string;
  bankName: string;
  iban: string;
  swiftCode: string;
  showOnInvoices: boolean;
  
  // Multi-user fields
  organization_id: string;
  updated_by_user_id: string;
  updated_by_name: string;
  updated_at: string;
}

// Branding with multi-user fields
export interface MultiUserBranding {
  // Existing branding fields
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  
  // Multi-user fields
  organization_id: string;
  updated_by_user_id: string;
  updated_by_name: string;
  updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface OrganizationResponse {
  organization: Organization;
  membership: OrganizationMember;
  members: OrganizationMember[];
}

export interface MembersResponse {
  members: OrganizationMember[];
  pending_invitations: Invitation[];
  seats_info: {
    max_seats: number;
    used_seats: number;
    available_seats: number;
    pending_invitations: number;
  };
}

export interface InvitationResponse {
  invitation: Invitation;
  invitation_url?: string;
}

export interface ActivityLogResponse {
  activities: ActivityLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SEAT_LIMITS = {
  solo: 1,
  team: 3,
  business: 6,
} as const;

export const INVITATION_EXPIRY_DAYS = 7;
export const ACTIVITY_LOG_RETENTION_DAYS = 90;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidRole(role: string): role is MemberRole {
  return ['owner', 'admin', 'member'].includes(role);
}

export function isValidInvitationRole(role: string): role is 'admin' | 'member' {
  return ['admin', 'member'].includes(role);
}

export function isValidPlan(plan: string): plan is 'solo' | 'team' | 'business' {
  return ['solo', 'team', 'business'].includes(plan);
}

export function isOrganizationResponse(data: any): data is OrganizationResponse {
  return (
    data &&
    typeof data === 'object' &&
    'organization' in data &&
    'membership' in data &&
    'members' in data
  );
}
