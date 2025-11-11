/**
 * Organization Endpoints
 * 
 * Server endpoints for organization management (Phase 2+)
 * 
 * IMPORTANT: These endpoints are NOT yet active in the main server.
 * They will be integrated in Phase 3.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import {
  generateUUID,
  createOrganization,
  createOwnerMembership,
  OrganizationKeys,
} from './organization-utils.tsx';

const app = new Hono();

// =============================================================================
// AUTO-SETUP ENDPOINT (Phase 2)
// =============================================================================

/**
 * POST /organization/auto-setup
 * 
 * Automatically create an organization for a user if they don't have one
 * Called on user login (Phase 2 JIT migration)
 */
app.post('/organization/auto-setup', async (c) => {
  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.error('Auto-setup auth error:', authError);
      return c.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, 401);
    }

    console.log(`🔍 Auto-setup check for user: ${user.id}`);

    // COMPANY EMAIL WHITELIST: Give company accounts free Business plan access
    const WHITELISTED_EMAILS = ['workbeamcontact@gmail.com'];
    const isWhitelisted = user.email && WHITELISTED_EMAILS.includes(user.email.toLowerCase());

    // Check if user already has an organization
    const existingOrgId = await kv.get(OrganizationKeys.userOrganization(user.id));

    if (existingOrgId) {
      console.log(`✅ User already has organization: ${existingOrgId}`);
      
      // Get organization details
      const organization = await kv.get(OrganizationKeys.organization(existingOrgId));
      const membership = await kv.get(OrganizationKeys.member(existingOrgId, user.id));

      console.log('📋 Organization data from KV:', JSON.stringify(organization, null, 2));
      console.log('📋 Membership data from KV:', JSON.stringify(membership, null, 2));

      if (organization && membership) {
        // Fix: Ensure organization has a name (might be missing in old data)
        if (!organization.name) {
          const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
          organization.name = `${userName}'s Business`;
          console.log(`⚠️ Organization missing name, setting to: ${organization.name}`);
          await kv.set(OrganizationKeys.organization(existingOrgId), organization);
        }

        // 🎯 UPGRADE WHITELISTED ACCOUNTS TO BUSINESS PLAN
        if (isWhitelisted && organization.plan !== 'business') {
          console.log(`🎉 Company account detected! Upgrading existing organization to Business plan (6 seats)`);
          
          const upgradedOrganization = {
            ...organization,
            plan: 'business',
            max_seats: 6,
            subscription_status: 'active',
            stripe_subscription_id: 'whitelisted_company_account',
            updated_at: new Date().toISOString(),
          };
          
          await kv.set(OrganizationKeys.organization(existingOrgId), upgradedOrganization);
          
          console.log(`✅ Organization upgraded: ${organization.name} → Business plan (6 seats)`);
          
          return c.json({
            success: true,
            data: {
              id: existingOrgId,
              name: upgradedOrganization.name,
              plan: upgradedOrganization.plan,
              max_seats: upgradedOrganization.max_seats,
              current_seats: upgradedOrganization.current_seats,
              subscription_status: upgradedOrganization.subscription_status,
              role: membership.role,
              created: false,
              upgraded: true, // Upgraded from solo/team to business
            },
          });
        }
        
        return c.json({
          success: true,
          data: {
            id: existingOrgId,
            name: organization.name,
            plan: organization.plan,
            max_seats: organization.max_seats,
            current_seats: organization.current_seats,
            subscription_status: organization.subscription_status,
            role: membership.role,
            created: false, // Already existed
          },
        });
      }
    }

    console.log(`📝 Creating new organization for user: ${user.id}`);

    // Get existing subscription data (if any)
    const subscriptionKey = `subscription:${user.id}`;
    const existingSubscription = await kv.get(subscriptionKey);

    // Determine plan from subscription
    // Default to 'solo' if no subscription
    // BUT: Give whitelisted emails Business plan for testing
    let plan: 'solo' | 'team' | 'business' = 'solo';
    
    if (isWhitelisted) {
      // Company account gets Business plan (6 seats) for free
      plan = 'business';
      console.log(`🎉 Company account detected! Granting Business plan (6 seats)`);
    } else if (existingSubscription?.plan) {
      const priceId = existingSubscription.plan;
      // Map Stripe price IDs to plans (from subscription system)
      // These are the live price IDs from the subscription system
      if (priceId === 'price_1QbCXnP6LwMXMOoMDf6u3Xul') {
        plan = 'solo'; // £24/month
      } else if (priceId === 'price_1QbCYJP6LwMXMOoM9MUvmgMy') {
        plan = 'team'; // £35/month
      } else if (priceId === 'price_1QbCYuP6LwMXMOoMgmtWjNAp') {
        plan = 'business'; // £49/month
      }
    }

    // Create organization
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const organization = createOrganization({
      name: `${userName}'s Business`,
      owner_user_id: user.id,
      plan,
      stripe_customer_id: existingSubscription?.stripe_customer_id || '',
      stripe_subscription_id: existingSubscription?.stripe_subscription_id || (isWhitelisted ? 'whitelisted_company_account' : ''),
      subscription_status: isWhitelisted ? 'active' : (existingSubscription?.status || 'trialing'),
      trial_end: existingSubscription?.trial_end || null,
    });

    // Create owner membership
    const ownerMembership = createOwnerMembership({
      organization_id: organization.id,
      user_id: user.id,
      email: user.email || '',
      name: userName,
    });

    // Save to KV store
    try {
      // Save organization
      await kv.set(OrganizationKeys.organization(organization.id), organization);

      // Save membership
      await kv.set(
        OrganizationKeys.member(organization.id, user.id),
        ownerMembership
      );

      // Save user -> organization lookup
      await kv.set(OrganizationKeys.userOrganization(user.id), organization.id);

      // Save members list
      await kv.set(OrganizationKeys.allMembers(organization.id), [user.id]);

      console.log(`✅ Organization created successfully: ${organization.id}`);
      console.log(`   Name: ${organization.name}`);
      console.log(`   Plan: ${organization.plan}`);
      console.log(`   Owner: ${user.email}`);

      return c.json({
        success: true,
        data: {
          id: organization.id,
          name: organization.name,
          plan: organization.plan,
          max_seats: organization.max_seats,
          current_seats: organization.current_seats,
          subscription_status: organization.subscription_status,
          role: 'owner',
          created: true, // Just created
        },
      });
    } catch (kvError) {
      console.error('KV storage error during org creation:', kvError);
      
      // Try to rollback (best effort)
      try {
        await kv.del(OrganizationKeys.organization(organization.id));
        await kv.del(OrganizationKeys.member(organization.id, user.id));
        await kv.del(OrganizationKeys.userOrganization(user.id));
        await kv.del(OrganizationKeys.allMembers(organization.id));
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }

      return c.json({
        success: false,
        error: 'Failed to save organization data',
      }, 500);
    }
  } catch (error) {
    console.error('Auto-setup error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, 500);
  }
});

