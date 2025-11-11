import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import { sendEmail, generateOTP, createPasswordResetEmail } from './email-utils.tsx';
import organizationEndpoints from './organization-endpoints.tsx';
import orgDataEndpoints from './org-data-endpoints.tsx';

const app = new Hono();

// Enable CORS and logging
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger(console.log));

// Health check
app.get('/make-server-20084ff3/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    environment: 'production'
  });
});

// =============================================================================
// ORGANIZATION API (Phase 3)
// =============================================================================

// Mount organization endpoints
app.route('/make-server-20084ff3', organizationEndpoints);

console.log('✅ Organization endpoints mounted (Phase 3)');

// =============================================================================
// ORGANIZATION DATA API (Phase 4b)
// =============================================================================

// Mount organization data endpoints
app.route('/make-server-20084ff3', orgDataEndpoints);

console.log('✅ Organization data endpoints mounted (Phase 4b)');

// =============================================================================
// STRIPE SUBSCRIPTION API
// =============================================================================

// Stripe SDK
import Stripe from 'npm:stripe@17.4.0';

// Initialize Stripe with secret key
const getStripe = () => {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });
};

// Get subscription status for a user
app.get('/make-server-20084ff3/subscription/status', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.log('Subscription status check: No access token provided');
      return c.json({ success: false, error: 'Unauthorized - No token provided' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      console.log('Subscription status check: Invalid token or user not found', error?.message);
      return c.json({ success: false, error: 'Unauthorized - Invalid token' }, 401);
    }

    console.log('Checking subscription for user:', user.id);

    // Get subscription from KV store
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription) {
      return c.json({
        success: true,
        data: {
          active: false,
          status: 'none',
          trial_end: null,
          current_period_end: null
        }
      });
    }

    return c.json({
      success: true,
      data: {
        active: subscription.status === 'active' || subscription.status === 'trialing',
        status: subscription.status,
        trial_end: subscription.trial_end,
        current_period_end: subscription.current_period_end,
        plan: subscription.plan,
        cancel_at_period_end: subscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.log('Error fetching subscription status:', error);
    return c.json({ success: false, error: 'Failed to fetch subscription status' }, 500);
  }
});

// Create Stripe Checkout Session
app.post('/make-server-20084ff3/subscription/create-checkout', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      return c.json({ 
        success: false, 
        error: 'priceId, successUrl, and cancelUrl are required' 
      }, 400);
    }

    const stripe = getStripe();

    // Check if customer already exists
    const subscriptionKey = `subscription:${user.id}`;
    const existingSubscription = await kv.get(subscriptionKey);
    
    let customerId = existingSubscription?.stripe_customer_id;

    // Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      customerId = customer.id;
    }

    // Create Checkout Session with 14-day free trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          supabase_user_id: user.id
        }
      },
      metadata: {
        supabase_user_id: user.id
      },
      // Allow promotion codes (optional - for future discount codes)
      allow_promotion_codes: true,
    });

    return c.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.log('Error creating checkout session:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create checkout session' 
    }, 500);
  }
});

// Create Stripe Customer Portal Session
app.post('/make-server-20084ff3/subscription/create-portal', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { returnUrl } = body;

    if (!returnUrl) {
      return c.json({ success: false, error: 'returnUrl is required' }, 400);
    }

    // Get customer ID from subscription
    const subscriptionKey = `subscription:${user.id}`;
    const subscription = await kv.get(subscriptionKey);

    if (!subscription?.stripe_customer_id) {
      return c.json({ 
        success: false, 
        error: 'No active subscription found' 
      }, 404);
    }

    const stripe = getStripe();

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    return c.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    console.log('Error creating portal session:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create portal session' 
    }, 500);
  }
});

// Stripe Webhook Handler
app.post('/make-server-20084ff3/subscription/webhook', async (c) => {
  try {
    const stripe = getStripe();
    const signature = c.req.header('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return c.json({ success: false, error: 'Missing signature or webhook secret' }, 400);
    }

    const body = await c.req.text();
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.log('Webhook signature verification failed:', err);
      return c.json({ success: false, error: 'Invalid signature' }, 400);
    }

    console.log('Processing Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await updateSubscriptionInKV(userId, subscription, session.customer as string);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        
        if (userId) {
          await updateSubscriptionInKV(userId, subscription, subscription.customer as string);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;
        
        if (userId) {
          await updateSubscriptionInKV(userId, subscription, subscription.customer as string);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);
        // Subscription will be updated via subscription.updated event
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
        // Subscription status will be updated via subscription.updated event
        break;
      }
    }

    return c.json({ success: true, received: true });
  } catch (error) {
    console.log('Webhook handler error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Webhook handler failed' 
    }, 500);
  }
});

// Helper function to update subscription in KV store
async function updateSubscriptionInKV(
  userId: string, 
  subscription: Stripe.Subscription,
  customerId: string
) {
  const subscriptionKey = `subscription:${userId}`;
  
  const subscriptionData = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    plan: subscription.items.data[0]?.price.id || null,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at,
    trial_end: subscription.trial_end,
    updated_at: new Date().toISOString()
  };

  await kv.set(subscriptionKey, subscriptionData);
  console.log('Updated subscription in KV for user:', userId, 'Status:', subscription.status);
}

// =============================================================================
// AUTHENTICATION API
// =============================================================================

// Sign up new user
app.post('/make-server-20084ff3/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return c.json({ 
        success: false, 
        error: 'Email, password, and name are required' 
      }, 400);
    }

    if (password.length < 8) {
      return c.json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      }, 400);
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create user with admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ 
        success: false, 
        error: error.message || 'Failed to create account' 
      }, 400);
    }

    return c.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      }
    }, 201);
  } catch (error) {
    console.log('Signup exception:', error);
    return c.json({ 
      success: false, 
      error: 'An unexpected error occurred during signup' 
    }, 500);
  }
});

