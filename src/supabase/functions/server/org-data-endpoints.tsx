/**
 * Organization Data Endpoints (Phase 4b)
 * 
 * Handle CRUD operations for organization-scoped business data:
 * - Clients, Jobs, Invoices, Quotes, Payments, Variations
 * - Business Details, Bank Details, Branding
 * 
 * Features:
 * - Dual-read: Try org-scope first, fall back to user-scope
 * - Lazy migration: Migrate data on first read
 * - Multi-user fields: Track who created/updated each resource
 * - Access control: Validate organization membership
 * - Backwards compatible: Preserve original user-scoped data
 * 
 * Created: 2025-11-08
 * Phase: 4b - Backend Data Isolation
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { OrganizationKeys } from './organization-utils.tsx';

const app = new Hono();

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface MultiUserFields {
  organization_id: string;
  created_by_user_id: string;
  created_by_name: string;
  updated_by_user_id: string;
  updated_by_name: string;
}

interface MigrationLog {
  timestamp: string;
  resource: string;
  from_key: string;
  to_key: string;
  count: number;
  user_id: string;
  organization_id: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(c: any) {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.log('[AUTH] No access token provided');
      return null;
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      console.log('[AUTH] Invalid token or user not found:', error?.message);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return null;
  }
}

/**
 * Get user's organization ID
 */
async function getUserOrganization(userId: string): Promise<string | null> {
  try {
    const orgId = await kv.get(OrganizationKeys.userOrganization(userId));
    return orgId;
  } catch (error) {
    console.error('[ORG] Error getting user organization:', error);
    return null;
  }
}

/**
 * Get organization membership details
 */
async function getOrganizationMembership(orgId: string, userId: string) {
  try {
    const membership = await kv.get(OrganizationKeys.member(orgId, userId));
    return membership;
  } catch (error) {
    console.error('[ORG] Error getting membership:', error);
    return null;
  }
}

/**
 * Add multi-user fields to a resource
 */
function addMultiUserFields<T extends Record<string, any>>(
  resource: T,
  organizationId: string,
  userId: string,
  userName: string,
  isUpdate = false
): T & MultiUserFields {
  const now = new Date().toISOString();
  
  if (isUpdate) {
    // For updates, preserve creator info, update modifier info
    return {
      ...resource,
      organization_id: organizationId,
      created_by_user_id: resource.created_by_user_id || userId,
      created_by_name: resource.created_by_name || userName,
      updated_by_user_id: userId,
      updated_by_name: userName,
      updated_at: now,
    };
  }
  
  // For new resources, set both creator and modifier
  return {
    ...resource,
    organization_id: organizationId,
    created_by_user_id: userId,
    created_by_name: userName,
    updated_by_user_id: userId,
    updated_by_name: userName,
    created_at: resource.created_at || now,
    updated_at: now,
  };
}

/**
 * Log migration for audit trail
 */
