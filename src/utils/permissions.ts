/**
 * Permission System
 * 
 * Role-based permissions for multi-user organizations.
 * Created as part of Phase 1 - Foundation (Non-Breaking)
 */

import { MemberRole } from './organization-types';

// ============================================================================
// PERMISSION INTERFACE
// ============================================================================

export interface PermissionCheck {
  // Organization
  canViewOrganization: boolean;
  canEditOrganization: boolean;
  
  // Team Management
  canViewMembers: boolean;
  canInviteMembers: boolean;
  canRemoveMember: (targetRole: MemberRole) => boolean;
  canChangeRoles: boolean;
  
  // Subscription
  canManageSubscription: boolean;
  
  // Activity Log
  canViewActivity: boolean;
  
  // Resources (Clients, Jobs, Invoices, etc.)
  canViewResources: boolean;
  canCreateResources: boolean;
  canEditResources: boolean;
  canDeleteResources: boolean;
  
  // Settings
  canEditBusinessDetails: boolean;
  canEditBankDetails: boolean;
  canEditBranding: boolean;
  
  // Account
  canLeaveOrganization: boolean;
}

// ============================================================================
// PERMISSION LOGIC
// ============================================================================

/**
 * Get permissions for a specific role
 */
export function getPermissions(userRole: MemberRole): PermissionCheck {
  return {
    // Organization - All can view, Owner+Admin can edit
    canViewOrganization: true,
    canEditOrganization: userRole === 'owner' || userRole === 'admin',
    
    // Team Management
    canViewMembers: true, // All members can see team list
    canInviteMembers: userRole === 'owner' || userRole === 'admin',
    canRemoveMember: (targetRole: MemberRole) => {
      if (userRole === 'owner') {
        // Owner can remove anyone except themselves
        return targetRole !== 'owner';
      }
      if (userRole === 'admin') {
        // Admin can only remove regular members
        return targetRole === 'member';
      }
      // Members cannot remove anyone
      return false;
    },
    canChangeRoles: userRole === 'owner', // Only owner can change roles
    
    // Subscription - Only owner
    canManageSubscription: userRole === 'owner',
    
    // Activity Log - Owner and Admin
    canViewActivity: userRole === 'owner' || userRole === 'admin',
    
    // Resources - All can view/create/edit, only Owner+Admin can delete
    canViewResources: true,
    canCreateResources: true,
    canEditResources: true,
    canDeleteResources: userRole === 'owner' || userRole === 'admin',
    
    // Settings - Owner and Admin
    canEditBusinessDetails: userRole === 'owner' || userRole === 'admin',
    canEditBankDetails: userRole === 'owner' || userRole === 'admin',
    canEditBranding: userRole === 'owner' || userRole === 'admin',
    
    // Account - Only non-owners can leave
    canLeaveOrganization: userRole !== 'owner',
  };
}

// ============================================================================
// SPECIFIC PERMISSION CHECKS
// ============================================================================

/**
 * Check if user can perform an action on a resource
 */
export function canPerformAction(
  userRole: MemberRole,
  action: 'view' | 'create' | 'edit' | 'delete'
): boolean {
  const permissions = getPermissions(userRole);
  
  switch (action) {
    case 'view':
      return permissions.canViewResources;
    case 'create':
      return permissions.canCreateResources;
    case 'edit':
      return permissions.canEditResources;
    case 'delete':
      return permissions.canDeleteResources;
    default:
      return false;
  }
}

/**
 * Check if user can invite members
 */
export function canInviteMembers(userRole: MemberRole): boolean {
  return getPermissions(userRole).canInviteMembers;
}

/**
 * Check if user can remove a specific member
 */
export function canRemoveMember(
  userRole: MemberRole,
  targetRole: MemberRole
): boolean {
  return getPermissions(userRole).canRemoveMember(targetRole);
}

/**
 * Check if user can change member roles
 */
export function canChangeRoles(userRole: MemberRole): boolean {
  return getPermissions(userRole).canChangeRoles;
}

/**
 * Check if user can manage subscription
 */
export function canManageSubscription(userRole: MemberRole): boolean {
  return getPermissions(userRole).canManageSubscription;
}

/**
 * Check if user can view activity log
 */
export function canViewActivity(userRole: MemberRole): boolean {
  return getPermissions(userRole).canViewActivity;
}

/**
 * Check if user can delete resources
 */
export function canDeleteResources(userRole: MemberRole): boolean {
  return getPermissions(userRole).canDeleteResources;
}

/**
 * Check if user can edit settings
 */
export function canEditSettings(userRole: MemberRole): boolean {
  const permissions = getPermissions(userRole);
  return permissions.canEditBusinessDetails || 
         permissions.canEditBankDetails || 
         permissions.canEditBranding;
}

/**
 * Check if user can leave organization
 */
export function canLeaveOrganization(userRole: MemberRole): boolean {
  return getPermissions(userRole).canLeaveOrganization;
}

// ============================================================================
// PERMISSION ERROR MESSAGES
// ============================================================================