// =============================================================================
// CHECK ENDPOINT (Phase 2)
// =============================================================================

/**
 * GET /organization/check
 * 
 * Check if user has an organization (read-only)
 */
app.get('/organization/check', async (c) => {
  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, 401);
    }

    // Check if user has organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));

    return c.json({
      success: true,
      data: {
        has_organization: !!orgId,
        organization_id: orgId || null,
      },
    });
  } catch (error) {
    console.error('Check organization error:', error);
    return c.json({
      success: false,
      error: 'Failed to check organization',
    }, 500);
  }
});

// =============================================================================
// INFO ENDPOINT (Phase 2)
// =============================================================================

/**
 * GET /organization/info
 * 
 * Get user's organization information
 */
app.get('/organization/info', async (c) => {
  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, 401);
    }

    // Get organization ID
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));

    if (!orgId) {
      return c.json({
        success: false,
        error: 'No organization found',
      }, 404);
    }

    // Get organization and membership
    const organization = await kv.get(OrganizationKeys.organization(orgId));
    const membership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!organization || !membership) {
      return c.json({
        success: false,
        error: 'Organization data not found',
      }, 404);
    }

    // Return full organization object with correct field names for frontend
    return c.json({
      success: true,
      data: {
        id: organization.id,
        name: organization.name,
        owner_user_id: organization.owner_user_id,
        plan: organization.plan,
        max_seats: organization.max_seats,
        current_seats: organization.current_seats,
        subscription_status: organization.subscription_status,
        current_period_end: organization.current_period_end,
        trial_end: organization.trial_end,
        created_at: organization.created_at,
      },
    });
  } catch (error) {
    console.error('Get organization info error:', error);
    return c.json({
      success: false,
      error: 'Failed to get organization info',
    }, 500);
  }
});

