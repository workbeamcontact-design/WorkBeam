/**
 * Accept Invitation Screen (Public)
 * 
 * Public page for accepting team invitations
 * Handles signup/login flow for invited users
 * Phase 3b - Team Management UI
 */

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../../../utils/auth-context';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { toast } from 'sonner@2.0.3';

interface InvitationData {
  organization_name: string;
  invited_by_name: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
}

interface AcceptInvitationProps {
  token: string;
}

export default function AcceptInvitation({ token }: AcceptInvitationProps) {
  const { user, signIn, signUp, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'loading' | 'signup' | 'accept' | 'mismatch' | 'success' | 'error'>('loading');
  
  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load invitation data
  useEffect(() => {
    loadInvitation();
  }, [token]);

  // Check user status after invitation loads
  useEffect(() => {
    if (invitation && !loading) {
      checkUserStatus();
    }
  }, [invitation, loading, user]);

  const loadInvitation = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API call
      // For now, using placeholder
      const projectId = window.location.hostname.split('.')[0];
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3/organization/invitation/${token}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load invitation');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Invalid invitation');
      }

      setInvitation(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
      setMode('error');
      setLoading(false);
    }
  };

  const checkUserStatus = () => {
    if (!invitation) return;

    // Check if already expired
    if (new Date(invitation.expires_at) < new Date()) {
      setError('This invitation has expired');
      setMode('error');
      return;
    }

    // Check if user is signed in
    if (!user) {
      setMode('signup');
      return;
    }

    // Check if email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      setMode('mismatch');
      return;
    }

    // User is signed in with correct email
    setMode('accept');
  };

  const handleSignUp = async () => {
    if (!invitation) return;

    // Validate
    if (!name || name.trim().length === 0) {
      toast.error('Please enter your name');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    // Create account
    const result = await signUp(invitation.email, password, name);

    if (!result.success) {
      toast.error(result.error || 'Failed to create account');
      setSubmitting(false);
      return;
    }

    // Account created, now accept invitation
    await acceptInvitation();
  };

  const acceptInvitation = async () => {
    if (!invitation || !user) return;

    try {
      setSubmitting(true);

      // TODO: Replace with actual API call
      const projectId = window.location.hostname.split('.')[0];
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-20084ff3/organization/invitation/${token}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setMode('success');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to accept invitation');
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setMode('signup');
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Can manage data, invite team members, but cannot manage billing or change roles';
      case 'member':
        return 'Can view and edit data, but cannot delete items or invite team members';
      default:
        return '';
    }
  };

  const getExpiryText = () => {
    if (!invitation) return '';
    
    const expiry = new Date(invitation.expires_at);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  // Loading state
  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-6" />
          <Skeleton className="h-10 w-full mb-3" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  // Error state
  if (mode === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="trades-h2 mb-2">Invalid Invitation</h1>
          <p className="trades-body text-muted mb-6">{error}</p>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  // Success state
  if (mode === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="trades-h2 mb-2">Welcome to the Team!</h1>
          <p className="trades-body text-muted mb-2">
            You've successfully joined <strong>{invitation?.organization_name}</strong>
          </p>
          <p className="trades-caption text-muted">
            Redirecting to dashboard...
          </p>
        </Card>
      </div>
    );
  }

  // Email mismatch state
  if (mode === 'mismatch' && invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h1 className="trades-h2 mb-2">Wrong Account</h1>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <p className="trades-body-sm text-muted mb-1">This invitation was sent to:</p>
              <p className="trades-body">{invitation.email}</p>
            </div>

            <div>
              <p className="trades-body-sm text-muted mb-1">But you're signed in as:</p>
              <p className="trades-body">{user?.email}</p>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="trades-body-sm text-orange-900 mb-2">Please:</p>
              <ul className="trades-caption text-orange-700 space-y-1 list-disc list-inside">
                <li>Sign out and create an account with {invitation.email}</li>
                <li>OR ask the sender to send a new invitation to {user?.email}</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              Sign Out
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="ghost" className="w-full">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Signup state (not signed in)
  if (mode === 'signup' && invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="trades-h2 mb-2">You're Invited!</h1>
            <p className="trades-body text-muted">
              {invitation.invited_by_name} has invited you to join
            </p>
            <p className="trades-h3 text-primary mt-2">{invitation.organization_name}</p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <p className="trades-body-sm text-blue-900 mb-2">
              As a {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}, you'll be able to:
            </p>
            <ul className="trades-caption text-blue-700 space-y-1 list-disc list-inside">
              <li>View and manage all clients</li>
              <li>Create and edit jobs</li>
              <li>Send invoices and quotes</li>
              <li>Track payments</li>
              <li>Collaborate with your team</li>
            </ul>
            <p className="trades-caption text-blue-600 mt-3 font-medium">
              {getRoleDescription(invitation.role)}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="email">Email (Locked)</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-3 mb-4">
            <Button
              onClick={handleSignUp}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Creating Account...' : 'Accept & Create Account'}
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              disabled={submitting}
              variant="outline"
              className="w-full"
            >
              Decline
            </Button>
          </div>

          <p className="trades-caption text-center text-muted">
            {getExpiryText()}
          </p>
        </Card>
      </div>
    );
  }

  // Accept state (already signed in with correct email)
  if (mode === 'accept' && invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="trades-h2 mb-2">You're Invited!</h1>
            <p className="trades-body text-muted">
              {invitation.invited_by_name} has invited you to join
            </p>
            <p className="trades-h3 text-primary mt-2">{invitation.organization_name}</p>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-6">
            <p className="trades-body-sm text-green-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Signed in as: {user?.email}
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <p className="trades-body-sm text-blue-900 mb-2">
              As a {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}, you'll be able to:
            </p>
            <ul className="trades-caption text-blue-700 space-y-1 list-disc list-inside">
              <li>View and manage all clients</li>
              <li>Create and edit jobs</li>
              <li>Send invoices and quotes</li>
              <li>Track payments</li>
              <li>Collaborate with your team</li>
            </ul>
          </div>

          <div className="space-y-3 mb-4">
            <Button
              onClick={acceptInvitation}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={() => window.location.href = '/'}
              disabled={submitting}
              variant="outline"
              className="w-full"
            >
              Decline
            </Button>
          </div>

          <p className="trades-caption text-center text-muted">
            {getExpiryText()}
          </p>
        </Card>
      </div>
    );
  }

  return null;
}
