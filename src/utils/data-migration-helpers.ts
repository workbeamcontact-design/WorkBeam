/**
 * Data Migration Helpers
 * Phase 4: Helper functions for migrating data from user-scoped to organization-scoped
 * 
 * IMPORTANT: These helpers preserve backwards compatibility during migration
 */

import type { MultiUserResourceFields } from './organization-types';

// ============================================================================
// STORAGE KEY HELPERS
// ============================================================================

/**
 * Generate organization-scoped storage key
 * NEW format: organization:{orgId}:{resource}:{id}
 */
export function getOrgStorageKey(
  organizationId: string,
  resource: string,
  id?: string
): string {
  if (id) {
    return `organization:${organizationId}:${resource}:${id}`;
  }
  return `organization:${organizationId}:${resource}`;
}

/**
 * Generate user-scoped storage key (LEGACY)
 * OLD format: user:{userId}:{resource}:{id}
 */
export function getUserStorageKey(
  userId: string,
  resource: string,
  id?: string
): string {
  if (id) {
    return `user:${userId}:${resource}:${id}`;
  }
  return `user:${userId}:${resource}`;
}

/**
 * Extract organization ID from org-scoped key
 * Example: "organization:org123:clients:client456" -> "org123"
 */
export function extractOrgIdFromKey(key: string): string | null {
  const match = key.match(/^organization:([^:]+):/);
  return match ? match[1] : null;
}

/**
 * Extract user ID from user-scoped key (LEGACY)
 * Example: "user:user123:clients:client456" -> "user123"
 */
export function extractUserIdFromKey(key: string): string | null {
  const match = key.match(/^user:([^:]+):/);
  return match ? match[1] : null;
}

/**
 * Check if key is organization-scoped
 */
export function isOrgScopedKey(key: string): boolean {
  return key.startsWith('organization:');
}

/**
 * Check if key is user-scoped (LEGACY)
 */
export function isUserScopedKey(key: string): boolean {
  return key.startsWith('user:');
}

// ============================================================================
// MULTI-USER FIELD HELPERS
// ============================================================================

/**
 * Add multi-user fields to a resource
 */
export function addMultiUserFields<T extends Record<string, any>>(
  resource: T,
  organizationId: string,
  userId: string,
  userName: string,
  isUpdate = false
): T & MultiUserResourceFields {
  const now = new Date().toISOString();
  
  if (isUpdate) {
    // For updates, only update the "updated_by" fields
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
  
  // For new resources, set both "created_by" and "updated_by"
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
 * Remove multi-user fields (for backwards compatibility)
 */
export function removeMultiUserFields<T extends Record<string, any>>(
  resource: T & Partial<MultiUserResourceFields>
): Omit<T, keyof MultiUserResourceFields> {
  const {
    organization_id,
    created_by_user_id,
    created_by_name,
    updated_by_user_id,
    updated_by_name,
    ...rest
  } = resource;
  
  return rest as Omit<T, keyof MultiUserResourceFields>;
}

/**
 * Check if resource has multi-user fields
 */
export function hasMultiUserFields(resource: any): resource is MultiUserResourceFields {
  return (
    resource &&
    typeof resource === 'object' &&
    'organization_id' in resource &&
    'created_by_user_id' in resource &&
    'created_by_name' in resource &&
    'updated_by_user_id' in resource &&
    'updated_by_name' in resource
  );
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export interface MigrationContext {
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Migrate a single resource from user-scoped to org-scoped
 */
export function migrateResourceToOrg<T extends Record<string, any>>(
  resource: T,
  context: MigrationContext
): T & MultiUserResourceFields {
  // If already has multi-user fields, preserve them
  if (hasMultiUserFields(resource)) {
    return {
      ...resource,
      organization_id: context.organizationId, // Ensure org ID is correct
    };
  }
  
  // Add multi-user fields
  return addMultiUserFields(
    resource,
    context.organizationId,
    context.userId,
    context.userName,
    false // Not an update, this is initial migration
  );
}

/**
 * Batch migrate resources from user-scoped to org-scoped
 */
export function batchMigrateResources<T extends Record<string, any>>(
  resources: T[],
  context: MigrationContext
): (T & MultiUserResourceFields)[] {
  return resources.map(resource => migrateResourceToOrg(resource, context));
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate multi-user fields are present and valid
 */
export function validateMultiUserFields(
  resource: any
): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (!resource.organization_id) {
    errors.push({ field: 'organization_id', message: 'Organization ID is required' });
  }
  
  if (!resource.created_by_user_id) {
    errors.push({ field: 'created_by_user_id', message: 'Creator user ID is required' });
  }
  
  if (!resource.created_by_name) {
    errors.push({ field: 'created_by_name', message: 'Creator name is required' });
  }
  
  if (!resource.updated_by_user_id) {
    errors.push({ field: 'updated_by_user_id', message: 'Updater user ID is required' });
  }
  
  if (!resource.updated_by_name) {
    errors.push({ field: 'updated_by_name', message: 'Updater name is required' });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user has access to resource (belongs to same org)
 */
export function validateResourceAccess(
  resource: any,
  userOrganizationId: string
): boolean {
  if (!hasMultiUserFields(resource)) {
    console.warn('Resource missing multi-user fields, allowing access (migration mode)');
    return true; // During migration, allow access to old data
  }
  
  return resource.organization_id === userOrganizationId;
}

// ============================================================================
// BACKWARDS COMPATIBILITY HELPERS
// ============================================================================

/**
 * Try to load resource from both org-scoped and user-scoped keys
 * This ensures backwards compatibility during migration
 */
export function getDualScopedKey(
  organizationId: string | null,
  userId: string,
  resource: string,
  id?: string
): { primary: string; fallback: string } {
  return {
    primary: organizationId 
      ? getOrgStorageKey(organizationId, resource, id)
      : getUserStorageKey(userId, resource, id),
    fallback: getUserStorageKey(userId, resource, id),
  };
}

/**
 * Resource migration status
 */
export interface MigrationStatus {
  total: number;
  migrated: number;
  pending: number;
  errors: number;
  errorDetails: Array<{ id: string; error: string }>;
}

/**
 * Create empty migration status
 */
export function createMigrationStatus(): MigrationStatus {
  return {
    total: 0,
    migrated: 0,
    pending: 0,
    errors: 0,
    errorDetails: [],
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Format creator/updater display text
 */
export function formatCreatorText(
  createdByName: string,
  createdAt: string
): string {
  const date = new Date(createdAt);
  const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
  return `Created by ${createdByName} on ${formattedDate}`;
}

/**
 * Format last updated display text
 */
export function formatUpdaterText(
  updatedByName: string,
  updatedAt: string
): string {
  const date = new Date(updatedAt);
  const formattedDate = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
  const formattedTime = date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  return `Last updated by ${updatedByName} on ${formattedDate} at ${formattedTime}`;
}

/**
 * Get relative time text (e.g., "2 hours ago")
 */
export function getRelativeTimeText(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-GB'); // Fall back to date
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  MigrationContext,
  ValidationError,
  MigrationStatus,
};