// Request password reset OTP
app.post('/make-server-20084ff3/auth/request-password-reset', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
      return c.json({ 
        success: false, 
        error: 'Email is required' 
      }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ 
        success: false, 
        error: 'Invalid email address' 
      }, 400);
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user exists
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error checking user existence:', userError);
      // Don't reveal whether user exists or not for security
      return c.json({ 
        success: true,
        message: 'If an account exists with this email, you will receive a verification code.'
      });
    }

    const userExists = users.users.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!userExists) {
      // Don't reveal that user doesn't exist for security
      console.log('Password reset requested for non-existent email:', email);
      return c.json({ 
        success: true,
        message: 'If an account exists with this email, you will receive a verification code.'
      });
    }

    // Generate 6-digit OTP
    const otpCode = generateOTP();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes from now

    // Store OTP in KV store with expiration
    const otpKey = `password_reset_otp:${email.toLowerCase()}`;
    await kv.set(otpKey, {
      code: otpCode,
      email: email.toLowerCase(),
      expiresAt,
      createdAt: Date.now(),
      attempts: 0
    });

    // Send email with OTP
    try {
      await sendEmail({
        to: email,
        subject: 'Reset Your WorkBeam Password - Verification Code',
        html: createPasswordResetEmail(otpCode)
      });

      console.log('Password reset OTP sent to:', email);

      return c.json({ 
        success: true,
        message: 'Verification code sent to your email address. Please check your inbox.'
      });
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError);
      
      // Clean up OTP if email fails
      await kv.del(otpKey);
      
      return c.json({ 
        success: false, 
        error: 'Failed to send verification email. Please try again later.' 
      }, 500);
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    return c.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, 500);
  }
});

// Verify OTP code
app.post('/make-server-20084ff3/auth/verify-reset-code', async (c) => {
  try {
    const body = await c.req.json();
    const { email, code } = body;

    if (!email || !code) {
      return c.json({ 
        success: false, 
        error: 'Email and verification code are required' 
      }, 400);
    }

    const otpKey = `password_reset_otp:${email.toLowerCase()}`;
    const otpData = await kv.get(otpKey);

    if (!otpData) {
      return c.json({ 
        success: false, 
        error: 'Invalid or expired verification code' 
      }, 400);
    }

    // Check if expired
    if (Date.now() > otpData.expiresAt) {
      await kv.del(otpKey);
      return c.json({ 
        success: false, 
        error: 'Verification code has expired. Please request a new one.' 
      }, 400);
    }

    // Check attempts (max 5 attempts)
    if (otpData.attempts >= 5) {
      await kv.del(otpKey);
      return c.json({ 
        success: false, 
        error: 'Too many failed attempts. Please request a new verification code.' 
      }, 400);
    }

    // Verify code
    if (otpData.code !== code) {
      // Increment attempts
      await kv.set(otpKey, {
        ...otpData,
        attempts: otpData.attempts + 1
      });

      return c.json({ 
        success: false, 
        error: 'Invalid verification code. Please try again.' 
      }, 400);
    }

    // Code is valid - mark as verified
    await kv.set(otpKey, {
      ...otpData,
      verified: true,
      verifiedAt: Date.now()
    });

    return c.json({ 
      success: true,
      message: 'Verification code confirmed. You can now reset your password.'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return c.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, 500);
  }
});

// Reset password with verified OTP
app.post('/make-server-20084ff3/auth/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return c.json({ 
        success: false, 
        error: 'Email, verification code, and new password are required' 
      }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      }, 400);
    }

    const otpKey = `password_reset_otp:${email.toLowerCase()}`;
    const otpData = await kv.get(otpKey);

    if (!otpData) {
      return c.json({ 
        success: false, 
        error: 'Invalid or expired verification code' 
      }, 400);
    }

    // Check if verified
    if (!otpData.verified) {
      return c.json({ 
        success: false, 
        error: 'Verification code has not been verified' 
      }, 400);
    }

    // Check if expired
    if (Date.now() > otpData.expiresAt) {
      await kv.del(otpKey);
      return c.json({ 
        success: false, 
        error: 'Verification code has expired. Please request a new one.' 
      }, 400);
    }

    // Verify code again
    if (otpData.code !== code) {
      return c.json({ 
        success: false, 
        error: 'Invalid verification code' 
      }, 400);
    }

    // Create Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user by email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return c.json({ 
        success: false, 
        error: 'Failed to reset password. Please try again.' 
      }, 500);
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return c.json({ 
        success: false, 
        error: 'User not found' 
      }, 404);
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return c.json({ 
        success: false, 
        error: 'Failed to reset password. Please try again.' 
      }, 500);
    }

    // Delete OTP after successful password reset
    await kv.del(otpKey);

    console.log('Password reset successful for:', email);

    return c.json({ 
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return c.json({ 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }, 500);
  }
});

// =============================================================================
// AUTHENTICATION HELPER
// =============================================================================

// Helper function to get authenticated user from request
async function getAuthenticatedUser(c: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  
  if (!accessToken) {
    return null;
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

// =============================================================================
// CLIENTS API (WITH USER ISOLATION)
// =============================================================================

// Get all clients for authenticated user
app.get('/make-server-20084ff3/clients', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get clients with user-specific prefix
    const clients = await kv.getByPrefix(`user:${user.id}:client:`);
    return c.json({ clients: clients || [] });
  } catch (error) {
    console.log('Error fetching clients:', error);
    return c.json({ error: 'Failed to fetch clients' }, 500);
  }
});

// Get single client for authenticated user
app.get('/make-server-20084ff3/clients/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const client = await kv.get(`user:${user.id}:client:${id}`);
    
    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }
    
    return c.json({ client });
  } catch (error) {
    console.log('Error fetching client:', error);
    return c.json({ error: 'Failed to fetch client' }, 500);
  }
});

// Create new client for authenticated user
app.post('/make-server-20084ff3/clients', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const client = {
      id: clientId,
      userId: user.id, // Track owner
      name: body.name,
      email: body.email || '',
      phone: body.phone || '',
      address: body.address || '',
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:client:${clientId}`, client);
    
    return c.json({ client }, 201);
  } catch (error) {
    console.log('Error creating client:', error);
    return c.json({ error: 'Failed to create client' }, 500);
  }
});

// Update client for authenticated user
app.put('/make-server-20084ff3/clients/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingClient = await kv.get(`user:${user.id}:client:${id}`);
    if (!existingClient) {
      return c.json({ error: 'Client not found' }, 404);
    }
    
    const updatedClient = {
      ...existingClient,
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:client:${id}`, updatedClient);
    
    return c.json({ client: updatedClient });
  } catch (error) {
    console.log('Error updating client:', error);
    return c.json({ error: 'Failed to update client' }, 500);
  }
});

