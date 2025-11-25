/**
 * Invite Member Screen
 * 
 * Send invitation to new team member
 * Phase 3b - Team Management UI
 */

import React, { useState } from 'react';
import { Mail, UserPlus, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useOrganizationContext } from '../../utils/organization-context';
import { usePermissions } from '../../hooks/usePermissions';
import { useAppStore } from '../../hooks/useAppStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from 'sonner@2.0.3';

export default function InviteMember() {
  const { navigate } = useAppStore();
  const { organization, inviteMember, members } = useOrganizationContext();
  const permissions = usePermissions();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [invitationSent, setInvitationSent] = useState(false);

  const availableSeats = organization
    ? organization.max_seats - organization.current_seats
    : 0;

  const validateEmail = (value: string): boolean => {
    setEmailError('');

    if (!value) {
      setEmailError('Email is required');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    // Check if email is already a member
    if (members.some((m) => m.email.toLowerCase() === value.toLowerCase())) {
      setEmailError('This email is already a team member');
      return false;
    }

    return true;
  };

  const handleSendInvitation = async () => {
    if (!validateEmail(email)) {
      return;
    }

    if (!permissions.canInviteMembers) {
      toast.error('You do not have permission to invite members');
      return;
    }

    if (availableSeats <= 0) {
      toast.error('No available seats. Upgrade your plan to invite more members.');
      return;
    }

    setLoading(true);

    const result = await inviteMember(email, role);

    setLoading(false);

    if (result.success) {
      setInvitationSent(true);
      toast.success('Invitation sent successfully!');
    } else {
      toast.error(result.error || 'Failed to send invitation');
    }
  };

  const handleDone = () => {
    navigate('team-management');
  };

  const handleInviteAnother = () => {
    setEmail('');
    setRole('member');
    setEmailError('');
    setInvitationSent(false);
  };

  if (!permissions.canInviteMembers) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: '#F9FAFB' }}>
        {/* Header */}
        <div className="px-4 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('team-management')}
              className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="trades-h1" style={{ color: '#111827' }}>Invite Member</h1>
          </div>
        </div>

        {/* Error */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">You do not have permission to invite members.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('team-management')}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="trades-h1" style={{ color: '#111827' }}>Invite Member</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-36">
        {!invitationSent ? (
          <>
            {/* Seat Availability */}
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="trades-body-sm text-muted mb-1">Available Seats</p>
                  <p className="trades-h3">{availableSeats}</p>
                </div>
                <div className="text-right">
                  <p className="trades-caption text-muted mb-1">
                    {organization?.plan.charAt(0).toUpperCase() + organization?.plan.slice(1)} Plan
                  </p>
                  <p className="trades-caption text-muted">
                    {organization?.current_seats} of {organization?.max_seats} used
                  </p>
                </div>
              </div>
            </Card>

            {availableSeats <= 0 && (
              <Card className="p-4 mb-4 bg-orange-50 border-orange-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="trades-body text-orange-900 mb-1">No seats available</p>
                    <p className="trades-body-sm text-orange-700 mb-3">
                      Upgrade your plan to invite more team members
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-600 text-orange-600"
                      onClick={() => navigate('subscription')}
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Invitation Form */}
            <div className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  onBlur={() => validateEmail(email)}
                  disabled={loading || availableSeats <= 0}
                  className={emailError ? 'border-destructive' : ''}
                />
                {emailError && (
                  <p className="trades-caption text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
                <p className="trades-caption text-muted">
                  An invitation email will be sent to this address
                </p>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label>Role</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as 'member' | 'admin')}
                  disabled={loading || availableSeats <= 0}
                >
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="member" id="role-member" className="mt-1" />
                      <div className="flex-1">
                        <Label
                          htmlFor="role-member"
                          className="trades-body cursor-pointer block mb-1"
                        >
                          Team Member
                        </Label>
                        <p className="trades-caption text-muted">
                          Can view and edit all data. Cannot manage team or organization settings.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="admin" id="role-admin" className="mt-1" />
                      <div className="flex-1">
                        <Label
                          htmlFor="role-admin"
                          className="trades-body cursor-pointer block mb-1"
                        >
                          Admin
                        </Label>
                        <p className="trades-caption text-muted">
                          Can view, edit, and delete all data. Can invite and remove team members.
                        </p>
                      </div>
                    </div>
                  </Card>
                </RadioGroup>
              </div>

              {/* Info Card */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="trades-body-sm text-blue-900 mb-1">
                      How invitations work
                    </p>
                    <ul className="trades-caption text-blue-700 space-y-1 list-disc list-inside">
                      <li>An email will be sent with an invitation link</li>
                      <li>The link is valid for 7 days</li>
                      <li>They can create an account or sign in</li>
                      <li>Once accepted, they'll have full access</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="trades-h2 mb-2 text-center">Invitation Sent!</h2>
            <p className="trades-body text-muted text-center mb-8 max-w-sm">
              An invitation email has been sent to <strong>{email}</strong>
            </p>
            <div className="space-y-3 w-full">
              <Button onClick={handleInviteAnother} variant="outline" className="w-full gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Another Member
              </Button>
              <Button onClick={handleDone} className="w-full">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Send Button - Fixed at bottom */}
      {!invitationSent && (
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <button
            onClick={handleSendInvitation}
            disabled={!email || loading || availableSeats <= 0 || !!emailError}
            className="w-full bg-blue-600 text-white py-4 rounded-xl trades-body font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Send Invitation</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
