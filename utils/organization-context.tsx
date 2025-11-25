/**
 * Organization Context
 * 
 * Provides organization data and team information throughout the app
 * Phase 3b - Team Management UI
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { api } from './api';

export interface OrganizationMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'suspended';
  joined_at: string;
  last_active_at: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by_name: string;
  invited_at: string;
  expires_at: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
  plan: 'solo' | 'team' | 'business';
  max_seats: number;
  current_seats: number;
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled';
  current_period_end: string | null;
  trial_end: number | null;
  created_at: string;
}

export interface OrganizationContextData {
  organization: Organization | null;
  members: OrganizationMember[];
  pendingInvitations: PendingInvitation[];
  currentMember: OrganizationMember | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  refreshOrganization: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  inviteMember: (email: string, role: 'admin' | 'member') => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, newRole: 'admin' | 'member') => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  cancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;
  resendInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;
  updateOrganizationName: (name: string) => Promise<{ success: boolean; error?: string }>;
}

const OrganizationContext = createContext<OrganizationContextData | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, sessionReady } = useAuth();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load organization data when user is ready
  useEffect(() => {
    if (sessionReady && user) {
      loadOrganizationData();
    } else {
      // Clear data when user logs out
      setOrganization(null);
      setMembers([]);
      setPendingInvitations([]);
      setCurrentMember(null);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, user]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get organization info
      const orgResponse = await api.request<Organization>('/organization/info', {
        method: 'GET',
      });

      if (!orgResponse.success || !orgResponse.data) {
        console.log('ℹ️ No organization data available yet');
        setLoading(false);
        return;
      }

      setOrganization(orgResponse.data);

      // Get members list (if multi-user plan)
      if (orgResponse.data.max_seats > 1) {
        await loadMembers();
      }

    } catch (err) {
      console.error('Error loading organization:', err);
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await api.request<{
        members: OrganizationMember[];
        pending_invitations: PendingInvitation[];
        seats_info: {
          max_seats: number;
          used_seats: number;
          available_seats: number;
          pending_invitations: number;
        };
      }>('/organization/members', {
        method: 'GET',
      });

      if (response.success && response.data) {
        setMembers(response.data.members);
        setPendingInvitations(response.data.pending_invitations);

        // Find current user's membership
        const current = response.data.members.find((m) => m.user_id === user?.id);
        setCurrentMember(current || null);
      }
    } catch (err) {
      console.error('Error loading members:', err);
    }
  };

  const refreshOrganization = async () => {
    await loadOrganizationData();
  };

  const refreshMembers = async () => {
    await loadMembers();
  };

  const inviteMember = async (email: string, role: 'admin' | 'member') => {
    try {
      const response = await api.request<{ invitation: PendingInvitation }>('/organization/invite', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });

      if (response.success) {
        // Refresh members to get updated list
        await refreshMembers();
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to send invitation' };
    } catch (err) {
      console.error('Error inviting member:', err);
      return { success: false, error: 'Failed to send invitation' };
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      const response = await api.request(`/organization/member/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.success) {
        await refreshMembers();
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to update role' };
    } catch (err) {
      console.error('Error updating role:', err);
      return { success: false, error: 'Failed to update role' };
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const response = await api.request(`/organization/member/${memberId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        await refreshMembers();
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to remove member' };
    } catch (err) {
      console.error('Error removing member:', err);
      return { success: false, error: 'Failed to remove member' };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await api.request(`/organization/invitation/${invitationId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        await refreshMembers();
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to cancel invitation' };
    } catch (err) {
      console.error('Error canceling invitation:', err);
      return { success: false, error: 'Failed to cancel invitation' };
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      const response = await api.request(`/organization/invitation/${invitationId}/resend`, {
        method: 'POST',
      });

      if (response.success) {
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to resend invitation' };
    } catch (err) {
      console.error('Error resending invitation:', err);
      return { success: false, error: 'Failed to resend invitation' };
    }
  };

  const updateOrganizationName = async (name: string) => {
    try {
      const response = await api.request<{ organization: Organization }>('/organization', {
        method: 'PUT',
        body: JSON.stringify({ name }),
      });

      if (response.success && response.data) {
        setOrganization(response.data.organization);
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to update organization name' };
    } catch (err) {
      console.error('Error updating organization:', err);
      return { success: false, error: 'Failed to update organization name' };
    }
  };

  const value: OrganizationContextData = {
    organization,
    members,
    pendingInvitations,
    currentMember,
    loading,
    error,
    refreshOrganization,
    refreshMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    resendInvitation,
    updateOrganizationName,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
}

// Re-export for convenience
export { useAuth } from './auth-context';