// Delete client for authenticated user
app.delete('/make-server-20084ff3/clients/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    
    const existingClient = await kv.get(`user:${user.id}:client:${id}`);
    if (!existingClient) {
      return c.json({ error: 'Client not found' }, 404);
    }
    
    // Delete client
    await kv.del(`user:${user.id}:client:${id}`);
    
    // Delete related jobs
    const allJobs = await kv.getByPrefix(`user:${user.id}:job:`);
    const clientJobs = (allJobs || []).filter((job: any) => job.clientId === id);
    for (const job of clientJobs) {
      await kv.del(`user:${user.id}:job:${job.id}`);
    }
    
    // Delete related quotes
    const allQuotes = await kv.getByPrefix(`user:${user.id}:quote:`);
    const clientQuotes = (allQuotes || []).filter((quote: any) => quote.clientId === id);
    for (const quote of clientQuotes) {
      await kv.del(`user:${user.id}:quote:${quote.id}`);
    }
    
    // Delete related invoices
    const allInvoices = await kv.getByPrefix(`user:${user.id}:invoice:`);
    const clientInvoices = (allInvoices || []).filter((invoice: any) => invoice.clientId === id);
    for (const invoice of clientInvoices) {
      await kv.del(`user:${user.id}:invoice:${invoice.id}`);
    }
    
    // Delete related payments
    const allPayments = await kv.getByPrefix(`user:${user.id}:payment:`);
    const clientPayments = (allPayments || []).filter((payment: any) => payment.clientId === id);
    for (const payment of clientPayments) {
      await kv.del(`user:${user.id}:payment:${payment.id}`);
    }
    
    // Delete related bookings
    const allBookings = await kv.getByPrefix(`user:${user.id}:booking:`);
    const clientBookings = (allBookings || []).filter((booking: any) => booking.clientId === id);
    for (const booking of clientBookings) {
      await kv.del(`user:${user.id}:booking:${booking.id}`);
    }
    
    console.log(`Deleted client ${id} and ${clientJobs.length} jobs, ${clientQuotes.length} quotes, ${clientInvoices.length} invoices, ${clientPayments.length} payments, ${clientBookings.length} bookings`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting client:', error);
    return c.json({ error: 'Failed to delete client' }, 500);
  }
});

// =============================================================================
// JOBS API (WITH USER ISOLATION)
// =============================================================================

// Get all jobs for authenticated user
app.get('/make-server-20084ff3/jobs', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log(`📋 Fetching jobs for user: ${user.id}`);
    const jobs = await kv.getByPrefix(`user:${user.id}:job:`);
    console.log(`✅ Found ${jobs?.length || 0} jobs with new key format`);
    
    // MIGRATION REMOVED: Old format jobs should no longer exist
    // All jobs are now stored with user-scoped keys: user:${userId}:job:${jobId}
    // Any old format jobs (job:*) are orphaned and should be ignored
    
    return c.json({ jobs: jobs || [] });
  } catch (error) {
    console.log('Error fetching jobs:', error);
    return c.json({ error: 'Failed to fetch jobs' }, 500);
  }
});

// Get jobs for specific client (authenticated user only)
app.get('/make-server-20084ff3/clients/:clientId/jobs', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const clientId = c.req.param('clientId');
    const allJobs = await kv.getByPrefix(`user:${user.id}:job:`);
    const clientJobs = (allJobs || []).filter((job: any) => job.clientId === clientId);
    
    return c.json({ jobs: clientJobs });
  } catch (error) {
    console.log('Error fetching client jobs:', error);
    return c.json({ error: 'Failed to fetch client jobs' }, 500);
  }
});

// Get single job for authenticated user
app.get('/make-server-20084ff3/jobs/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const jobKey = `user:${user.id}:job:${id}`;
    console.log(`🔍 Looking for job with key: ${jobKey}`);
    
    const job = await kv.get(jobKey);
    
    if (!job) {
      console.log(`❌ Job not found with key: ${jobKey}`);
      return c.json({ error: 'Job not found' }, 404);
    }
    
    console.log(`✅ Job found: ${job.title || 'Untitled'}`);
    return c.json({ job });
  } catch (error) {
    console.log('Error fetching job:', error);
    return c.json({ error: 'Failed to fetch job' }, 500);
  }
});

// Create new job for authenticated user
app.post('/make-server-20084ff3/jobs', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      userId: user.id,
      clientId: body.clientId,
      title: body.title,
      description: body.description || '',
      address: body.address || '',
      status: body.status || 'quote_pending',
      priority: body.priority || 'medium',
      estimatedDuration: body.estimatedDuration || '',
      estimatedValue: body.estimatedValue || 0,
      materials: body.materials || [],
      labour: body.labour || [],
      notes: body.notes || '',
      // VAT configuration - preserve from frontend
      vatEnabled: body.vatEnabled,
      vatRate: body.vatRate,
      // Calculated amounts - preserve for reference
      subtotal: body.subtotal,
      vatAmount: body.vatAmount,
      total: body.total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:job:${jobId}`, job);
    
    return c.json({ job }, 201);
  } catch (error) {
    console.log('Error creating job:', error);
    return c.json({ error: 'Failed to create job' }, 500);
  }
});

// Update job for authenticated user
app.put('/make-server-20084ff3/jobs/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingJob = await kv.get(`user:${user.id}:job:${id}`);
    if (!existingJob) {
      return c.json({ error: 'Job not found' }, 404);
    }
    
    const updatedJob = {
      ...existingJob,
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:job:${id}`, updatedJob);
    
    return c.json({ job: updatedJob });
  } catch (error) {
    console.log('Error updating job:', error);
    return c.json({ error: 'Failed to update job' }, 500);
  }
});

