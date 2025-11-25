/**
 * Auto-Organization Setup
 * 
 * Automatically creates an organization for existing users on their first login
 * after Phase 2 deployment.
 * 
 * This is part of Phase 2 - Just-In-Time (JIT) organization creation.
 * 
 * IMPORTANT: This is NOT yet active. It will be integrated in Phase 3.
 */

import { api } from './api';

// Feature flag - can be toggled to disable auto-creation if needed
const ENABLE_AUTO_ORG_CREATION = true; // ✅ ENABLED in Phase 3

// Log feature flag status for monitoring
if (ENABLE_AUTO_ORG_CREATION) {
  console.log('🏢 [Phase 3] Organization auto-creation is ENABLED');
}

/**
 * Check if user has an organization, and create one if they don't
 * 
 * Called by auth context after successful login
 * 
 * @param user - The authenticated user
 * @returns Organization info or null
 */
export async function ensureUserHasOrganization(user: {
  id: string;
  email?: string;
  user_metadata?: { name?: string };
}): Promise<{
  organization_id: string;
  organization_name: string;
  role: 'owner';
} | null> {
  // Feature flag check
  if (!ENABLE_AUTO_ORG_CREATION) {
    console.log('🔧 Auto-organization creation is disabled (Phase 2 not yet active)');
    return null;
  }

  try {
    console.log('🔍 Checking if user has organization...');
    
    // Call server endpoint to check/create organization
    const response = await api.request<{
      id: string;
      name: string;
      plan: 'solo' | 'team' | 'business';
      max_seats: number;
      current_seats: number;
      subscription_status: string;
      role: 'owner';
      created: boolean;
      upgraded?: boolean;
    }>('/organization/auto-setup', {
      method: 'POST',
      body: {},
    });

    // 🔍 DEBUG: Log full response
    console.log('🔍 Auto-setup response:', JSON.stringify(response, null, 2));
    
    // Handle 401 Unauthorized errors silently (user not logged in or session expired)
    if (!response.success && response.error?.includes('Unauthorized')) {
      console.log('ℹ️ User not authenticated, skipping organization setup');
      return null;
    }

    if (response.success && response.data) {
      if (response.data.created) {
        console.log('✅ Organization created:', response.data.name);
      } else if (response.data.upgraded) {
        console.log('✅ Organization upgraded:', response.data.name, '→', response.data.plan);
      } else {
        console.log('✅ Organization exists:', response.data.name);
      }

      // 🔍 DEBUG: Check if name is missing
      if (!response.data.name) {
        console.warn('⚠️ WARNING: Organization name is missing from response!', response.data);
      }

      return {
        organization_id: response.data.id,
        organization_name: response.data.name,
        role: 'owner',
      };
    } else {
      console.error('❌ Failed to ensure organization:', response.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Error in ensureUserHasOrganization:', error);
    
    // Don't block login if org creation fails
    // User can try again next time
    return null;
  }
}

/**
 * Check if user has organization (read-only check)
 * 
 * @returns true if user has organization, false otherwise
 */
export async function hasOrganization(): Promise<boolean> {
  // Feature flag check
  if (!ENABLE_AUTO_ORG_CREATION) {
    return false;
  }

  try {
    const response = await api.request<{ has_organization: boolean }>('/organization/check', {
      method: 'GET',
    });

    return response.success && response.data?.has_organization === true;
  } catch (error) {
    console.error('Error checking organization:', error);
    return false;
  }
}

/**
 * Get user's organization info
 * 
 * @returns Organization info or null
 */
export async function getUserOrganization(): Promise<{
  organization_id: string;
  organization_name: string;
  role: 'owner' | 'admin' | 'member';
  plan: 'solo' | 'team' | 'business';
  max_seats: number;
  current_seats: number;
} | null> {
  // Feature flag check
  if (!ENABLE_AUTO_ORG_CREATION) {
    return null;
  }

  try {
    const response = await api.request<{
      id: string;
      name: string;
      role: 'owner' | 'admin' | 'member';
      plan: 'solo' | 'team' | 'business';
      max_seats: number;
      current_seats: number;
    }>('/organization/info', {
      method: 'GET',
    });

    if (response.success && response.data) {
      return {
        organization_id: response.data.id,
        organization_name: response.data.name,
        role: response.data.role,
        plan: response.data.plan,
        max_seats: response.data.max_seats,
        current_seats: response.data.current_seats,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting organization:', error);
    return null;
  }
}

/**
 * Manually trigger organization creation (for testing)
 * 
 * @returns Success status
 */
export async function createOrganizationManually(): Promise<boolean> {
  try {
    const response = await api.request('/organization/auto-setup', {
      method: 'POST',
      body: {},
    });

    return response.success === true;
  } catch (error) {
    console.error('Error creating organization manually:', error);
    return false;
  }
}

// Export feature flag for testing
export { ENABLE_AUTO_ORG_CREATION };