// =============================================================================
// MEMBERS LIST ENDPOINT (Phase 3b)
// =============================================================================

/**
 * GET /organization/members
 * 
 * Get list of all members and pending invitations
 */
app.get('/organization/members', async (c) => {
  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization ID
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));

    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    // Get organization
    const organization = await kv.get(OrganizationKeys.organization(orgId));
    
    if (!organization) {
      return c.json({ success: false, error: 'Organization not found' }, 404);
    }

    // Get all member IDs
    const memberIds: string[] = await kv.get(OrganizationKeys.allMembers(orgId)) || [];
    
    // Get all members
    const members = [];
    for (const memberId of memberIds) {
      const member = await kv.get(OrganizationKeys.member(orgId, memberId));
      if (member && member.status === 'active') {
        members.push(member);
      }
    }

    // Get pending invitations
    const invitationKeys = await kv.getByPrefix(`organization:${orgId}:invitation:`);
    const pendingInvitations = invitationKeys
      .filter((inv: any) => inv.status === 'pending')
      .map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invited_by_name: inv.invited_by_name,
        invited_at: inv.created_at,
        expires_at: inv.expires_at,
      }));

    return c.json({
      success: true,
      data: {
        members,
        pending_invitations: pendingInvitations,
        seats_info: {
          max_seats: organization.max_seats,
          used_seats: organization.current_seats,
          available_seats: organization.max_seats - organization.current_seats,
          pending_invitations: pendingInvitations.length,
        },
      },
    });
  } catch (error) {
    console.error('Get members error:', error);
    return c.json({ success: false, error: 'Failed to get members' }, 500);
  }
});

// =============================================================================
// INVITE MEMBER ENDPOINT (Phase 3b)
// =============================================================================

/**
 * POST /organization/invite
 * 
 * Invite a new team member
 */