async function logMigration(log: MigrationLog) {
  try {
    const logKey = `migration:log:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(logKey, log);
    console.log(`[MIGRATION] Logged: ${log.resource} (${log.count} items) from user:${log.user_id} to org:${log.organization_id}`);
  } catch (error) {
    console.error('[MIGRATION] Failed to log migration:', error);
    // Don't fail the migration if logging fails
  }
}

/**
 * Migrate user-scoped data to organization-scoped
 * This is called lazily on first read
 */
async function migrateToOrgScope(
  resource: string,
  userId: string,
  userName: string,
  organizationId: string
): Promise<any[]> {
  try {
    console.log(`[MIGRATION] Starting migration for ${resource}: user:${userId} → org:${organizationId}`);
    
    // Get data from user-scoped storage
    const userPrefix = `user:${userId}:${resource}:`;
    const userData = await kv.getByPrefix(userPrefix);
    
    if (!userData || userData.length === 0) {
      console.log(`[MIGRATION] No user-scoped data found for ${resource}`);
      return [];
    }
    
    console.log(`[MIGRATION] Found ${userData.length} items in user-scoped storage`);
    
    // Add multi-user fields to each item
    const migratedData = userData.map((item: any) => 
      addMultiUserFields(item, organizationId, userId, userName, false)
    );
    
    // Save to organization-scoped storage
    const orgKey = `organization:${organizationId}:${resource}`;
    await kv.set(orgKey, migratedData);
    
    console.log(`[MIGRATION] ✅ Migrated ${migratedData.length} items to ${orgKey}`);
    
    // Log migration
    await logMigration({
      timestamp: new Date().toISOString(),
      resource,
      from_key: userPrefix,
      to_key: orgKey,
      count: migratedData.length,
      user_id: userId,
      organization_id: organizationId,
    });
    
    // IMPORTANT: Do NOT delete user-scoped data
    // Keep it as backup for rollback
    
    return migratedData;
  } catch (error) {
    console.error(`[MIGRATION] Error migrating ${resource}:`, error);
    // Return empty array on migration failure
    // The system will try to read from user-scope again next time
    return [];
  }
}

/**
 * Get organization-scoped data with dual-read fallback
 */
async function getOrgData(
  resource: string,
  organizationId: string,
  userId: string,
  userName: string
): Promise<any[]> {
  try {
    // 1. Try organization-scoped storage first (NEW)
    const orgKey = `organization:${organizationId}:${resource}`;
    let data = await kv.get(orgKey);
    
    if (data && Array.isArray(data)) {
      console.log(`[ORG-DATA] ✅ Found ${data.length} items in org-scoped storage: ${orgKey}`);
      return data;
    }
    
    // 2. Fall back to user-scoped storage (LEGACY)
    console.log(`[ORG-DATA] 📦 Falling back to user-scoped storage for ${resource}`);
    const migratedData = await migrateToOrgScope(resource, userId, userName, organizationId);
    
    return migratedData;
  } catch (error) {
    console.error(`[ORG-DATA] Error getting ${resource}:`, error);
    return [];
  }
}

/**
 * Save organization-scoped data
 */
async function saveOrgData(
  resource: string,
  item: any,
  organizationId: string,
  userId: string,
  userName: string
): Promise<any> {
  try {
    const isUpdate = !!item.id;
    
    // Add multi-user fields
    const enrichedItem = addMultiUserFields(
      item,
      organizationId,
      userId,
      userName,
      isUpdate
    );
    
    // Get all existing data
    const orgKey = `organization:${organizationId}:${resource}`;
    let allData = await kv.get(orgKey) || [];
    
    if (!Array.isArray(allData)) {
      allData = [];
    }
    
    // Update existing or add new
    if (isUpdate) {
      const index = allData.findIndex((i: any) => i.id === enrichedItem.id);
      if (index >= 0) {
        allData[index] = enrichedItem;
        console.log(`[ORG-DATA] ✏️  Updated ${resource}:${enrichedItem.id}`);
      } else {
        allData.push(enrichedItem);
        console.log(`[ORG-DATA] ➕ Added ${resource}:${enrichedItem.id} (ID existed but not found in array)`);
      }
    } else {
      // Generate ID if not present
      if (!enrichedItem.id) {
        enrichedItem.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      allData.push(enrichedItem);
      console.log(`[ORG-DATA] ➕ Created ${resource}:${enrichedItem.id}`);
    }
    
    // Save back to storage
    await kv.set(orgKey, allData);
    
    return enrichedItem;
  } catch (error) {
    console.error(`[ORG-DATA] Error saving ${resource}:`, error);
    throw error;
  }
}

/**
 * Delete organization-scoped data
 */
async function deleteOrgData(
  resource: string,
  itemId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const orgKey = `organization:${organizationId}:${resource}`;
    let allData = await kv.get(orgKey) || [];
    
    if (!Array.isArray(allData)) {
      return false;
    }
    
    const initialLength = allData.length;
    allData = allData.filter((i: any) => i.id !== itemId);
    
    if (allData.length === initialLength) {
      console.log(`[ORG-DATA] ⚠️  ${resource}:${itemId} not found for deletion`);
      return false;
    }
    
    await kv.set(orgKey, allData);
    console.log(`[ORG-DATA] 🗑️  Deleted ${resource}:${itemId}`);
    
    return true;
  } catch (error) {
    console.error(`[ORG-DATA] Error deleting ${resource}:`, error);
    return false;
  }
}

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * GET /org-data/:resource
 * Get all resources for organization
 */
app.get('/org-data/:resource', async (c) => {
  try {
    const resource = c.req.param('resource');
    
    // Authenticate user
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's organization
    const orgId = await getUserOrganization(user.id);
    if (!orgId) {
      return c.json({ error: 'No organization found. Please complete onboarding.' }, 404);
    }
    
    // Get organization membership for user name
    const membership = await getOrganizationMembership(orgId, user.id);
    const userName = membership?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    // Get data with dual-read fallback
    const data = await getOrgData(resource, orgId, user.id, userName);
    
    console.log(`[API] GET /org-data/${resource} → ${data.length} items`);
    
    return c.json({ 
      success: true,
      data,
      metadata: {
        count: data.length,
        organization_id: orgId,
      }
    });
  } catch (error) {
    console.error(`[API] Error in GET /org-data/:resource:`, error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch data' 
    }, 500);
  }
});

/**
 * GET /org-data/:resource/:id
 * Get single resource by ID
 */
app.get('/org-data/:resource/:id', async (c) => {
  try {
    const resource = c.req.param('resource');
    const id = c.req.param('id');
    
    // Authenticate user
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's organization
    const orgId = await getUserOrganization(user.id);
    if (!orgId) {
      return c.json({ error: 'No organization found' }, 404);
    }
    
    // Get organization membership for user name
    const membership = await getOrganizationMembership(orgId, user.id);
    const userName = membership?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    // Get all data
    const data = await getOrgData(resource, orgId, user.id, userName);
    
    // Find specific item
    const item = data.find((i: any) => i.id === id);
    
    if (!item) {
      return c.json({ error: 'Resource not found' }, 404);
    }
    
    // Validate access (ensure item belongs to user's org)
    if (item.organization_id && item.organization_id !== orgId) {
      console.log(`[API] ⛔ Access denied: ${resource}:${id} belongs to org:${item.organization_id}, user is in org:${orgId}`);
      return c.json({ error: 'Access denied' }, 403);
    }
    
    console.log(`[API] GET /org-data/${resource}/${id} → Found`);
    
    return c.json({ 
      success: true,
      data: item 
    });
  } catch (error) {
    console.error(`[API] Error in GET /org-data/:resource/:id:`, error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch resource' 
    }, 500);
  }
});

/**
 * POST /org-data/:resource
 * Create or update resource
 */
app.post('/org-data/:resource', async (c) => {
  try {
    const resource = c.req.param('resource');
    const body = await c.req.json();
    
    // Authenticate user
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's organization
    const orgId = await getUserOrganization(user.id);
    if (!orgId) {
      return c.json({ error: 'No organization found' }, 404);
    }
    
    // Get organization membership for user name
    const membership = await getOrganizationMembership(orgId, user.id);
    const userName = membership?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    // If updating, validate access
    if (body.id && body.organization_id && body.organization_id !== orgId) {
      console.log(`[API] ⛔ Access denied: Cannot update ${resource}:${body.id} from different organization`);
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // Save data
    const savedItem = await saveOrgData(resource, body, orgId, user.id, userName);
    
    console.log(`[API] POST /org-data/${resource} → ${body.id ? 'Updated' : 'Created'} ${savedItem.id}`);
    
    return c.json({ 
      success: true,
      data: savedItem 
    }, body.id ? 200 : 201);
  } catch (error) {
    console.error(`[API] Error in POST /org-data/:resource:`, error);
    return c.json({ 
      success: false,
      error: 'Failed to save resource' 
    }, 500);
  }
});

/**
 * DELETE /org-data/:resource/:id
 * Delete resource
 */
app.delete('/org-data/:resource/:id', async (c) => {
  try {
    const resource = c.req.param('resource');
    const id = c.req.param('id');
    
    // Authenticate user
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's organization
    const orgId = await getUserOrganization(user.id);
    if (!orgId) {
      return c.json({ error: 'No organization found' }, 404);
    }
    
    // Get organization membership for user name
    const membership = await getOrganizationMembership(orgId, user.id);
    const userName = membership?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    // Get all data to validate access
    const data = await getOrgData(resource, orgId, user.id, userName);
    const item = data.find((i: any) => i.id === id);
    
    if (!item) {
      return c.json({ error: 'Resource not found' }, 404);
    }
    
    // Validate access
    if (item.organization_id && item.organization_id !== orgId) {
      console.log(`[API] ⛔ Access denied: Cannot delete ${resource}:${id} from different organization`);
      return c.json({ error: 'Access denied' }, 403);
    }
    
    // Delete data
    const success = await deleteOrgData(resource, id, orgId);
    
    if (!success) {
      return c.json({ error: 'Failed to delete resource' }, 500);
    }
    
    console.log(`[API] DELETE /org-data/${resource}/${id} → Success`);
    
    return c.json({ 
      success: true,
      message: 'Resource deleted successfully' 
    });
  } catch (error) {
    console.error(`[API] Error in DELETE /org-data/:resource/:id:`, error);
    return c.json({ 
      success: false,
      error: 'Failed to delete resource' 
    }, 500);
  }
});

// =============================================================================
// MIGRATION UTILITIES (for manual migrations if needed)
// =============================================================================

/**
 * POST /org-data/migrate/:resource
 * Manually trigger migration for a resource
 * (For testing/troubleshooting)
 */
app.post('/org-data/migrate/:resource', async (c) => {
  try {
    const resource = c.req.param('resource');
    
    // Authenticate user
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get user's organization
    const orgId = await getUserOrganization(user.id);
    if (!orgId) {
      return c.json({ error: 'No organization found' }, 404);
    }
    
    // Get organization membership for user name
    const membership = await getOrganizationMembership(orgId, user.id);
    const userName = membership?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    
    // Trigger migration
    const migratedData = await migrateToOrgScope(resource, user.id, userName, orgId);
    
    return c.json({ 
      success: true,
      message: `Migration completed for ${resource}`,
      migrated_count: migratedData.length,
    });
  } catch (error) {
    console.error(`[API] Error in POST /org-data/migrate/:resource:`, error);
    return c.json({ 
      success: false,
      error: 'Migration failed' 
    }, 500);
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export default app;