// Delete job
app.delete('/make-server-20084ff3/jobs/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    
    const existingJob = await kv.get(`user:${user.id}:job:${id}`);
    if (!existingJob) {
      return c.json({ error: 'Job not found' }, 404);
    }
    
    // Delete job (new format)
    await kv.del(`user:${user.id}:job:${id}`);
    
    // ALSO delete old format job if it exists (prevents re-migration)
    await kv.del(`job:${id}`);
    
    // Delete related invoices (user-scoped)
    const allInvoices = await kv.getByPrefix(`user:${user.id}:invoice:`);
    const jobInvoices = (allInvoices || []).filter((invoice: any) => invoice.jobId === id);
    for (const invoice of jobInvoices) {
      await kv.del(`user:${user.id}:invoice:${invoice.id}`);
    }
    
    // Delete related payments (for job invoices) (user-scoped)
    const allPayments = await kv.getByPrefix(`user:${user.id}:payment:`);
    const jobPayments = (allPayments || []).filter((payment: any) => payment.jobId === id);
    for (const payment of jobPayments) {
      await kv.del(`user:${user.id}:payment:${payment.id}`);
    }
    
    // Delete related bookings (user-scoped)
    const allBookings = await kv.getByPrefix(`user:${user.id}:booking:`);
    const jobBookings = (allBookings || []).filter((booking: any) => booking.jobId === id);
    for (const booking of jobBookings) {
      await kv.del(`user:${user.id}:booking:${booking.id}`);
    }
    
    // SIMPLIFIED: Delete related quotes when job is deleted (user-scoped)
    const allQuotes = await kv.getByPrefix(`user:${user.id}:quote:`);
    const relatedQuotes = (allQuotes || []).filter((quote: any) => 
      quote.jobId === id || quote.convertedJobId === id
    );
    
    let deletedQuotes = 0;
    for (const quote of relatedQuotes) {
      await kv.del(`user:${user.id}:quote:${quote.id}`);
      deletedQuotes++;
      console.log(`Deleted related quote ${quote.id} (${quote.number}) for job ${id}`);
    }
    
    console.log(`Deleted job ${id} and ${jobInvoices.length} invoices, ${jobPayments.length} payments, ${jobBookings.length} bookings, and ${deletedQuotes} quotes`);
    
    return c.json({ 
      success: true, 
      message: 'Job deleted successfully',
      details: {
        invoicesDeleted: jobInvoices.length,
        paymentsDeleted: jobPayments.length,
        bookingsDeleted: jobBookings.length,
        quotesDeleted: deletedQuotes
      }
    });
  } catch (error) {
    console.log('Error deleting job:', error);
    return c.json({ error: 'Failed to delete job' }, 500);
  }
});

// Cleanup endpoint: Remove all orphaned old-format data
// This removes old-format keys that were created before user isolation was implemented
// Call this once to clean up the database after deploying the fix
app.post('/make-server-20084ff3/cleanup-orphaned-data', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log(`🧹 Starting cleanup of ALL orphaned old-format data...`);
    
    const cleanupResults = {
      jobs: 0,
      quotes: 0,
      invoices: 0,
      clients: 0,
      bookings: 0,
      payments: 0
    };
    
    // Clean up old format jobs (job:*)
    const oldJobs = await kv.getByPrefix('job:');
    if (oldJobs && oldJobs.length > 0) {
      console.log(`🔍 Found ${oldJobs.length} old-format job(s)`);
      for (const oldJob of oldJobs) {
        await kv.del(`job:${oldJob.id}`);
        cleanupResults.jobs++;
        console.log(`🗑️ Deleted orphaned job: job:${oldJob.id}`);
      }
    }
    
    // Clean up old format quotes (quote:*)
    const oldQuotes = await kv.getByPrefix('quote:');
    if (oldQuotes && oldQuotes.length > 0) {
      console.log(`🔍 Found ${oldQuotes.length} old-format quote(s)`);
      for (const oldQuote of oldQuotes) {
        await kv.del(`quote:${oldQuote.id}`);
        cleanupResults.quotes++;
        console.log(`🗑️ Deleted orphaned quote: quote:${oldQuote.id}`);
      }
    }
    
    // Clean up old format invoices (invoice:*)
    const oldInvoices = await kv.getByPrefix('invoice:');
    if (oldInvoices && oldInvoices.length > 0) {
      console.log(`🔍 Found ${oldInvoices.length} old-format invoice(s)`);
      for (const oldInvoice of oldInvoices) {
        await kv.del(`invoice:${oldInvoice.id}`);
        cleanupResults.invoices++;
        console.log(`🗑️ Deleted orphaned invoice: invoice:${oldInvoice.id}`);
      }
    }
    
    // Clean up old format clients (client:*)
    const oldClients = await kv.getByPrefix('client:');
    if (oldClients && oldClients.length > 0) {
      console.log(`🔍 Found ${oldClients.length} old-format client(s)`);
      for (const oldClient of oldClients) {
        await kv.del(`client:${oldClient.id}`);
        cleanupResults.clients++;
        console.log(`🗑️ Deleted orphaned client: client:${oldClient.id}`);
      }
    }
    
    // Clean up old format bookings (booking:*)
    const oldBookings = await kv.getByPrefix('booking:');
    if (oldBookings && oldBookings.length > 0) {
      console.log(`🔍 Found ${oldBookings.length} old-format booking(s)`);
      for (const oldBooking of oldBookings) {
        await kv.del(`booking:${oldBooking.id}`);
        cleanupResults.bookings++;
        console.log(`🗑️ Deleted orphaned booking: booking:${oldBooking.id}`);
      }
    }
    
    // Clean up old format payments (payment:*)
    const oldPayments = await kv.getByPrefix('payment:');
    if (oldPayments && oldPayments.length > 0) {
      console.log(`🔍 Found ${oldPayments.length} old-format payment(s)`);
      for (const oldPayment of oldPayments) {
        await kv.del(`payment:${oldPayment.id}`);
        cleanupResults.payments++;
        console.log(`🗑️ Deleted orphaned payment: payment:${oldPayment.id}`);
      }
    }
    
    const totalDeleted = Object.values(cleanupResults).reduce((sum, count) => sum + count, 0);
    
    console.log(`✅ Cleanup complete: Deleted ${totalDeleted} orphaned item(s)`);
    console.log(`📊 Breakdown:`, cleanupResults);
    
    return c.json({ 
      success: true, 
      message: `Cleaned up ${totalDeleted} orphaned item(s)`,
      deleted: totalDeleted,
      breakdown: cleanupResults
    });
  } catch (error) {
    console.log('Error cleaning up orphaned data:', error);
    return c.json({ error: 'Failed to clean up orphaned data' }, 500);
  }
});

// =============================================================================
// INVOICES API (WITH USER ISOLATION)
// =============================================================================

// Get all invoices for authenticated user
app.get('/make-server-20084ff3/invoices', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const invoices = await kv.getByPrefix(`user:${user.id}:invoice:`);
    return c.json({ invoices: invoices || [] });
  } catch (error) {
    console.log('Error fetching invoices:', error);
    return c.json({ error: 'Failed to fetch invoices' }, 500);
  }
});