app.post('/organization/invite', async (c) => {
  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    const organization = await kv.get(OrganizationKeys.organization(orgId));
    const membership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!organization || !membership) {
      return c.json({ success: false, error: 'Organization data not found' }, 404);
    }

    // Check permissions (only owner/admin can invite)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Get request body
    const body = await c.req.json();
    const { email, role } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ success: false, error: 'Invalid email address' }, 400);
    }

    // Validate role
    if (role !== 'admin' && role !== 'member') {
      return c.json({ success: false, error: 'Invalid role. Must be admin or member' }, 400);
    }

    // Check if email is already a member
    const memberIds: string[] = await kv.get(OrganizationKeys.allMembers(orgId)) || [];
    for (const memberId of memberIds) {
      const existingMember = await kv.get(OrganizationKeys.member(orgId, memberId));
      if (existingMember && existingMember.email.toLowerCase() === email.toLowerCase()) {
        return c.json({ success: false, error: 'Email is already a team member' }, 400);
      }
    }

    // Check for existing pending invitation
    const invitationKeys = await kv.getByPrefix(`organization:${orgId}:invitation:`);
    const existingInvitation = invitationKeys.find(
      (inv: any) => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
    );

    if (existingInvitation) {
      return c.json({ success: false, error: 'Email already has a pending invitation' }, 400);
    }

    // Check seat availability
    if (organization.current_seats >= organization.max_seats) {
      return c.json({ 
        success: false, 
        error: 'No available seats. Upgrade your plan to invite more members' 
      }, 400);
    }

    // Create invitation
    const invitationId = generateUUID();
    const token = generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = {
      id: invitationId,
      token,
      organization_id: orgId,
      organization_name: organization.name,
      email: email.toLowerCase(),
      role,
      invited_by_user_id: user.id,
      invited_by_name: membership.name,
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      accepted_at: null,
      canceled_at: null,
      accepted_by_user_id: null,
    };

    // Save invitation
    console.log(`📝 Saving invitation for ${email}...`);
    try {
      await kv.set(`organization:${orgId}:invitation:${invitationId}`, invitation);
      await kv.set(`invitation:token:${token}`, invitationId);
      console.log(`✅ Invitation saved to KV store`);
    } catch (kvError) {
      console.error('KV store error while saving invitation:', kvError);
      throw new Error(`Failed to save invitation: ${kvError instanceof Error ? kvError.message : 'Unknown error'}`);
    }

    // Send invitation email via Resend API
    const appUrl = Deno.env.get('APP_URL') || 'https://workbeam.app';
    const invitation_url = `${appUrl}/invite/${token}`;
    console.log(`📧 Preparing to send invitation email to: ${email}`);
    console.log(`   Invitation URL: ${invitation_url}`);
    
    try {
      console.log(`   Importing email utilities...`);
      const { sendEmail, createTeamInvitationEmail } = await import('./email-utils.tsx');
      
      console.log(`   Creating email HTML...`);
      const emailHtml = createTeamInvitationEmail(
        membership.name,
        organization.name,
        role,
        invitation_url
      );
      
      console.log(`   Sending email via Resend API...`);
      await sendEmail({
        to: email,
        subject: `${membership.name} invited you to join ${organization.name} on WorkBeam`,
        html: emailHtml,
      });
      
      console.log(`✅ Invitation email sent successfully to: ${email}`);
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      console.error('   Error details:', emailError instanceof Error ? emailError.message : String(emailError));
      console.error('   RESEND_API_KEY present:', !!Deno.env.get('RESEND_API_KEY'));
      // Don't fail the invitation if email fails - invitation still created
      console.log('⚠️  Continuing without email - invitation still valid');
    }
    
    console.log(`✅ Invitation process completed: ${email} as ${role}`);

    return c.json({
      success: true,
      data: {
        invitation: {
          id: invitationId,
          email: invitation.email,
          role: invitation.role,
          token,
          invitation_url,
          expires_at: invitation.expires_at,
        },
      },
    });
  } catch (error) {
    console.error('❌ Invite member error:', error);
    console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
    return c.json({ 
      success: false, 
      error: errorMessage,
      details: error instanceof Error ? error.message : undefined
    }, 500);
  }
});

// =============================================================================
// UPDATE ORGANIZATION ENDPOINT (Phase 3b)
// =============================================================================

/**
 * PUT /organization
 * 
 * Update organization details (name, etc.)
 */
app.put('/organization', async (c) => {
  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    const organization = await kv.get(OrganizationKeys.organization(orgId));
    const membership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!organization || !membership) {
      return c.json({ success: false, error: 'Organization data not found' }, 404);
    }

    // Check permissions (only owner/admin can update)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Get request body
    const body = await c.req.json();
    const { name } = body;

    // Validate name
    if (!name || name.trim().length === 0) {
      return c.json({ success: false, error: 'Organization name is required' }, 400);
    }

    if (name.length > 100) {
      return c.json({ success: false, error: 'Organization name too long (max 100 characters)' }, 400);
    }

    // Update organization
    const updatedOrganization = {
      ...organization,
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(OrganizationKeys.organization(orgId), updatedOrganization);

    console.log(`✅ Organization updated: ${updatedOrganization.name}`);

    return c.json({
      success: true,
      data: {
        organization: updatedOrganization,
      },
    });
  } catch (error) {
    console.error('Update organization error:', error);
    return c.json({ success: false, error: 'Failed to update organization' }, 500);
  }
});

// =============================================================================
// UPDATE MEMBER ROLE ENDPOINT (Phase 3b)
// =============================================================================

