/**
 * Team Management Screen
 * 
 * View and manage team members, invitations, and seat usage
 * Phase 3b - Team Management UI
 */

import React, { useState } from 'react';
import { Users, UserPlus, Mail, MoreVertical, Crown, Shield, User as UserIcon, Clock, AlertCircle, Activity } from 'lucide-react';
import { useOrganizationContext, OrganizationMember, PendingInvitation } from '../../utils/organization-context';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../hooks/useAppStore';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { ScreenLayout } from '../ui/screen-layout';
import { toast } from 'sonner@2.0.3';

export default function TeamManagement() {
  const { navigate } = useAppStore();
  const {
    organization,
    members,
    pendingInvitations,
    currentMember,
    loading,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    resendInvitation,
  } = useOrganizationContext();
  
  const permissions = usePermissions();

  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Calculate seats
  const availableSeats = organization ? organization.max_seats - organization.current_seats : 0;
  const totalPendingInvites = pendingInvitations.length;

  const handleInviteMember = () => {
    if (availableSeats <= 0 && totalPendingInvites > 0) {
      toast.error('No available seats. Cancel pending invitations or upgrade your plan.');
      return;
    }
    if (availableSeats <= 0) {
      toast.error('No available seats. Upgrade your plan to invite more members.');
      return;
    }
    navigate('invite-member');
  };

  const handleChangeRole = async (member: OrganizationMember, newRole: 'admin' | 'member') => {
    if (!permissions.canChangeRoles) {
      toast.error('You do not have permission to change roles');
      return;
    }

    if (member.role === 'owner') {
      toast.error('Cannot change the owner role');
      return;
    }

    setActionLoading(true);
    const result = await updateMemberRole(member.id, newRole);
    setActionLoading(false);

    if (result.success) {
      toast.success(`Updated ${member.name}'s role to ${newRole}`);
    } else {
      toast.error(result.error || 'Failed to update role');
    }
  };

  const confirmRemoveMember = async () => {
    if (!removingMemberId) return;

    setActionLoading(true);
    const result = await removeMember(removingMemberId);
    setActionLoading(false);
    setRemovingMemberId(null);

    if (result.success) {
      toast.success('Team member removed');
    } else {
      toast.error(result.error || 'Failed to remove member');
    }
  };

  const confirmCancelInvitation = async () => {
    if (!cancelingInvitationId) return;

    setActionLoading(true);
    const result = await cancelInvitation(cancelingInvitationId);
    setActionLoading(false);
    setCancelingInvitationId(null);

    if (result.success) {
      toast.success('Invitation canceled');
    } else {
      toast.error(result.error || 'Failed to cancel invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setActionLoading(true);
    const result = await resendInvitation(invitationId);
    setActionLoading(false);

    if (result.success) {
      toast.success('Invitation resent');
    } else {
      toast.error(result.error || 'Failed to resend invitation');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getExpiryText = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  if (loading) {
    return (
      <ScreenLayout
        title="Team"
        subtitle={`Loading...`}
        onBack={() => navigate('settings')}
      >
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </ScreenLayout>
    );
  }

  if (!organization || !permissions.canViewMembers) {
    return (
      <ScreenLayout
        title="Team"
        onBack={() => navigate('settings')}
      >
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">Team management is not available on your current plan.</p>
          </div>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title="Team"
      subtitle={`${organization.current_seats} of ${organization.max_seats} seats used`}
      onBack={() => navigate('settings')}
    >
      {/* Activity Log Card */}
      {members.length > 1 && (
        <Card className="m-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="trades-body text-blue-900 mb-0.5">Team Activity</h3>
                <p className="trades-caption text-blue-700">
                  See what your team has been working on
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('activity-log')}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                View
              </Button>
            </div>
          </Card>
        )}

        {/* Seat Usage */}
        <Card className="m-4 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="trades-body-sm">Seat Usage</span>
            <Badge variant="secondary">
              {organization.plan.charAt(0).toUpperCase() + organization.plan.slice(1)} Plan
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${(organization.current_seats / organization.max_seats) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between trades-caption text-muted">
            <span>
              {organization.current_seats} of {organization.max_seats} seats
            </span>
            {availableSeats > 0 && (
              <span className="text-green-600">{availableSeats} available</span>
            )}
            {availableSeats === 0 && (
              <span className="text-orange-600">No seats available</span>
            )}
          </div>
        </Card>

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-muted" />
              <h2 className="trades-body">Pending Invitations</h2>
              <Badge variant="secondary" className="ml-auto">
                {pendingInvitations.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="trades-body truncate">{invitation.email}</p>
                        <Badge variant="outline" className={getRoleBadgeColor(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </div>
                      <p className="trades-caption text-muted">
                        Invited by {invitation.invited_by_name}
                      </p>
                      <p className="trades-caption text-muted">
                        {getExpiryText(invitation.expires_at)}
                      </p>
                    </div>
                    {permissions.canInviteMembers && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                            Resend Invitation
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setCancelingInvitationId(invitation.id)}
                          >
                            Cancel Invitation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="px-4 pb-32">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted" />
            <h2 className="trades-body">Team Members</h2>
            <Badge variant="secondary" className="ml-auto">
              {members.length}
            </Badge>
          </div>

          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentMember?.user_id;
              const canModify = permissions.canChangeRoles && !isCurrentUser && member.role !== 'owner';
              const canRemove = permissions.canRemoveMembers && !isCurrentUser && member.role !== 'owner';

              return (
                <Card key={member.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="trades-body text-primary">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="trades-body truncate">
                          {member.name}
                          {isCurrentUser && (
                            <span className="text-muted ml-1">(You)</span>
                          )}
                        </p>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="trades-caption text-muted truncate">{member.email}</p>
                      <p className="trades-caption text-muted">
                        Joined {formatDate(member.joined_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                      {(canModify || canRemove) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canModify && (
                              <>
                                {member.role === 'admin' && (
                                  <DropdownMenuItem
                                    onClick={() => handleChangeRole(member, 'member')}
                                  >
                                    Change to Member
                                  </DropdownMenuItem>
                                )}
                                {member.role === 'member' && (
                                  <DropdownMenuItem
                                    onClick={() => handleChangeRole(member, 'admin')}
                                  >
                                    Change to Admin
                                  </DropdownMenuItem>
                                )}
                                {canRemove && <DropdownMenuSeparator />}
                              </>
                            )}
                            {canRemove && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setRemovingMemberId(member.id)}
                              >
                                Remove from Team
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Upgrade Prompt */}
        {availableSeats === 0 && (
          <div className="px-4 pb-20">
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="trades-body text-blue-900 mb-1">All seats are in use</p>
                  <p className="trades-body-sm text-blue-700 mb-3">
                    Upgrade your plan to add more team members
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-600 text-blue-600"
                    onClick={() => navigate('subscription')}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

      {/* Remove Member Dialog */}
      <AlertDialog open={!!removingMemberId} onOpenChange={(open) => !open && setRemovingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This team member will lose access to all organization data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground"
            >
              {actionLoading ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Dialog */}
      <AlertDialog
        open={!!cancelingInvitationId}
        onOpenChange={(open) => !open && setCancelingInvitationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invitation link will no longer be valid and the email recipient will not be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelInvitation} disabled={actionLoading}>
              {actionLoading ? 'Canceling...' : 'Cancel Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Member FAB */}
      {permissions.canInviteMembers && (
        <div className="absolute bottom-20 left-0 right-0 px-4 z-10">
          <button
            onClick={handleInviteMember}
            disabled={availableSeats <= 0}
            className="w-full flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            style={{
              backgroundColor: availableSeats <= 0 ? '#D1D5DB' : '#0A84FF',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              minHeight: '44px'
            }}
          >
            <UserPlus size={20} />
            <span className="trades-body">{availableSeats <= 0 ? 'No Seats Available' : 'Invite Team Member'}</span>
          </button>
        </div>
      )}
    </ScreenLayout>
  );
}
