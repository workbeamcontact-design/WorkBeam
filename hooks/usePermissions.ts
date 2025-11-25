/**
 * Permissions Hook
 * 
 * Provides permission checking based on user's role in organization
 * Phase 3b - Team Management UI
 * 
 * This hooks integrates with the existing permissions.ts system
 */

import { useMemo } from 'react';
import { useOrganizationContext } from '../utils/organization-context';
import { getPermissions, type MemberRole } from '../utils/permissions';
import type { PermissionCheck } from '../utils/permissions';

export interface Permissions extends PermissionCheck {
  // User Info
  role: MemberRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  
  // Solo plan check
  isSoloPlan: boolean;
}

export function usePermissions(): Permissions {
  const { currentMember, organization } = useOrganizationContext();

  return useMemo(() => {
    const role = currentMember?.role || null;
    const isSoloPlan = organization?.max_seats === 1;
    
    // If no role, return empty permissions
    if (!role) {
      return {
        canViewOrganization: false,
        canEditOrganization: false,
        canViewMembers: false,
        canInviteMembers: false,
        canRemoveMember: () => false,
        canChangeRoles: false,
        canManageSubscription: false,
        canViewActivity: false,
        canViewResources: false,
        canCreateResources: false,
        canEditResources: false,
        canDeleteResources: false,
        canEditBusinessDetails: false,
        canEditBankDetails: false,
        canEditBranding: false,
        canLeaveOrganization: false,
        role: null,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        isSoloPlan,
      };
    }

    // Get permissions from existing system
    const perms = getPermissions(role);
    
    // For solo plans, limit team management features
    const teamPermissions = isSoloPlan ? {
      canViewMembers: false,
      canInviteMembers: false,
      canRemoveMember: () => false,
      canChangeRoles: false,
    } : {
      canViewMembers: perms.canViewMembers,
      canInviteMembers: perms.canInviteMembers,
      canRemoveMember: perms.canRemoveMember,
      canChangeRoles: perms.canChangeRoles,
    };

    return {
      ...perms,
      ...teamPermissions,
      role,
      isOwner: role === 'owner',
      isAdmin: role === 'admin',
      isMember: role === 'member',
      isSoloPlan,
    };
  }, [currentMember, organization]);
}

/**
 * Simple role check helper
 */
export function hasRole(
  currentRole: MemberRole | null,
  allowedRoles: MemberRole[]
): boolean {
  if (!currentRole) return false;
  return allowedRoles.includes(currentRole);
}