/**
 * PUT /organization/member/:memberId/role
 * 
 * Update a member's role
 */
app.put('/organization/member/:memberId/role', async (c) => {
  try {
    const memberId = c.req.param('memberId');
    
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    const currentMembership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!currentMembership) {
      return c.json({ success: false, error: 'Membership not found' }, 404);
    }

    // Check permissions (only owner can change roles)
    if (currentMembership.role !== 'owner') {
      return c.json({ success: false, error: 'Only owner can change roles' }, 403);
    }

    // Get target member
    const targetMember = await kv.get(OrganizationKeys.member(orgId, memberId));

    if (!targetMember) {
      return c.json({ success: false, error: 'Member not found' }, 404);
    }

    // Cannot change owner role
    if (targetMember.role === 'owner') {
      return c.json({ success: false, error: 'Cannot change owner role' }, 400);
    }

    // Get request body
    const body = await c.req.json();
    const { role } = body;

    // Validate role
    if (role !== 'admin' && role !== 'member') {
      return c.json({ success: false, error: 'Invalid role. Must be admin or member' }, 400);
    }

    // Update member
    const updatedMember = {
      ...targetMember,
      role,
      updated_at: new Date().toISOString(),
    };

    await kv.set(OrganizationKeys.member(orgId, memberId), updatedMember);

    console.log(`✅ Member role updated: ${targetMember.email} → ${role}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Update member role error:', error);
    return c.json({ success: false, error: 'Failed to update member role' }, 500);
  }
});

// =============================================================================
// REMOVE MEMBER ENDPOINT (Phase 3b)
// =============================================================================

/**
 * DELETE /organization/member/:memberId
 * 
 * Remove a member from organization
 */
app.delete('/organization/member/:memberId', async (c) => {
  try {
    const memberId = c.req.param('memberId');
    
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    const organization = await kv.get(OrganizationKeys.organization(orgId));
    const currentMembership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!organization || !currentMembership) {
      return c.json({ success: false, error: 'Organization data not found' }, 404);
    }

    // Check permissions (only owner/admin can remove)
    if (currentMembership.role !== 'owner' && currentMembership.role !== 'admin') {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Get target member
    const targetMember = await kv.get(OrganizationKeys.member(orgId, memberId));

    if (!targetMember) {
      return c.json({ success: false, error: 'Member not found' }, 404);
    }

    // Cannot remove owner
    if (targetMember.role === 'owner') {
      return c.json({ success: false, error: 'Cannot remove owner' }, 400);
    }

    // Admin can only remove members, not other admins
    if (currentMembership.role === 'admin' && targetMember.role === 'admin') {
      return c.json({ success: false, error: 'Admins cannot remove other admins' }, 403);
    }

    // Update member status to removed
    const updatedMember = {
      ...targetMember,
      status: 'removed',
      updated_at: new Date().toISOString(),
    };

    await kv.set(OrganizationKeys.member(orgId, memberId), updatedMember);

    // Remove from active members list
    const memberIds: string[] = await kv.get(OrganizationKeys.allMembers(orgId)) || [];
    const updatedMemberIds = memberIds.filter(id => id !== memberId);
    await kv.set(OrganizationKeys.allMembers(orgId), updatedMemberIds);

    // Remove user -> organization lookup
    await kv.del(OrganizationKeys.userOrganization(memberId));

    // Update organization seat count
    const updatedOrganization = {
      ...organization,
      current_seats: Math.max(0, organization.current_seats - 1),
      updated_at: new Date().toISOString(),
    };
    await kv.set(OrganizationKeys.organization(orgId), updatedOrganization);

    console.log(`✅ Member removed: ${targetMember.email}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return c.json({ success: false, error: 'Failed to remove member' }, 500);
  }
});

// =============================================================================
// CANCEL INVITATION ENDPOINT (Phase 3b)
// =============================================================================

/**
 * DELETE /organization/invitation/:invitationId
 * 
 * Cancel a pending invitation
 */
