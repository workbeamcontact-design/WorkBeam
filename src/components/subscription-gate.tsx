import { useState, useEffect } from 'react';
import { Loader2, Lock, Check, Users } from 'lucide-react';
import { SubscriptionAPI, SubscriptionStatus } from '../utils/subscription-api';
import { Button } from './ui/button';
import { useAuth } from '../utils/auth-context';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PRODUCTION MODE: Subscription required
  const DEV_MODE_BYPASS = false;

  // COMPANY EMAIL WHITELIST: These emails get free access
  // Add your company email(s) here to bypass subscription requirements
  const WHITELISTED_EMAILS = [
    'workbeamcontact@gmail.com',  // Company account
    // Add tester emails below (one per line):
    // 'tester1@gmail.com',
    // 'tester2@gmail.com',
    // 'tester3@gmail.com',
  ];

  // Check if current user is whitelisted
  const isWhitelisted = user?.email && WHITELISTED_EMAILS.includes(user.email.toLowerCase());

  // Stripe Live Price IDs
  const SOLO_PRICE_ID = 'price_1SI6N49ZwTOJs5SgCEUJ17bw';
  const TEAM_PRICE_ID = 'price_1SI6Nn9ZwTOJs5SgYR9VcSsh';
  const BUSINESS_PRICE_ID = 'price_1SI6OL9ZwTOJs5Sgq4dD6giV';

  useEffect(() => {
    // Skip subscription check in dev mode
    if (DEV_MODE_BYPASS) {
      console.log('⚠️ DEVELOPMENT MODE: Subscription gate bypassed');
      setLoading(false);
      return;
    }

    // Skip subscription check for whitelisted company emails
    if (isWhitelisted) {
      console.log(`✅ WHITELISTED EMAIL: Subscription gate bypassed for ${user?.email}`);
      setLoading(false);
      return;
    }

    loadSubscription();

    // Check for subscription success/cancel in URL
    const params = new URLSearchParams(window.location.search);
    const subscriptionParam = params.get('subscription');
    
    if (subscriptionParam === 'success') {
      // Remove the parameter and reload subscription
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => loadSubscription(), 2000); // Give webhook time to process
    } else if (subscriptionParam === 'canceled') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await SubscriptionAPI.getStatus();
      setSubscription(status);
    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      // In case of error, allow access but show warning
      setSubscription({ active: true, status: 'active', trial_end: null, current_period_end: null });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, planName: string) => {
    try {
      setProcessingPlan(planName);
      await SubscriptionAPI.createCheckoutSession(priceId);
      // User will be redirected to Stripe Checkout
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setProcessingPlan(null);
    }
  };

  // Show loading spinner while checking subscription
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="trades-body text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // If in dev mode, always show the app with a dev badge
  if (DEV_MODE_BYPASS) {
    return (
      <>
        {/* Dev Mode Indicator */}
        <div className="fixed bottom-20 right-4 z-50 bg-yellow-500 text-white px-3 py-1 rounded-full shadow-lg">
          <span className="trades-caption">⚠️ Dev Mode</span>
        </div>
        {children}
      </>
    );
  }

  // If user is whitelisted, show the app without badge (badge shown in settings)
  if (isWhitelisted) {
    return <>{children}</>;
  }

  // If user has active subscription, show the app
  if (subscription?.active) {
    return <>{children}</>;
  }

  // Show subscription required screen
  return (
    <div className="h-full bg-surface overflow-y-auto">
      <div className="flex flex-col items-center justify-center p-4 min-h-full">
        <div className="w-full max-w-md">
          {/* Lock Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="trades-h1 text-ink mb-2">Choose Your Plan</h1>
            <p className="trades-body text-muted mb-3">
              Start your 14-day free trial - no charges until trial ends
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full">
              <span className="trades-body text-success">✨ 14-day free trial • Cancel anytime</span>
            </div>
            {window.self !== window.top && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="trades-caption text-blue-800">
                  💡 If checkout doesn't open, you may need to allow popups or open this page in a new tab
                </p>
              </div>
            )}
          </div>

          {/* Pricing Plans */}
          <div className="space-y-3 mb-6">
            {/* Solo Plan */}
            <div className="bg-white rounded-2xl p-5 border-2 border-line">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="trades-h2 text-ink">£24</span>
                    <span className="trades-body text-muted">/month</span>
                  </div>
                  <h3 className="trades-h3 text-ink">Solo</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface">
                  <Users className="w-4 h-4 text-muted" />
                  <span className="trades-caption text-muted">1 user</span>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Unlimited clients & jobs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Professional invoices & quotes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Payment tracking & analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Calendar & bookings</span>
                </li>
              </ul>

              <Button
                onClick={() => handleSubscribe(SOLO_PRICE_ID, 'solo')}
                className="w-full h-12"
                disabled={processingPlan === 'solo'}
                variant="outline"
              >
                {processingPlan === 'solo' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
              <p className="trades-caption text-muted text-center mt-2">
                Then £24/month after trial
              </p>
            </div>

            {/* Team Plan - Most Popular */}
            <div className="bg-white rounded-2xl p-5 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full">
                <span className="trades-caption">Most Popular</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="trades-h2 text-ink">£35</span>
                    <span className="trades-body text-muted">/month</span>
                  </div>
                  <h3 className="trades-h3 text-ink">Team</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="trades-caption text-primary">Up to 3 users</span>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Everything in Solo</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Multi-user collaboration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Shared calendar & bookings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Team analytics</span>
                </li>
              </ul>

              <Button
                onClick={() => handleSubscribe(TEAM_PRICE_ID, 'team')}
                className="w-full h-12"
                disabled={processingPlan === 'team'}
              >
                {processingPlan === 'team' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
              <p className="trades-caption text-muted text-center mt-2">
                Then £35/month after trial
              </p>
            </div>

            {/* Business Plan */}
            <div className="bg-white rounded-2xl p-5 border-2 border-line">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="trades-h2 text-ink">£50</span>
                    <span className="trades-body text-muted">/month</span>
                  </div>
                  <h3 className="trades-h3 text-ink">Business</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface">
                  <Users className="w-4 h-4 text-muted" />
                  <span className="trades-caption text-muted">Up to 6 users</span>
                </div>
              </div>

              <ul className="space-y-2 mb-5">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Everything in Team</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-caption text-ink">Custom branding</span>
                </li>
              </ul>

              <Button
                onClick={() => handleSubscribe(BUSINESS_PRICE_ID, 'business')}
                className="w-full h-12"
                disabled={processingPlan === 'business'}
                variant="outline"
              >
                {processingPlan === 'business' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Start Free Trial'
                )}
              </Button>
              <p className="trades-caption text-muted text-center mt-2">
                Then £50/month after trial
              </p>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="text-center space-y-2">
            <p className="trades-caption text-muted">
              💳 Accepts card, Apple Pay, and Google Pay
            </p>
            <p className="trades-caption text-muted">
              🔒 Secure payments powered by Stripe
            </p>
            <p className="trades-caption text-muted">
              ⏰ No charges for 14 days • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