// Get invoices for specific job (authenticated user only)
app.get('/make-server-20084ff3/jobs/:jobId/invoices', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const jobId = c.req.param('jobId');
    const allInvoices = await kv.getByPrefix(`user:${user.id}:invoice:`);
    const jobInvoices = (allInvoices || []).filter((inv: any) => inv.jobId === jobId);
    
    return c.json({ invoices: jobInvoices });
  } catch (error) {
    console.log('Error fetching job invoices:', error);
    return c.json({ error: 'Failed to fetch job invoices' }, 500);
  }
});

// Get single invoice for authenticated user
app.get('/make-server-20084ff3/invoices/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const invoiceData = await kv.get(`user:${user.id}:invoice:${id}`);
    
    if (!invoiceData) {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    
    return c.json({ invoice: invoiceData });
  } catch (error) {
    console.log('Error fetching invoice:', error);
    return c.json({ error: 'Failed to fetch invoice' }, 500);
  }
});

// Create new invoice for authenticated user
app.post('/make-server-20084ff3/invoices', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const invoiceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate invoice number (scoped to user)
    const allInvoices = await kv.getByPrefix(`user:${user.id}:invoice:`);
    const invoiceCount = (allInvoices || []).length + 1;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${invoiceCount.toString().padStart(4, '0')}`;
    
    const newInvoice = {
      id: invoiceId,
      userId: user.id,
      number: invoiceNumber,
      jobId: body.jobId,
      clientId: body.clientId,
      status: 'draft',
      issueDate: body.issueDate || new Date().toLocaleDateString('en-GB'),
      dueDate: body.dueDate,
      lineItems: body.lineItems || [],
      subtotal: body.subtotal || 0,
      vatAmount: body.vatAmount || 0,
      total: body.total || 0,
      vatEnabled: body.vatEnabled || true,
      paymentTerms: body.paymentTerms || 'Payment due within 30 days',
      notes: body.notes || '',
      // CRITICAL FIX: Store invoice type information
      billType: body.billType || 'remaining', // deposit, remaining, selected, custom
      type: body.type || body.billType || 'remaining', // For backward compatibility
      description: body.description || '',
      // Store additional deposit-specific fields
      isDepositInvoice: body.billType === 'deposit' || body.is_deposit_invoice,
      projectTotal: body.project_total,
      depositAmount: body.deposit_amount,
      remainingBalance: body.remaining_balance,
      // CRITICAL: Store templateData and selectedTemplate for perfect invoice regeneration
      templateData: body.templateData,
      selectedTemplate: body.selectedTemplate || 'classic',
      // Store all other fields from body (for flexibility)
      ...Object.fromEntries(
        Object.entries(body).filter(([key]) => 
          !['id', 'userId', 'number', 'jobId', 'clientId', 'status', 'issueDate', 'dueDate', 
            'lineItems', 'subtotal', 'vatAmount', 'total', 'vatEnabled',
            'paymentTerms', 'notes', 'billType', 'type', 'description', 'isDepositInvoice',
            'projectTotal', 'depositAmount', 'remainingBalance', 'templateData', 'selectedTemplate'].includes(key)
        )
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:invoice:${invoiceId}`, newInvoice);
    
    return c.json({ invoice: newInvoice }, 201);
  } catch (error) {
    console.log('Error creating invoice:', error);
    return c.json({ error: 'Failed to create invoice' }, 500);
  }
});

// Update invoice for authenticated user
app.put('/make-server-20084ff3/invoices/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingInvoice = await kv.get(`user:${user.id}:invoice:${id}`);
    if (!existingInvoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    
    const updatedInvoice = {
      ...existingInvoice,
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:invoice:${id}`, updatedInvoice);
    
    return c.json({ invoice: updatedInvoice });
  } catch (error) {
    console.log('Error updating invoice:', error);
    return c.json({ error: 'Failed to update invoice' }, 500);
  }
});

// =============================================================================
// PAYMENTS API (WITH USER ISOLATION)
// =============================================================================

// Get all payments for authenticated user
app.get('/make-server-20084ff3/payments', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const payments = await kv.getByPrefix(`user:${user.id}:payment:`);
    return c.json({ payments: payments || [] });
  } catch (error) {
    console.log('Error fetching payments:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
});

// Get payments for invoice (authenticated user only)
app.get('/make-server-20084ff3/invoices/:invoiceId/payments', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const invoiceId = c.req.param('invoiceId');
    const allPayments = await kv.getByPrefix(`user:${user.id}:payment:`);
    const invoicePayments = (allPayments || []).filter((payment: any) => payment.invoiceId === invoiceId);
    
    return c.json({ payments: invoicePayments });
  } catch (error) {
    console.log('Error fetching invoice payments:', error);
    return c.json({ error: 'Failed to fetch invoice payments' }, 500);
  }
});

// Record new payment for authenticated user
app.post('/make-server-20084ff3/payments', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const paymentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get invoice and job details
    const invoiceData = await kv.get(`user:${user.id}:invoice:${body.invoiceId}`);
    if (!invoiceData) {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    
    const payment = {
      id: paymentId,
      userId: user.id,
      invoiceId: body.invoiceId,
      jobId: invoiceData.jobId,
      clientId: invoiceData.clientId,
      amount: body.amount,
      method: body.method,
      reference: body.reference || '',
      date: body.date || new Date().toLocaleDateString('en-GB'),
      notes: body.notes || '',
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:payment:${paymentId}`, payment);
    
    // Update invoice status and amountPaid based on total payments
    const allPayments = await kv.getByPrefix(`user:${user.id}:payment:`);
    const invoicePayments = (allPayments || []).filter((p: any) => p.invoiceId === body.invoiceId);
    const totalPaid = invoicePayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    const now = new Date();
    let newStatus = invoiceData.status;
    
    if (totalPaid >= invoiceData.total) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'part-paid';
    }
    
    const updatedInvoiceData = {
      ...invoiceData,
      status: newStatus,
      amountPaid: totalPaid,
      // Set payment date for both full and partial payments
      paidAt: (newStatus === 'paid' || newStatus === 'partial') ? now.toLocaleDateString('en-GB') : null,
      paidAtISO: (newStatus === 'paid' || newStatus === 'partial') ? now.toISOString() : null,
      updatedAt: now.toISOString()
    };
    
    await kv.set(`user:${user.id}:invoice:${body.invoiceId}`, updatedInvoiceData);
    console.log(`Invoice ${body.invoiceId} updated: status=${newStatus}, amountPaid=${totalPaid}, total=${invoiceData.total}`);
    
    return c.json({ payment }, 201);
  } catch (error) {
    console.log('Error recording payment:', error);
    return c.json({ error: 'Failed to record payment' }, 500);
  }
});

