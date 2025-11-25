/**
 * Organization Middleware for Server
 * 
 * Authentication and authorization middleware for multi-user organizations.
 * Created as part of Phase 1 - Foundation (Non-Breaking)
 * 
 * NOTE: This middleware is NOT yet active. It will be integrated in Phase 3.
 */

import { Context } from 'npm:hono@4.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

// ============================================================================
// TYPES (Inline to avoid import issues in Deno edge functions)
// ============================================================================

type MemberRole = 'owner' | 'admin' | 'member';
type MemberStatus = 'active' | 'inactive' | 'pending';
type OrganizationPlan = 'solo' | 'team' | 'business';
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
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Require user to be authenticated
 * Adds user to context as c.get('user')
 */
export async function requireAuth(c: Context, next: () => Promise<void>) {
  const token = c.req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('Auth error:', error);
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }
  
  // Add user to context
  c.set('user', user);
  c.set('accessToken', token);
  
  await next();
}

// ============================================================================
// ORGANIZATION MIDDLEWARE
// ============================================================================

/**
 * Require user to belong to an organization
 * Adds organization and membership to context:
 * - c.get('organization')
 * - c.get('membership')
 */
export async function requireOrganization(c: Context, next: () => Promise<void>) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ error: 'User not found in context' }, 500);
  }
  
  try {
    // Get user's organization ID
    const organizationId = await kv.get(`user:${user.id}:organization`);
    
    if (!organizationId) {
      return c.json({ 
        error: 'No organization found',
        code: 'NO_ORGANIZATION' 
      }, 400);
    }
    
    // Get organization
    const organization: Organization | null = await kv.get(`organization:${organizationId}`);
    
    if (!organization) {
      return c.json({ 
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND' 
      }, 404);
    }
    
    // Get membership
    const membership: OrganizationMember | null = await kv.get(
      `organization:${organizationId}:member:${user.id}`
    );
    
    if (!membership) {
      return c.json({ 
        error: 'Not a member of organization',
        code: 'NOT_A_MEMBER' 
      }, 403);
    }
    
    if (membership.status !== 'active') {
      return c.json({ 
        error: 'Membership is not active',
        code: 'MEMBER_NOT_ACTIVE',
        status: membership.status
      }, 403);
    }
    
    // Add to context
    c.set('organization', organization);
    c.set('membership', membership);
    c.set('organizationId', organizationId);
    
    await next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    return c.json({ 
      error: 'Failed to load organization',
      details: error.message 
    }, 500);
  }
}

// ============================================================================
// PERMISSION MIDDLEWARE
// ============================================================================

/**
 * Require specific role(s)
 * Usage: requireRole('owner', 'admin')
 */
export function requireRole(...allowedRoles: MemberRole[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const membership: OrganizationMember | undefined = c.get('membership');
    
    if (!membership) {
      return c.json({ error: 'Membership not found in context' }, 500);
    }
    
    if (!allowedRoles.includes(membership.role)) {
      return c.json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: membership.role,
        code: 'INSUFFICIENT_PERMISSIONS'
      }, 403);
    }
    
    await next();
  };
}

/**
 * Require owner role
 */
export const requireOwner = requireRole('owner');

/**
 * Require admin or owner role
 */
export const requireAdminOrOwner = requireRole('owner', 'admin');

// ============================================================================
// MIDDLEWARE CHAIN HELPERS
// ============================================================================

/**
 * Standard auth chain for protected endpoints
 * Ensures user is authenticated and has an organization
 */
export async function standardAuthChain(c: Context, next: () => Promise<void>) {
  // Check auth
  const authResult = await requireAuth(c, async () => {});
  if (authResult) return authResult;
  
  // Check organization
  const orgResult = await requireOrganization(c, async () => {});
  if (orgResult) return orgResult;
  
  await next();
}

// ============================================================================
// CONTEXT HELPERS
// ============================================================================

/**
 * Get authenticated user from context
 */
export function getUser(c: Context): any {
  return c.get('user');
}

/**
 * Get organization from context
 */
export function getOrganization(c: Context): Organization {
  return c.get('organization');
}

/**
 * Get membership from context
 */
export function getMembership(c: Context): OrganizationMember {
  return c.get('membership');
}

/**
 * Get organization ID from context
 */
export function getOrganizationId(c: Context): string {
  return c.get('organizationId');
}

/**
 * Get user's role from context
 */
export function getUserRole(c: Context): MemberRole {
  const membership = getMembership(c);
  return membership.role;
}

/**
 * Check if user is owner
 */
export function isOwner(c: Context): boolean {
  return getUserRole(c) === 'owner';
}

/**
 * Check if user is admin or owner
 */
export function isAdminOrOwner(c: Context): boolean {
  const role = getUserRole(c);
  return role === 'owner' || role === 'admin';
}

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Return permission error
 */
export function permissionError(c: Context, message?: string) {
  return c.json({
    error: message || 'Insufficient permissions',
    code: 'INSUFFICIENT_PERMISSIONS'
  }, 403);
}

/**
 * Return not found error
 */
export function notFoundError(c: Context, resource?: string) {
  return c.json({
    error: `${resource || 'Resource'} not found`,
    code: 'NOT_FOUND'
  }, 404);
}

/**
 * Return validation error
 */
export function validationError(c: Context, message: string, field?: string) {
  return c.json({
    error: message,
    code: 'VALIDATION_ERROR',
    field
  }, 400);
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Log middleware action
 */
export function logMiddlewareAction(
  action: string,
  userId: string,
  organizationId?: string,
  details?: any
) {
  console.log(JSON.stringify({
    type: 'middleware',
    action,
    userId,
    organizationId,
    details,
    timestamp: new Date().toISOString(),
  }));
}

// ============================================================================
// USAGE EXAMPLES (for reference)
// ============================================================================

/*
Example 1: Basic protected endpoint (requires auth + organization)

app.get('/clients', requireAuth, requireOrganization, async (c) => {
  const organization = getOrganization(c);
  const clients = await kv.get(`organization:${organization.id}:clients`);
  return c.json({ clients });
});

Example 2: Admin-only endpoint

app.delete('/client/:id', 
  requireAuth, 
  requireOrganization, 
  requireRole('owner', 'admin'),
  async (c) => {
    const clientId = c.req.param('id');
    const organization = getOrganization(c);
    await kv.delete(`organization:${organization.id}:client:${clientId}`);
    return c.json({ success: true });
  }
);

Example 3: Owner-only endpoint

app.put('/organization',
  requireAuth,
  requireOrganization,
  requireOwner,
  async (c) => {
    const organization = getOrganization(c);
    const body = await c.req.json();
    // Update organization...
    return c.json({ organization });
  }
);

Example 4: Manual permission check

app.post('/client',
  requireAuth,
  requireOrganization,
  async (c) => {
    const membership = getMembership(c);
    
    // All roles can create clients, but let's check anyway
    if (membership.status !== 'active') {
      return permissionError(c, 'Membership is not active');
    }
    
    // Create client...
    return c.json({ client });
  }
);
*/