app.delete('/organization/invitation/:invitationId', async (c) => {
  try {
    const invitationId = c.req.param('invitationId');
    
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    const membership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!membership) {
      return c.json({ success: false, error: 'Membership not found' }, 404);
    }

    // Check permissions (only owner/admin can cancel)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Get invitation
    const invitation = await kv.get(`organization:${orgId}:invitation:${invitationId}`);

    if (!invitation) {
      return c.json({ success: false, error: 'Invitation not found' }, 404);
    }

    if (invitation.status !== 'pending') {
      return c.json({ success: false, error: 'Invitation is not pending' }, 400);
    }

    // Update invitation status
    const updatedInvitation = {
      ...invitation,
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    };

    await kv.set(`organization:${orgId}:invitation:${invitationId}`, updatedInvitation);

    console.log(`✅ Invitation canceled: ${invitation.email}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    return c.json({ success: false, error: 'Failed to cancel invitation' }, 500);
  }
});

// =============================================================================
// RESEND INVITATION ENDPOINT (Phase 3b)
// =============================================================================

/**
 * POST /organization/invitation/:invitationId/resend
 * 
 * Resend an invitation email
 */
app.post('/organization/invitation/:invitationId/resend', async (c) => {
  try {
    const invitationId = c.req.param('invitationId');
    
    // Authenticate user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Get organization
    const orgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (!orgId) {
      return c.json({ success: false, error: 'No organization found' }, 404);
    }

    const membership = await kv.get(OrganizationKeys.member(orgId, user.id));

    if (!membership) {
      return c.json({ success: false, error: 'Membership not found' }, 404);
    }

    // Check permissions (only owner/admin can resend)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return c.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Get invitation
    const invitation = await kv.get(`organization:${orgId}:invitation:${invitationId}`);

    if (!invitation) {
      return c.json({ success: false, error: 'Invitation not found' }, 404);
    }

    if (invitation.status !== 'pending') {
      return c.json({ success: false, error: 'Invitation is not pending' }, 400);
    }

    // Get organization for email
    const organization = await kv.get(OrganizationKeys.organization(orgId));
    
    if (!organization) {
      return c.json({ success: false, error: 'Organization not found' }, 404);
    }

    // Resend invitation email via Resend API
    const invitation_url = `${Deno.env.get('APP_URL') || 'https://workbeam.app'}/invite/${invitation.token}`;
    
    try {
      const { sendEmail, createTeamInvitationEmail } = await import('./email-utils.tsx');
      const emailHtml = createTeamInvitationEmail(
        membership.name,
        organization.name,
        invitation.role,
        invitation_url
      );
      
      await sendEmail({
        to: invitation.email,
        subject: `Reminder: ${membership.name} invited you to join ${organization.name} on WorkBeam`,
        html: emailHtml,
      });
      
      console.log(`✅ Invitation email resent to: ${invitation.email}`);
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError);
      return c.json({ success: false, error: 'Failed to send email' }, 500);
    }
    
    console.log(`✅ Invitation resent: ${invitation.email}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Resend invitation error:', error);
    return c.json({ success: false, error: 'Failed to resend invitation' }, 500);
  }
});

// =============================================================================
// GET INVITATION (PUBLIC) - Phase 3b
// =============================================================================

/**
 * GET /organization/invitation/:token
 * 
 * Get invitation details by token (public endpoint)
 */