// =============================================================================
// BOOKINGS/CALENDAR API
// =============================================================================

// Get all bookings for authenticated user
app.get('/make-server-20084ff3/bookings', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const bookings = await kv.getByPrefix(`user:${user.id}:booking:`);
    return c.json({ bookings: bookings || [] });
  } catch (error) {
    console.log('Error fetching bookings:', error);
    return c.json({ error: 'Failed to fetch bookings' }, 500);
  }
});

// Create new booking for authenticated user
app.post('/make-server-20084ff3/bookings', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const bookingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const booking = {
      id: bookingId,
      userId: user.id,
      clientId: body.clientId || null,
      jobId: body.jobId || null,
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      type: body.type || 'appointment',
      status: body.status || 'scheduled',
      address: body.address || '',
      notes: body.notes || '',
      isAllDay: body.isAllDay || false,
      // Lead information fields
      clientName: body.clientName || null,
      clientPhone: body.clientPhone || null,
      isLead: body.isLead || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('Creating booking:', JSON.stringify(booking, null, 2));
    
    await kv.set(`user:${user.id}:booking:${bookingId}`, booking);
    
    return c.json({ booking }, 201);
  } catch (error) {
    console.log('Error creating booking:', error);
    return c.json({ error: 'Failed to create booking' }, 500);
  }
});

// Update booking for authenticated user
app.put('/make-server-20084ff3/bookings/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingBooking = await kv.get(`user:${user.id}:booking:${id}`);
    if (!existingBooking) {
      return c.json({ error: 'Booking not found' }, 404);
    }
    
    const updatedBooking = {
      ...existingBooking,
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:booking:${id}`, updatedBooking);
    
    return c.json({ booking: updatedBooking });
  } catch (error) {
    console.log('Error updating booking:', error);
    return c.json({ error: 'Failed to update booking' }, 500);
  }
});

// Delete booking for authenticated user
app.delete('/make-server-20084ff3/bookings/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    
    const existingBooking = await kv.get(`user:${user.id}:booking:${id}`);
    if (!existingBooking) {
      return c.json({ error: 'Booking not found' }, 404);
    }
    
    // Delete booking
    await kv.del(`user:${user.id}:booking:${id}`);
    
    console.log(`Deleted booking ${id}`);
    
    return c.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.log('Error deleting booking:', error);
    return c.json({ error: 'Failed to delete booking' }, 500);
  }
});

// =============================================================================
// QUOTES API (WITH USER ISOLATION)
// =============================================================================

// Get all quotes for authenticated user
app.get('/make-server-20084ff3/quotes', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const quotes = await kv.getByPrefix(`user:${user.id}:quote:`);
    return c.json({ quotes: quotes || [] });
  } catch (error) {
    console.log('Error fetching quotes:', error);
    return c.json({ error: 'Failed to fetch quotes' }, 500);
  }
});

// Get quotes for specific client (authenticated user only)
app.get('/make-server-20084ff3/clients/:clientId/quotes', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const clientId = c.req.param('clientId');
    const allQuotes = await kv.getByPrefix(`user:${user.id}:quote:`);
    const clientQuotes = (allQuotes || []).filter((quote: any) => quote.clientId === clientId);
    
    return c.json({ quotes: clientQuotes });
  } catch (error) {
    console.log('Error fetching client quotes:', error);
    return c.json({ error: 'Failed to fetch client quotes' }, 500);
  }
});

// Get single quote for authenticated user
app.get('/make-server-20084ff3/quotes/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const quote = await kv.get(`user:${user.id}:quote:${id}`);
    
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }
    
    return c.json({ quote });
  } catch (error) {
    console.log('Error fetching quote:', error);
    return c.json({ error: 'Failed to fetch quote' }, 500);
  }
});

// Create new quote for authenticated user
app.post('/make-server-20084ff3/quotes', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const quoteId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate quote number (scoped to user)
    const allQuotes = await kv.getByPrefix(`user:${user.id}:quote:`);
    const quoteCount = (allQuotes || []).length + 1;
    const quoteNumber = `QUO-${new Date().getFullYear()}-${quoteCount.toString().padStart(4, '0')}`;
    
    const newQuote = {
      id: quoteId,
      userId: user.id,
      number: quoteNumber,
      clientId: body.clientId,
      jobId: body.jobId || null,
      title: body.title,
      description: body.description || '',
      status: 'draft',
      lineItems: body.lineItems || [],
      subtotal: body.subtotal || 0,
      vatAmount: body.vatAmount || 0,
      total: body.total || 0,
      // CRITICAL FIX: Use nullish coalescing to preserve false values
      vatEnabled: body.vatEnabled ?? true,
      vatRate: body.vatRate ?? 20,
      validUntil: body.validUntil || null,
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:quote:${quoteId}`, newQuote);
    
    return c.json({ quote: newQuote }, 201);
  } catch (error) {
    console.log('Error creating quote:', error);
    return c.json({ error: 'Failed to create quote' }, 500);
  }
});

// Update quote for authenticated user
app.put('/make-server-20084ff3/quotes/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const existingQuote = await kv.get(`user:${user.id}:quote:${id}`);
    if (!existingQuote) {
      return c.json({ error: 'Quote not found' }, 404);
    }
    
    const updatedQuote = {
      ...existingQuote,
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:quote:${id}`, updatedQuote);
    
    return c.json({ quote: updatedQuote });
  } catch (error) {
    console.log('Error updating quote:', error);
    return c.json({ error: 'Failed to update quote' }, 500);
  }
});

// Send quote (updates status to 'sent') for authenticated user
app.post('/make-server-20084ff3/quotes/:id/send', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    
    const existingQuote = await kv.get(`user:${user.id}:quote:${id}`);
    if (!existingQuote) {
      return c.json({ error: 'Quote not found' }, 404);
    }
    
    const updatedQuote = {
      ...existingQuote,
      status: 'sent',
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:quote:${id}`, updatedQuote);
    
    return c.json({ quote: updatedQuote });
  } catch (error) {
    console.log('Error sending quote:', error);
    return c.json({ error: 'Failed to send quote' }, 500);
  }
});

