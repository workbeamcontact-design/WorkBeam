import { useState, useEffect } from 'react';
import { Check, CreditCard, AlertCircle, Loader2, Users } from 'lucide-react';
import { SubscriptionAPI, SubscriptionStatus } from '../../utils/subscription-api';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { ScreenLayout } from '../ui/screen-layout';

interface SubscriptionProps {
  onBack: () => void;
}

export function Subscription({ onBack }: SubscriptionProps) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PRODUCTION MODE: Subscription required
  const DEV_MODE_BYPASS = false;

  // Stripe Live Price IDs
  const SOLO_PRICE_ID = 'price_1SI6N49ZwTOJs5SgCEUJ17bw';
  const TEAM_PRICE_ID = 'price_1SI6Nn9ZwTOJs5SgYR9VcSsh';
  const BUSINESS_PRICE_ID = 'price_1SI6OL9ZwTOJs5Sgq4dD6giV';

  useEffect(() => {
    // Skip loading subscription in dev mode
    if (DEV_MODE_BYPASS) {
      setLoading(false);
      setSubscription({ active: true, status: 'active', trial_end: null, current_period_end: null });
      return;
    }
    
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await SubscriptionAPI.getStatus();
      setSubscription(status);
    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string, planName: string) => {
    // Prevent subscription in dev mode
    if (DEV_MODE_BYPASS) {
      setError('Stripe subscriptions are disabled in development mode. See /docs/STRIPE_SETUP.md to enable.');
      return;
    }

    try {
      setProcessingPlan(planName);
      setError(null);
      await SubscriptionAPI.createCheckoutSession(priceId);
      // User will be redirected to Stripe Checkout
    } catch (err) {
      console.error('Failed to create checkout session:', err);
      setError('Failed to start checkout');
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    // Prevent portal access in dev mode
    if (DEV_MODE_BYPASS) {
      setError('Subscription management is disabled in development mode. See /docs/STRIPE_SETUP.md to enable.');
      return;
    }

    try {
      setError(null);
      await SubscriptionAPI.openCustomerPortal();
      // User will be redirected to Stripe Customer Portal
    } catch (err) {
      console.error('Failed to open customer portal:', err);
      setError('Failed to open subscription management');
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isActive = subscription?.active;
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';

  return (
    <ScreenLayout title="Subscription" onBack={onBack}>
      <div className="p-4 space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Subscription Status */}
        {isActive && !DEV_MODE_BYPASS && (
          <div className="bg-white rounded-2xl p-6 border border-line">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="trades-h3 text-ink mb-1">
                  {isTrialing ? 'Trial Active' : 'Subscription Active'}
                </h2>
                <p className="trades-caption text-muted">
                  {isTrialing
                    ? `Your trial ends on ${formatDate(subscription.trial_end)}`
                    : `Your subscription renews on ${formatDate(subscription.current_period_end)}`}
                </p>
              </div>
            </div>

            {isPastDue && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your payment is past due. Please update your payment method to continue using the app.
                </AlertDescription>
              </Alert>
            )}

            {subscription?.cancel_at_period_end && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription will be canceled on {formatDate(subscription.current_period_end)}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleManageSubscription}
              variant="outline"
              className="w-full h-12"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Manage Subscription
            </Button>
          </div>
        )}

        {/* Pricing Plans */}
        {!isActive && !DEV_MODE_BYPASS && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="trades-h2 text-ink mb-2">Choose Your Plan</h2>
              <p className="trades-body text-muted mb-3">
                Start your 14-day free trial - no charges until trial ends
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full">
                <span className="trades-body text-success">✨ 14-day free trial • Cancel anytime</span>
              </div>
            </div>

            {/* Solo Plan */}
            <div className="bg-white rounded-2xl p-6 border-2 border-line">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="trades-h1 text-ink">£24</span>
                    <span className="trades-body text-muted">/month</span>
                  </div>
                  <h3 className="trades-h3 text-ink">Solo</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface">
                  <Users className="w-4 h-4 text-muted" />
                  <span className="trades-caption text-muted">1 user</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Unlimited clients & jobs</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Professional invoices & quotes</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Payment tracking & analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Calendar & bookings</span>
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
            <div className="bg-white rounded-2xl p-6 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full">
                <span className="trades-caption">Most Popular</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="trades-h1 text-ink">£35</span>
                    <span className="trades-body text-muted">/month</span>
                  </div>
                  <h3 className="trades-h3 text-ink">Team</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="trades-caption text-primary">Up to 3 users</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Everything in Solo</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Multi-user collaboration</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Shared calendar & bookings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Team analytics</span>
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
            <div className="bg-white rounded-2xl p-6 border-2 border-line">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="trades-h1 text-ink">£50</span>
                    <span className="trades-body text-muted">/month</span>
                  </div>
                  <h3 className="trades-h3 text-ink">Business</h3>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface">
                  <Users className="w-4 h-4 text-muted" />
                  <span className="trades-caption text-muted">Up to 6 users</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Everything in Team</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <span className="trades-body text-ink">Custom branding</span>
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

            {/* Trust Badge */}
            <div className="text-center pt-4 space-y-2">
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
        )}
      </div>
    </ScreenLayout>
  );
}