app.get('/organization/invitation/:token', async (c) => {
  try {
    const token = c.req.param('token');

    // Get invitation ID from token
    const invitationId = await kv.get(`invitation:token:${token}`);

    if (!invitationId) {
      return c.json({ success: false, error: 'Invitation not found' }, 404);
    }

    // Get all invitations and find the one matching
    const allInvitations = await kv.getByPrefix('organization:');
    const invitation = allInvitations.find((inv: any) => inv.id === invitationId);

    if (!invitation) {
      return c.json({ success: false, error: 'Invitation not found' }, 404);
    }

    // Check status
    if (invitation.status !== 'pending') {
      return c.json({ success: false, error: 'Invitation is no longer valid' }, 400);
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return c.json({ success: false, error: 'Invitation has expired' }, 400);
    }

    // Return public invitation data
    return c.json({
      success: true,
      data: {
        organization_name: invitation.organization_name,
        invited_by_name: invitation.invited_by_name,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return c.json({ success: false, error: 'Failed to get invitation' }, 500);
  }
});

// =============================================================================
// ACCEPT INVITATION (PUBLIC) - Phase 3b
// =============================================================================

/**
 * POST /organization/invitation/:token/accept
 * 
 * Accept an invitation and join organization
 */
app.post('/organization/invitation/:token/accept', async (c) => {
  try {
    const token = c.req.param('token');

    // Authenticate user (required to accept)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return c.json({ success: false, error: 'Must be signed in to accept invitation' }, 401);
    }

    // Get invitation ID from token
    const invitationId = await kv.get(`invitation:token:${token}`);

    if (!invitationId) {
      return c.json({ success: false, error: 'Invitation not found' }, 404);
    }

    // Get all invitations and find the one matching
    const allInvitations = await kv.getByPrefix('organization:');
    const invitation = allInvitations.find((inv: any) => inv.id === invitationId);

    if (!invitation) {
      return c.json({ success: false, error: 'Invitation not found' }, 404);
    }

    // Validate invitation
    if (invitation.status !== 'pending') {
      return c.json({ success: false, error: 'Invitation already used or canceled' }, 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return c.json({ success: false, error: 'Invitation has expired' }, 400);
    }

    // Validate email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return c.json({ 
        success: false, 
        error: 'Email does not match invitation' 
      }, 400);
    }

    // Check if user already has an organization
    const existingOrgId = await kv.get(OrganizationKeys.userOrganization(user.id));
    if (existingOrgId) {
      return c.json({
        success: false,
        error: 'You already belong to an organization. Please contact support to switch organizations.',
      }, 400);
    }

    // Get organization
    const orgId = invitation.organization_id;
    const organization = await kv.get(OrganizationKeys.organization(orgId));

    if (!organization) {
      return c.json({ success: false, error: 'Organization not found' }, 404);
    }

    // Check seat availability
    if (organization.current_seats >= organization.max_seats) {
      return c.json({ 
        success: false, 
        error: 'No available seats in organization' 
      }, 400);
    }

    // Create membership
    const now = new Date().toISOString();
    const membershipId = generateUUID();
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

    const newMembership = {
      id: membershipId,
      organization_id: orgId,
      user_id: user.id,
      email: user.email || '',
      name: userName,
      role: invitation.role,
      status: 'active',
      invited_by_user_id: invitation.invited_by_user_id,
      invited_at: invitation.created_at,
      joined_at: now,
      last_active_at: now,
      created_at: now,
      updated_at: now,
    };

    // Save membership
    await kv.set(OrganizationKeys.member(orgId, user.id), newMembership);

    // Add to members list
    const memberIds: string[] = await kv.get(OrganizationKeys.allMembers(orgId)) || [];
    memberIds.push(user.id);
    await kv.set(OrganizationKeys.allMembers(orgId), memberIds);

    // Set user -> organization lookup
    await kv.set(OrganizationKeys.userOrganization(user.id), orgId);

    // Update organization seat count
    const updatedOrganization = {
      ...organization,
      current_seats: organization.current_seats + 1,
      updated_at: now,
    };
    await kv.set(OrganizationKeys.organization(orgId), updatedOrganization);

    // Update invitation status
    const updatedInvitation = {
      ...invitation,
      status: 'accepted',
      accepted_at: now,
      accepted_by_user_id: user.id,
    };
    await kv.set(`organization:${orgId}:invitation:${invitationId}`, updatedInvitation);

    console.log(`✅ Invitation accepted: ${user.email} joined ${organization.name}`);

    return c.json({
      success: true,
      data: {
        organization_id: orgId,
        organization_name: organization.name,
        role: newMembership.role,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return c.json({ success: false, error: 'Failed to accept invitation' }, 500);
  }
});

// Export the Hono app (will be integrated in Phase 3)
export default app;
