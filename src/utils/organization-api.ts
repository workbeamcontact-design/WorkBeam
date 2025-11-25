/**
 * Organization-Scoped API Helpers
 * Phase 4: API functions for organization-scoped data operations
 * 
 * This module provides methods for CRUD operations that respect organization boundaries
 */

import { projectId, publicAnonKey } from './supabase/info';
import type { MultiUserResourceFields } from './organization-types';
import { 
  getOrgStorageKey,
  addMultiUserFields,
  validateResourceAccess,
  type MigrationContext,
} from './data-migration-helpers';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3`;

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(accessToken?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || publicAnonKey}`,
  };
}

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

export interface SaveOptions {
  organizationId: string;
  userId: string;
  userName: string;
  accessToken?: string;
}

/**
 * Save a resource (create or update) with organization scope
 */
export async function saveOrgResource<T extends Record<string, any>>(
  resource: string,
  data: T,
  options: SaveOptions
): Promise<(T & MultiUserResourceFields) | null> {
  try {
    const isUpdate = 'id' in data && data.id;
    
    // Add multi-user fields
    const enrichedData = addMultiUserFields(
      data,
      options.organizationId,
      options.userId,
      options.userName,
      isUpdate
    );
    
    // Send to backend
    const response = await fetch(`${API_BASE_URL}/org/${resource}`, {
      method: 'POST',
      headers: getAuthHeaders(options.accessToken),
      body: JSON.stringify(enrichedData),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to save ${resource}:`, error);
      return null;
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error saving ${resource}:`, error);
    return null;
  }
}

/**
 * Get a single resource by ID with organization scope
 */
export async function getOrgResource<T extends Record<string, any>>(
  resource: string,
  id: string,
  options: Omit<SaveOptions, 'userId' | 'userName'>
): Promise<(T & MultiUserResourceFields) | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/org/${resource}/${id}?organizationId=${options.organizationId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(options.accessToken),
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.text();
      console.error(`Failed to get ${resource}:`, error);
      return null;
    }
    
    const result = await response.json();
    
    // Validate access
    if (!validateResourceAccess(result, options.organizationId)) {
      console.error(`Access denied to ${resource}:`, id);
      return null;
    }
    
    return result;
  } catch (error) {
    console.error(`Error getting ${resource}:`, error);
    return null;
  }
}

/**
 * Get all resources for an organization
 */
export async function getOrgResources<T extends Record<string, any>>(
  resource: string,
  options: Omit<SaveOptions, 'userId' | 'userName'>
): Promise<(T & MultiUserResourceFields)[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/org/${resource}?organizationId=${options.organizationId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(options.accessToken),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to get ${resource} list:`, error);
      return [];
    }
    
    const results = await response.json();
    
    // Validate access for all resources
    return results.filter((item: any) => 
      validateResourceAccess(item, options.organizationId)
    );
  } catch (error) {
    console.error(`Error getting ${resource} list:`, error);
    return [];
  }
}

/**
 * Delete a resource with organization scope
 */
export async function deleteOrgResource(
  resource: string,
  id: string,
  options: Omit<SaveOptions, 'userId' | 'userName'>
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/org/${resource}/${id}?organizationId=${options.organizationId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(options.accessToken),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to delete ${resource}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting ${resource}:`, error);
    return false;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchSaveOptions extends SaveOptions {
  resources: any[];
}

/**
 * Batch save multiple resources
 */
export async function batchSaveOrgResources<T extends Record<string, any>>(
  resource: string,
  resources: T[],
  options: SaveOptions
): Promise<(T & MultiUserResourceFields)[]> {
  const results: (T & MultiUserResourceFields)[] = [];
  
  for (const item of resources) {
    const saved = await saveOrgResource(resource, item, options);
    if (saved) {
      results.push(saved);
    }
  }
  
  return results;
}

/**
 * Batch delete multiple resources
 */
export async function batchDeleteOrgResources(
  resource: string,
  ids: string[],
  options: Omit<SaveOptions, 'userId' | 'userName'>
): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];
  
  for (const id of ids) {
    const success = await deleteOrgResource(resource, id, options);
    if (success) {
      deleted.push(id);
    } else {
      failed.push(id);
    }
  }
  
  return { deleted, failed };
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Filter resources by creator
 */
export function filterByCreator<T extends MultiUserResourceFields>(
  resources: T[],
  userId: string
): T[] {
  return resources.filter(resource => resource.created_by_user_id === userId);
}

/**
 * Filter resources by last updater
 */
export function filterByUpdater<T extends MultiUserResourceFields>(
  resources: T[],
  userId: string
): T[] {
  return resources.filter(resource => resource.updated_by_user_id === userId);
}

/**
 * Sort resources by creation date (newest first)
 */
export function sortByCreatedDate<T extends { created_at: string }>(
  resources: T[],
  ascending = false
): T[] {
  return [...resources].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Sort resources by updated date (newest first)
 */
export function sortByUpdatedDate<T extends { updated_at: string }>(
  resources: T[],
  ascending = false
): T[] {
  return [...resources].sort((a, b) => {
    const dateA = new Date(a.updated_at).getTime();
    const dateB = new Date(b.updated_at).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Group resources by creator
 */
export function groupByCreator<T extends MultiUserResourceFields>(
  resources: T[]
): Record<string, T[]> {
  return resources.reduce((acc, resource) => {
    const userId = resource.created_by_user_id;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(resource);
    return acc;
  }, {} as Record<string, T[]>);
}

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

export interface ResourceStats {
  total: number;
  byCreator: Record<string, number>;
  recentlyCreated: number; // Last 7 days
  recentlyUpdated: number; // Last 7 days
}

/**
 * Get statistics for resources
 */
export function getResourceStats<T extends MultiUserResourceFields & { created_at: string; updated_at: string }>(
  resources: T[]
): ResourceStats {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const byCreator: Record<string, number> = {};
  let recentlyCreated = 0;
  let recentlyUpdated = 0;
  
  for (const resource of resources) {
    // Count by creator
    const creatorId = resource.created_by_user_id;
    byCreator[creatorId] = (byCreator[creatorId] || 0) + 1;
    
    // Count recently created
    if (new Date(resource.created_at) > sevenDaysAgo) {
      recentlyCreated++;
    }
    
    // Count recently updated
    if (new Date(resource.updated_at) > sevenDaysAgo) {
      recentlyUpdated++;
    }
  }
  
  return {
    total: resources.length,
    byCreator,
    recentlyCreated,
    recentlyUpdated,
  };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  SaveOptions,
  BatchSaveOptions,
  ResourceStats,
};