// Convert quote to job for authenticated user
app.post('/make-server-20084ff3/quotes/:id/convert', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    
    const quote = await kv.get(`user:${user.id}:quote:${id}`);
    if (!quote) {
      return c.json({ error: 'Quote not found' }, 404);
    }
    
    // Create new job from quote
    const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newJob = {
      id: jobId,
      userId: user.id,
      clientId: quote.clientId,
      originalQuoteId: quote.id, // Standardized to match local storage
      quoteId: quote.id, // Keep for backward compatibility
      title: quote.title,
      description: quote.description,
      address: '', // Will need to be filled from client data
      status: 'quote_approved',
      priority: 'medium',
      estimatedDuration: '',
      estimatedValue: quote.total,
      materials: quote.lineItems.filter((item: any) => item.type === 'material' || !item.type),
      labour: quote.lineItems.filter((item: any) => item.type === 'labour'),
      // CRITICAL FIX: Inherit VAT settings from original quote
      vatEnabled: quote.vatEnabled ?? true,
      vatRate: quote.vatRate ?? 20,
      subtotal: quote.subtotal || 0,
      vatAmount: quote.vatAmount || 0,
      total: quote.total || 0,
      notes: quote.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:job:${jobId}`, newJob);
    
    // Update quote status
    const updatedQuote = {
      ...quote,
      status: 'converted',
      convertedAt: new Date().toISOString(),
      jobId: jobId,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:quote:${id}`, updatedQuote);
    
    return c.json({ job: newJob });
  } catch (error) {
    console.log('Error converting quote to job:', error);
    return c.json({ error: 'Failed to convert quote to job' }, 500);
  }
});

// Delete quote for authenticated user
app.delete('/make-server-20084ff3/quotes/:id', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    
    const existingQuote = await kv.get(`user:${user.id}:quote:${id}`);
    if (!existingQuote) {
      return c.json({ error: 'Quote not found' }, 404);
    }
    
    // Check if quote is already converted to a job
    if (existingQuote.status === 'converted' && existingQuote.jobId) {
      return c.json({ 
        success: false, 
        message: 'Cannot delete quote that has been converted to a job' 
      }, 400);
    }
    
    // Delete quote
    await kv.del(`user:${user.id}:quote:${id}`);
    
    console.log(`Deleted quote ${id} (${existingQuote.number})`);
    
    return c.json({ success: true, message: 'Quote deleted successfully' });
  } catch (error) {
    console.log('Error deleting quote:', error);
    return c.json({ error: 'Failed to delete quote' }, 500);
  }
});


// =============================================================================
// BRANDING API (WITH USER ISOLATION)
// =============================================================================

// Get branding settings for authenticated user
app.get('/make-server-20084ff3/branding', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    let branding = await kv.get(`user:${user.id}:branding:settings`);
    
    console.log(`🎨 [SERVER GET] User ${user.id} branding:`, {
      exists: !!branding,
      primary_color: branding?.primary_color,
      accent_color: branding?.accent_color
    });
    
    // MIGRATION: Check old global key if user-scoped key is empty (ONE-TIME ONLY)
    // This migration is disabled to prevent old data from overwriting user changes
    // If you need to enable it, uncomment below and ensure it only runs once per user
    /*
    if (!branding) {
      const oldBranding = await kv.get('branding:settings');
      if (oldBranding) {
        console.log(`Migrating branding data from global key to user ${user.id}`);
        await kv.set(`user:${user.id}:branding:settings`, oldBranding);
        branding = oldBranding;
      }
    }
    */
    
    // Return default branding if none exists
    const defaultBranding = {
      logo_url: null,
      logo_dark_url: null,
      icon_url: null,
      primary_color: '#0A84FF',
      accent_color: '#16A34A',
      neutral_color: '#6B7280',
      invoice_use_brand_colors: true,
      invoice_logo_position: 'left',
      selected_template: null // null indicates no template has been explicitly selected yet
    };
    
    const finalBranding = branding || defaultBranding;
    
    // Migration: Convert any existing "center" logo position to "left"
    if (finalBranding.invoice_logo_position === 'center') {
      finalBranding.invoice_logo_position = 'left';
    }
    
    return c.json({ branding: finalBranding });
  } catch (error) {
    console.log('Error fetching branding:', error);
    return c.json({ error: 'Failed to fetch branding' }, 500);
  }
});

// Update branding settings
app.put('/make-server-20084ff3/branding', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    
    console.log(`🎨 [SERVER] Received branding update for user ${user.id} - logo_url:`, body.logo_url, 'has_logo_url:', 'logo_url' in body);
    
    const existingBranding = await kv.get(`user:${user.id}:branding:settings`);
    
    console.log(`🎨 [SERVER] Existing branding:`, {
      primary_color: existingBranding?.primary_color,
      accent_color: existingBranding?.accent_color
    });
    
    // Merge branding data, explicitly handling null/undefined values to allow removal
    const updatedBranding = {
      ...existingBranding,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    // Explicitly handle null/undefined values to allow removal of logo/icons
    if ('logo_url' in body && (body.logo_url === undefined || body.logo_url === null)) {
      updatedBranding.logo_url = undefined;
    }
    if ('logo_dark_url' in body && (body.logo_dark_url === undefined || body.logo_dark_url === null)) {
      updatedBranding.logo_dark_url = undefined;
    }
    if ('icon_url' in body && (body.icon_url === undefined || body.icon_url === null)) {
      updatedBranding.icon_url = undefined;
    }
    
    console.log(`🎨 [SERVER] Merged - logo_url:`, updatedBranding.logo_url);
    
    await kv.set(`user:${user.id}:branding:settings`, updatedBranding);
    
    console.log(`🎨 [SERVER] Branding saved successfully for user ${user.id}`);
    
    // VERIFICATION: Read back what was just saved to ensure it persisted correctly
    const verifyBranding = await kv.get(`user:${user.id}:branding:settings`);
    console.log(`🎨 [SERVER] Verification read:`, {
      primary_color: verifyBranding?.primary_color,
      accent_color: verifyBranding?.accent_color,
      matches: verifyBranding?.primary_color === updatedBranding.primary_color && 
               verifyBranding?.accent_color === updatedBranding.accent_color
    });
    
    // Return the verified data to ensure client gets what was actually saved
    return c.json({ branding: verifyBranding || updatedBranding });
  } catch (error) {
    console.log('❌ [SERVER] Error updating branding:', error);
    return c.json({ error: 'Failed to update branding' }, 500);
  }
});

