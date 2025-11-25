/**
 * Organization Utilities for Server
 * 
 * Server-side utilities for organization management.
 * These are duplicated from /utils/organization-helpers.ts
 * because Deno Edge Functions can't access files outside /supabase/functions/
 */

// ============================================================================
// TYPES (Minimal subset needed for server)
// ============================================================================

type OrganizationPlan = 'solo' | 'team' | 'business';
type MemberRole = 'owner' | 'admin' | 'member';
type MemberStatus = 'active' | 'inactive' | 'pending';
type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';

interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
  plan: OrganizationPlan;
  max_seats: number;
  current_seats: number;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  subscription_status: SubscriptionStatus;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  trial_end: number | null;
  created_at: string;
  updated_at: string;
  settings: {
    require_admin_approval_for_deletes: boolean;
    allow_members_to_invite: boolean;
  };
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by_user_id: string;
  invited_at: string;
  joined_at: string | null;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const SEAT_LIMITS = {
  solo: 1,
  team: 3,
  business: 6,
} as const;

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
  invitation: (orgId: string, invitationId: string) => 
    `organization:${orgId}:invitation:${invitationId}`,
  allInvitations: (orgId: string) => 
    `organization:${orgId}:invitations`,
  
  // Lookups (for fast access)
  userOrganization: (userId: string) => 
    `user:${userId}:organization`,
  emailInvitation: (email: string) => 
    `invitation:email:${email}`,
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new organization
 */
export function createOrganization(params: {
  name: string;
  owner_user_id: string;
  plan: OrganizationPlan;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: SubscriptionStatus;
  trial_end?: number | null;
}): Organization {
  const now = new Date().toISOString();
  const maxSeats = SEAT_LIMITS[params.plan];
  
  return {
    id: `org_${generateUUID()}`,
    name: params.name,
    owner_user_id: params.owner_user_id,
    plan: params.plan,
    max_seats: maxSeats,
    current_seats: 1, // Owner is the first seat
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
 * Create an owner membership
 */
export function createOwnerMembership(params: {
  organization_id: string;
  user_id: string;
  email: string;
  name: string;
}): OrganizationMember {
  const now = new Date().toISOString();
  
  return {
    id: `mem_${generateUUID()}`,
    organization_id: params.organization_id,
    user_id: params.user_id,
    email: params.email,
    name: params.name,
    role: 'owner',
    status: 'active',
    invited_by_user_id: params.user_id, // Self-invited (auto-created)
    invited_at: now,
    joined_at: now,
    last_active_at: now,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Get max seats for a plan
 */
export function getMaxSeatsForPlan(plan: OrganizationPlan): number {
  return SEAT_LIMITS[plan];
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }
  
  return { valid: true };
}

/**
 * Validate organization name
 */
export function validateOrganizationName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Organization name is required' };
  }
  
  if (name.trim().length < 2) {
    return { valid: false, error: 'Organization name must be at least 2 characters' };
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Organization name is too long (max 100 characters)' };
  }
  
  return { valid: true };
}

/**
 * Validate role
 */
export function isValidRole(role: string): role is MemberRole {
  return role === 'owner' || role === 'admin' || role === 'member';
}

/**
 * Validate plan
 */
export function isValidPlan(plan: string): plan is OrganizationPlan {
  return plan === 'solo' || plan === 'team' || plan === 'business';
}