export function getPermissionErrorMessage(
  userRole: MemberRole,
  action: string
): string {
  const roleName = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  
  switch (action) {
    case 'invite':
      return `${roleName}s cannot invite team members. Please ask an admin or owner.`;
    case 'remove':
      return `${roleName}s cannot remove team members. Please ask an admin or owner.`;
    case 'changeRole':
      return `Only the organization owner can change member roles.`;
    case 'manageSubscription':
      return `Only the organization owner can manage the subscription.`;
    case 'viewActivity':
      return `${roleName}s cannot view activity logs. Please ask an admin or owner.`;
    case 'delete':
      return `${roleName}s cannot delete items. Please ask an admin or owner.`;
    case 'editSettings':
      return `${roleName}s cannot edit organization settings. Please ask an admin or owner.`;
    default:
      return `You don't have permission to perform this action.`;
  }
}

// ============================================================================
// PERMISSION DESCRIPTIONS
// ============================================================================

/**
 * Get description of what a role can do
 */
export function getRoleDescription(role: MemberRole): string {
  switch (role) {
    case 'owner':
      return 'Full access to everything including billing, team management, and all data';
    case 'admin':
      return 'Can manage data, invite team members, but cannot manage billing or change roles';
    case 'member':
      return 'Can view and edit data, but cannot delete items or invite team members';
    default:
      return '';
  }
}

/**
 * Get detailed permissions list for a role
 */
export function getRolePermissionsList(role: MemberRole): string[] {
  const permissions = getPermissions(role);
  const list: string[] = [];
  
  // Always allowed
  list.push('View all clients, jobs, invoices, and quotes');
  list.push('Create and edit clients, jobs, invoices, and quotes');
  list.push('Record payments');
  list.push('View analytics');
  list.push('View team members');
  
  // Role-specific
  if (permissions.canDeleteResources) {
    list.push('Delete clients, jobs, invoices, and quotes');
  }
  
  if (permissions.canInviteMembers) {
    list.push('Invite new team members');
  }
  
  if (permissions.canRemoveMember('member')) {
    list.push('Remove team members');
  }
  
  if (permissions.canChangeRoles) {
    list.push('Change team member roles');
  }
  
  if (permissions.canEditBusinessDetails) {
    list.push('Edit business details and bank details');
  }
  
  if (permissions.canManageSubscription) {
    list.push('Manage subscription and billing');
  }
  
  if (permissions.canViewActivity) {
    list.push('View activity log');
  }
  
  return list;
}

/**
 * Get list of what a role CANNOT do
 */
export function getRoleRestrictionsList(role: MemberRole): string[] {
  const restrictions: string[] = [];
  
  if (role === 'member') {
    restrictions.push('Cannot delete clients, jobs, invoices, or quotes');
    restrictions.push('Cannot invite or remove team members');
    restrictions.push('Cannot edit business or bank details');
    restrictions.push('Cannot manage subscription');
    restrictions.push('Cannot view activity log');
  } else if (role === 'admin') {
    restrictions.push('Cannot change team member roles');
    restrictions.push('Cannot manage subscription or billing');
    restrictions.push('Cannot remove owner or other admins');
  }
  
  return restrictions;
}

// ============================================================================
// UI HELPERS
// ============================================================================

/**
 * Should show a UI element based on permissions
 */
export function shouldShowElement(
  userRole: MemberRole,
  requiredPermission: keyof PermissionCheck
): boolean {
  const permissions = getPermissions(userRole);
  const value = permissions[requiredPermission];
  
  // Handle function permissions
  if (typeof value === 'function') {
    return false; // Functions need parameters, can't auto-check
  }
  
  return Boolean(value);
}

/**
 * Get CSS class for disabled state based on permissions
 */
export function getDisabledClass(
  userRole: MemberRole,
  requiredPermission: keyof PermissionCheck
): string {
  return shouldShowElement(userRole, requiredPermission) 
    ? '' 
    : 'opacity-50 cursor-not-allowed';
}

// ============================================================================
// PERMISSION PRESETS
// ============================================================================

/**
 * Get all roles that can perform an action
 */
export function getRolesWithPermission(
  permission: keyof PermissionCheck
): MemberRole[] {
  const roles: MemberRole[] = ['owner', 'admin', 'member'];
  return roles.filter(role => {
    const perms = getPermissions(role);
    const value = perms[permission];
    return typeof value === 'boolean' ? value : false;
  });
}

/**
 * Get minimum role required for an action
 */
export function getMinimumRoleRequired(
  permission: keyof PermissionCheck
): MemberRole | null {
  if (shouldShowElement('member', permission)) return 'member';
  if (shouldShowElement('admin', permission)) return 'admin';
  if (shouldShowElement('owner', permission)) return 'owner';
  return null;
}

// ============================================================================
// EXPORT PERMISSION CONSTANTS
// ============================================================================

export const OWNER_PERMISSIONS = getPermissions('owner');
export const ADMIN_PERMISSIONS = getPermissions('admin');
export const MEMBER_PERMISSIONS = getPermissions('member');