// Upload branding file
app.post('/make-server-20084ff3/branding/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    
    if (!file || !type) {
      return c.json({ error: 'File and type are required' }, 400);
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'File must be an image' }, 400);
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be less than 5MB' }, 400);
    }
    
    // In a real implementation, this would upload to Supabase Storage
    // For now, we'll simulate by converting to data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    console.log(`File uploaded: ${type}, size: ${file.size}, type: ${file.type}`);
    
    return c.json({ url: dataUrl });
  } catch (error) {
    console.log('Error uploading file:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

// =============================================================================
// INVOICE SETTINGS API (WITH USER ISOLATION)
// =============================================================================

// Get invoice settings for authenticated user
app.get('/make-server-20084ff3/invoice-settings', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const settings = await kv.get(`user:${user.id}:invoice-settings:global`);
    
    // Return default settings if none exist
    const defaultSettings = {
      template: 'classic',
      numbering_prefix: 'INV',
      numbering_sequence: 1,
      payment_terms: 'Payment due within 30 days of invoice date.',
      footer_text: 'Thank you for your business!'
    };
    
    return c.json({ settings: settings || defaultSettings });
  } catch (error) {
    console.log('Error fetching invoice settings:', error);
    return c.json({ error: 'Failed to fetch invoice settings' }, 500);
  }
});

// Update invoice settings for authenticated user
app.put('/make-server-20084ff3/invoice-settings', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    
    const existingSettings = await kv.get(`user:${user.id}:invoice-settings:global`);
    const updatedSettings = {
      ...existingSettings,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:invoice-settings:global`, updatedSettings);
    
    return c.json({ settings: updatedSettings });
  } catch (error) {
    console.log('Error updating invoice settings:', error);
    return c.json({ error: 'Failed to update invoice settings' }, 500);
  }
});

// =============================================================================
// BUSINESS DETAILS API (WITH USER ISOLATION)
// =============================================================================

// Get business details for authenticated user
app.get('/make-server-20084ff3/business-details', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const businessDetails = await kv.get(`user:${user.id}:business-details:global`);
    
    return c.json({ businessDetails });
  } catch (error) {
    console.log('Error fetching business details:', error);
    return c.json({ error: 'Failed to fetch business details' }, 500);
  }
});

// Save business details for authenticated user
app.post('/make-server-20084ff3/business-details', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    
    const businessDetails = {
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:business-details:global`, businessDetails);
    
    return c.json({ businessDetails });
  } catch (error) {
    console.log('Error saving business details:', error);
    return c.json({ error: 'Failed to save business details' }, 500);
  }
});

// =============================================================================
// BANK DETAILS API (WITH USER ISOLATION)
// =============================================================================

// Get bank details for authenticated user
app.get('/make-server-20084ff3/bank-details', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const bankDetails = await kv.get(`user:${user.id}:bank-details:global`);
    
    return c.json({ bankDetails });
  } catch (error) {
    console.log('Error fetching bank details:', error);
    return c.json({ error: 'Failed to fetch bank details' }, 500);
  }
});

// Update bank details for authenticated user
app.put('/make-server-20084ff3/bank-details', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    
    const bankDetails = {
      account_holder_name: body.account_holder_name || '',
      bank_name: body.bank_name || '',
      sort_code: body.sort_code || '',
      account_number: body.account_number || '',
      iban: body.iban || '',
      show_on_invoice: body.show_on_invoice || false,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:bank-details:global`, bankDetails);
    
    return c.json({ bankDetails });
  } catch (error) {
    console.log('Error updating bank details:', error);
    return c.json({ error: 'Failed to update bank details' }, 500);
  }
});

// =============================================================================
// BUSINESS DETAILS API (WITH USER ISOLATION)
// =============================================================================

// Get business details for authenticated user
app.get('/make-server-20084ff3/business-details', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const businessDetails = await kv.get(`user:${user.id}:business-details:global`);
    
    return c.json({ businessDetails });
  } catch (error) {
    console.log('Error fetching business details:', error);
    return c.json({ error: 'Failed to fetch business details' }, 500);
  }
});

// Update business details for authenticated user
app.put('/make-server-20084ff3/business-details', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    
    const businessDetails = {
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:business-details:global`, businessDetails);
    
    return c.json({ businessDetails });
  } catch (error) {
    console.log('Error updating business details:', error);
    return c.json({ error: 'Failed to update business details' }, 500);
  }
});

// =============================================================================
// BRANDING API (WITH USER ISOLATION)
// =============================================================================

// Get branding settings for authenticated user
app.get('/make-server-20084ff3/branding', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const branding = await kv.get(`user:${user.id}:branding:global`);
    
    return c.json({ branding });
  } catch (error) {
    console.log('Error fetching branding:', error);
    return c.json({ error: 'Failed to fetch branding' }, 500);
  }
});

// Update branding settings for authenticated user
app.put('/make-server-20084ff3/branding', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    
    const branding = {
      ...body,
      userId: user.id,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`user:${user.id}:branding:global`, branding);
    
    return c.json({ branding });
  } catch (error) {
    console.log('Error updating branding:', error);
    return c.json({ error: 'Failed to update branding' }, 500);
  }
});

// =============================================================================
// NOTIFICATION PREFERENCES API
// =============================================================================

// Get notification preferences
app.get('/make-server-20084ff3/notification-preferences', async (c) => {
  try {
    const preferences = await kv.get('notification-preferences:global');
    
    return c.json({ preferences });
  } catch (error) {
    console.log('Error fetching notification preferences:', error);
    return c.json({ error: 'Failed to fetch notification preferences' }, 500);
  }
});

// Update notification preferences
app.put('/make-server-20084ff3/notification-preferences', async (c) => {
  try {
    const body = await c.req.json();
    
    const preferences = {
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set('notification-preferences:global', preferences);
    
    return c.json({ success: true, preferences });
  } catch (error) {
    console.log('Error updating notification preferences:', error);
    return c.json({ error: 'Failed to update notification preferences' }, 500);
  }
});

// Start server
Deno.serve(app.fetch);