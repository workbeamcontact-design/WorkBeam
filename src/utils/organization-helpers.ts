/**
 * Organization Helper Functions
 * 
 * Utility functions for working with organizations, members, and invitations.
 * Created as part of Phase 1 - Foundation (Non-Breaking)
 */

import {
  Organization,
  OrganizationMember,
  Invitation,
  MemberRole,
  ValidationResult,
  SEAT_LIMITS,
  INVITATION_EXPIRY_DAYS,
  isValidRole,
  isValidInvitationRole,
  isValidPlan,
} from './organization-types';

// ============================================================================
// UUID GENERATION
// ============================================================================

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate KV storage keys for multi-user data
 */
export const OrganizationKeys = {
  // Organization
  organization: (orgId: string) => `organization:${orgId}`,
  
  // Members
  member: (orgId: string, userId: string) => 
    `organization:${orgId}:member:${userId}`,
  allMembers: (orgId: string) => 
    `organization:${orgId}:members`,
  
  // Invitations
  invitation: (invitationId: string) => 
    `invitation:${invitationId}`,
  invitationByToken: (token: string) => 
    `invitation:token:${token}`,
  organizationInvitations: (orgId: string) => 
    `organization:${orgId}:invitations`,
  
  // Activity logs
  activity: (orgId: string, timestamp: string, activityId: string) => 
    `organization:${orgId}:activity:${timestamp}:${activityId}`,
  activityPrefix: (orgId: string) => 
    `organization:${orgId}:activity:`,
  
  // User lookup
  userOrganization: (userId: string) => 
    `user:${userId}:organization`,
  
  // Organization data (resources)
  clients: (orgId: string) => 
    `organization:${orgId}:clients`,
  client: (orgId: string, clientId: string) => 
    `organization:${orgId}:client:${clientId}`,
  
  jobs: (orgId: string) => 
    `organization:${orgId}:jobs`,
  job: (orgId: string, jobId: string) => 
    `organization:${orgId}:job:${jobId}`,
  
  invoices: (orgId: string) => 
    `organization:${orgId}:invoices`,
  invoice: (orgId: string, invoiceId: string) => 
    `organization:${orgId}:invoice:${invoiceId}`,
  
  quotes: (orgId: string) => 
    `organization:${orgId}:quotes`,
  quote: (orgId: string, quoteId: string) => 
    `organization:${orgId}:quote:${quoteId}`,
  
  payments: (orgId: string) => 
    `organization:${orgId}:payments`,
  payment: (orgId: string, paymentId: string) => 
    `organization:${orgId}:payment:${paymentId}`,
  
  bookings: (orgId: string) => 
    `organization:${orgId}:bookings`,
  booking: (orgId: string, bookingId: string) => 
    `organization:${orgId}:booking:${bookingId}`,
  
  businessDetails: (orgId: string) => 
    `organization:${orgId}:business-details`,
  
  bankDetails: (orgId: string) => 
    `organization:${orgId}:bank-details`,
  
  branding: (orgId: string) => 
    `organization:${orgId}:branding`,
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate organization name
 */
export function validateOrganizationName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Organization name is required' };
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Organization name must be 100 characters or less' };
  }
  
  // Allow alphanumeric, spaces, hyphens, apostrophes
  const validPattern = /^[a-zA-Z0-9\s\-']+$/;
  if (!validPattern.test(name)) {
    return { 
      valid: false, 
      error: 'Organization name can only contain letters, numbers, spaces, hyphens, and apostrophes' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  return { valid: true };
}

/**
 * Validate member role
 */
export function validateMemberRole(role: string): ValidationResult {
  if (!isValidRole(role)) {
    return { 
      valid: false, 
      error: 'Role must be one of: owner, admin, member' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate invitation role
 */
export function validateInvitationRole(role: string): ValidationResult {
  if (!isValidInvitationRole(role)) {
    return { 
      valid: false, 
      error: 'Invitation role must be either admin or member (cannot invite as owner)' 
    };
  }
  
  return { valid: true };
}

/**
 * Check if email is already a member
 */
export function isEmailAlreadyMember(
  email: string, 
  members: OrganizationMember[]
): boolean {
  return members.some(
    member => member.email.toLowerCase() === email.toLowerCase() && 
              member.status === 'active'
  );
}

/**
 * Check if email has pending invitation
 */
export function hasEmailPendingInvitation(
  email: string,
  invitations: Invitation[]
): boolean {
  return invitations.some(
    inv => inv.email.toLowerCase() === email.toLowerCase() && 
           inv.status === 'pending'
  );
}

/**
 * Check if invitation is expired
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  return new Date(invitation.expires_at) < new Date();
}

/**
 * Check if organization has available seats
 */
export function hasAvailableSeats(
  organization: Organization,
  pendingInvitationsCount: number = 0
): boolean {
  const totalUsed = organization.current_seats + pendingInvitationsCount;
  return totalUsed < organization.max_seats;
}

/**
 * Get available seats count
 */
export function getAvailableSeats(
  organization: Organization,
  pendingInvitationsCount: number = 0
): number {
  const totalUsed = organization.current_seats + pendingInvitationsCount;
  return Math.max(0, organization.max_seats - totalUsed);
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new organization
 */
export function createOrganization(params: {
  name: string;
  owner_user_id: string;
  plan: 'solo' | 'team' | 'business';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: Organization['subscription_status'];
  trial_end?: number | null;
}): Organization {
  const now = new Date().toISOString();
  const maxSeats = SEAT_LIMITS[params.plan];
  
  return {
    id: generateUUID(),
    name: params.name,
    owner_user_id: params.owner_user_id,
    plan: params.plan,
    max_seats: maxSeats,
    current_seats: 1, // Owner is first seat
    stripe_customer_id: params.stripe_customer_id || '',
    stripe_subscription_id: params.stripe_subscription_id || '',
    subscription_status: params.subscription_status || 'trialing',
    current_period_end: null,
    cancel_at_period_end: false,
    trial_end: params.trial_end || null,
    created_at: now,
    updated_at: now,
    settings: {
      require_admin_approval_for_deletes: false,
      allow_members_to_invite: false,
    },
  };
}

/**
 * Create owner membership (for new organization)
 */
export function createOwnerMembership(params: {
  organization_id: string;
  user_id: string;
  email: string;
  name: string;
}): OrganizationMember {
  const now = new Date().toISOString();
  
  return {
    id: generateUUID(),
    organization_id: params.organization_id,
    user_id: params.user_id,
    email: params.email,
    name: params.name,
    role: 'owner',
    status: 'active',
    invited_by_user_id: params.user_id, // Self-created
    invited_at: now,
    joined_at: now,
    last_active_at: now,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Create an invitation
 */
export function createInvitation(params: {
  organization_id: string;
  organization_name: string;
  email: string;
  role: 'admin' | 'member';
  invited_by_user_id: string;
  invited_by_name: string;
}): Invitation {
  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
  
  return {
    id: generateUUID(),
    token: generateUUID(),
    organization_id: params.organization_id,
    organization_name: params.organization_name,
    email: params.email,
    role: params.role,
    invited_by_user_id: params.invited_by_user_id,
    invited_by_name: params.invited_by_name,
    status: 'pending',
    created_at: now,
    expires_at: expiresAt.toISOString(),
    accepted_at: null,
    canceled_at: null,
    accepted_by_user_id: null,
  };
}

/**
 * Create organization member from accepted invitation
 */
export function createMemberFromInvitation(params: {
  organization_id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  invited_by_user_id: string;
  invited_at: string;
}): OrganizationMember {
  const now = new Date().toISOString();
  
  return {
    id: generateUUID(),
    organization_id: params.organization_id,
    user_id: params.user_id,
    email: params.email,
    name: params.name,
    role: params.role,
    status: 'active',
    invited_by_user_id: params.invited_by_user_id,
    invited_at: params.invited_at,
    joined_at: now,
    last_active_at: now,
    created_at: now,
    updated_at: now,
  };
}

// ============================================================================
// PLAN HELPERS
// ============================================================================

/**
 * Get max seats for a plan
 */
export function getMaxSeatsForPlan(plan: 'solo' | 'team' | 'business'): number {
  return SEAT_LIMITS[plan];
}

/**
 * Check if plan allows multiple users
 */
export function isMultiUserPlan(plan: 'solo' | 'team' | 'business'): boolean {
  return plan === 'team' || plan === 'business';
}

/**
 * Get plan name for display
 */
export function getPlanDisplayName(plan: 'solo' | 'team' | 'business'): string {
  const names = {
    solo: 'Solo',
    team: 'Team',
    business: 'Business',
  };
  return names[plan];
}

// ============================================================================
// ROLE HELPERS
// ============================================================================

/**
 * Get role display name
 */
export function getRoleDisplayName(role: MemberRole): string {
  const names = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
  };
  return names[role];
}

/**
 * Get role priority (for sorting)
 * Higher number = higher priority
 */
export function getRolePriority(role: MemberRole): number {
  const priorities = {
    owner: 3,
    admin: 2,
    member: 1,
  };
  return priorities[role];
}

/**
 * Sort members by role priority
 */
export function sortMembersByRole(members: OrganizationMember[]): OrganizationMember[] {
  return [...members].sort((a, b) => {
    const priorityDiff = getRolePriority(b.role) - getRolePriority(a.role);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Same role, sort by joined date
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Format date for display (dd/mm/yyyy)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format time ago (e.g., "2 hours ago")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return formatDate(dateString);
}

/**
 * Get days until expiry
 */
export function getDaysUntilExpiry(expiresAt: string): number {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// INVITATION URL HELPERS
// ============================================================================

/**
 * Generate invitation URL
 */
export function getInvitationUrl(token: string): string {
  // Use current origin or default to production URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://workbeam.app';
  
  return `${baseUrl}/invite/${token}`;
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const OrganizationErrors = {
  NO_ORGANIZATION: 'No organization found for user',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  NOT_A_MEMBER: 'User is not a member of this organization',
  MEMBER_NOT_ACTIVE: 'User membership is not active',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',
  NO_SEATS_AVAILABLE: 'No seats available. Please upgrade your plan or remove a member.',
  EMAIL_ALREADY_MEMBER: 'This email address is already a member',
  EMAIL_ALREADY_INVITED: 'This email address has already been invited',
  INVITATION_NOT_FOUND: 'Invitation not found',
  INVITATION_EXPIRED: 'This invitation has expired',
  INVITATION_ALREADY_ACCEPTED: 'This invitation has already been accepted',
  INVITATION_CANCELED: 'This invitation has been canceled',
  EMAIL_MISMATCH: 'Your email does not match the invitation email',
  CANNOT_REMOVE_OWNER: 'Cannot remove the organization owner',
  CANNOT_REMOVE_SELF: 'Cannot remove yourself. Use the leave organization option instead.',
  CANNOT_CHANGE_OWNER_ROLE: 'Cannot change the role of the organization owner',
  INVALID_ROLE: 'Invalid role specified',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_ORGANIZATION_NAME: 'Invalid organization name',
};

// ============================================================================
// MULTI-USER RESOURCE FIELDS
// ============================================================================

/**
 * Add multi-user fields to a resource
 */
export function addMultiUserFields<T>(
  resource: T,
  organizationId: string,
  userId: string,
  userName: string
): T & {
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
} {
  return {
    ...resource,
    organization_id: organizationId,
    created_by_user_id: userId,
    created_by_name: userName,
    updated_by_user_id: userId,
    updated_by_name: userName,
  };
}

/**
 * Update the "updated_by" fields on a resource
 */
export function updateModifiedFields<T extends { updated_by_user_id?: string; updated_by_name?: string }>(
  resource: T,
  userId: string,
  userName: string
): T {
  return {
    ...resource,
    updated_by_user_id: userId,
    updated_by_name: userName,
  };
}
