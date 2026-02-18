'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, CreditCard, Loader2, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';
import api, { StripePlan, StripeSubscriptionStatus } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';

type BillingInterval = 'month' | 'year';

// Fallback plans in case API fails
const FALLBACK_PLANS: StripePlan[] = [
  {
    id: 'echo',
    name: 'Echo',
    tier: 'pro',
    monthlyPriceId: '',
    annualPriceId: '',
    monthlyPrice: 29,
    annualPrice: 290,
    features: [
      'Up to 2 hours of video processing',
      'Up to 5 clips per video',
      'Voice matching from your content',
      'Up to 3 Creator Radar slots',
      'Standard carousel templates',
      '1080p exports',
      '250MB file upload limit',
      'Manual document upload only',
    ],
    limits: {
      videoMinutesPerMonth: 120,
      clipsPerVideo: 5,
      knowledgeBases: 1,
      creatorRadar: 3,
      exportQuality: '1080p',
      emailImportMaxEmails: 0,
    },
  },
  {
    id: 'echo-studio',
    name: 'Echo Studio',
    tier: 'studio',
    monthlyPriceId: '',
    annualPriceId: '',
    monthlyPrice: 49,
    annualPrice: 490,
    features: [
      'Up to 5 hours of video processing',
      'Up to 10 clips per video',
      'Advanced voice matching',
      'Up to 10 Creator Radar slots',
      'All carousel templates + custom colors',
      '1080p exports',
      '750MB file upload limit',
      'Email import (up to 50 emails)',
      'Priority processing queue',
    ],
    limits: {
      videoMinutesPerMonth: 300,
      clipsPerVideo: 10,
      knowledgeBases: 3,
      creatorRadar: 10,
      exportQuality: '1080p',
      emailImportMaxEmails: 50,
    },
  },
  {
    id: 'echo-pro',
    name: 'Echo Pro',
    tier: 'enterprise',
    monthlyPriceId: '',
    annualPriceId: '',
    monthlyPrice: 99,
    annualPrice: 990,
    features: [
      'Unlimited video processing',
      'Up to 15 clips per video',
      'Premium voice matching',
      'Unlimited Creator Radar',
      'Custom carousel design system',
      '1080p exports',
      '5GB file upload limit',
      'Email import (up to 100 emails)',
      'Priority processing queue',
      'Priority support',
    ],
    limits: {
      videoMinutesPerMonth: -1,
      clipsPerVideo: 15,
      knowledgeBases: -1,
      creatorRadar: -1,
      exportQuality: '1080p',
      emailImportMaxEmails: 100,
    },
  },
];

function BillingContentInner() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<StripePlan[]>([]);
  const [subscription, setSubscription] = useState<StripeSubscriptionStatus | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle success/cancel/upgrade query params
  useEffect(() => {
    async function handleRedirect() {
      if (searchParams.get('success') === 'true') {
        // Sync subscription from Stripe to ensure we have the latest status
        try {
          const syncResult = await api.stripe.syncSubscription();
          if (syncResult.success && syncResult.data.synced) {
            const tierName = syncResult.data.tier === 'pro' ? 'Echo' :
                            syncResult.data.tier === 'studio' ? 'Echo Studio' :
                            syncResult.data.tier === 'enterprise' ? 'Echo Pro' : 'your plan';
            setSuccessMessage(`Your ${tierName} subscription is now active! Welcome aboard.`);
            // Reload subscription status
            const subResult = await api.stripe.getSubscription();
            if (subResult.success) {
              setSubscription(subResult.data);
            }
          } else {
            setSuccessMessage('Your subscription has been activated! Welcome aboard.');
          }
        } catch (err) {
          console.error('Failed to sync subscription:', err);
          setSuccessMessage('Your subscription has been activated! Welcome aboard.');
        }
        // Check if user needs onboarding (new signup or empty account)
        const needsOnboarding = searchParams.get('onboarding') === 'true' || localStorage.getItem('needsOnboarding');
        if (needsOnboarding) {
          localStorage.removeItem('needsOnboarding');
          window.location.href = '/onboarding';
          return;
        }
        // Even without the flag, check if the account has no content (returning empty user)
        try {
          const kbResponse = await api.kb.list();
          if (kbResponse.success && kbResponse.data && kbResponse.data.length > 0) {
            const contentResponse = await api.kb.getContent(kbResponse.data[0].id);
            if (contentResponse.success && contentResponse.data) {
              if (contentResponse.data.items.length === 0) {
                window.location.href = '/onboarding';
                return;
              }
            }
          } else {
            // No knowledge base at all — definitely needs onboarding
            window.location.href = '/onboarding';
            return;
          }
        } catch {
          // If check fails, don't block — just stay on billing
        }
        // Clear the URL params
        window.history.replaceState({}, '', '/app/billing');
      } else if (searchParams.get('canceled') === 'true') {
        setError('Checkout was canceled. No charges were made.');
        window.history.replaceState({}, '', '/app/billing');
      } else if (searchParams.get('upgrade') === 'true') {
        // User was redirected here because they need a subscription
        const tierName = searchParams.get('tierName');
        const reason = searchParams.get('reason');
        if (tierName) {
          setError(`This feature requires ${tierName} or higher. Please upgrade your plan to continue.`);
        } else {
          setSuccessMessage('Choose a plan to unlock unlimited content creation.');
        }
        window.history.replaceState({}, '', '/app/billing');
      }
    }

    handleRedirect();
  }, [searchParams]);

  // Load plans and subscription status
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Try to load plans and subscription in parallel
        const results = await Promise.allSettled([
          api.stripe.getPlans(),
          api.stripe.getSubscription(),
        ]);

        // Handle plans result
        const plansResult = results[0];
        if (plansResult.status === 'fulfilled' && plansResult.value.success) {
          setPlans(plansResult.value.data.plans);
        } else {
          // Use fallback plans if API fails
          console.warn('Using fallback plans - API unavailable');
          setPlans(FALLBACK_PLANS);
        }

        // Handle subscription result
        const subResult = results[1];
        if (subResult.status === 'fulfilled' && subResult.value.success) {
          setSubscription(subResult.value.data);
        } else {
          // Default to free tier if can't fetch subscription
          setSubscription({
            isSubscribed: false,
            tier: 'free',
            status: null,
          });
        }
      } catch (err) {
        console.error('Failed to load billing data:', err);
        // Use fallback plans even on error
        setPlans(FALLBACK_PLANS);
        setSubscription({
          isSubscribed: false,
          tier: 'free',
          status: null,
        });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Handle plan selection - either checkout for new users or switch for existing subscribers
  const handlePlanSelect = async (planId: 'echo' | 'echo-studio' | 'echo-pro') => {
    try {
      setCheckoutLoading(planId);
      setError(null);
      setSuccessMessage(null);

      // If user already has an active Stripe subscription (not admin-assigned), switch plans instead of checkout
      if (subscription?.isSubscribed && !subscription?.isAdminAssigned && (subscription.status === 'active' || subscription.status === 'trialing')) {
        const response = await api.stripe.switchPlan(planId, billingInterval);

        if (response.success) {
          const planName = planId === 'echo' ? 'Echo' : planId === 'echo-studio' ? 'Echo Studio' : 'Echo Pro';
          setSuccessMessage(`Successfully switched to ${planName}! Your billing will be prorated.`);

          // Refresh subscription status
          const subResult = await api.stripe.getSubscription();
          if (subResult.success) {
            setSubscription(subResult.data);
          }
          setCheckoutLoading(null);
        } else {
          throw new Error('Failed to switch plans');
        }
      } else {
        // New user - create checkout session
        const response = await api.stripe.createCheckoutSession(planId, billingInterval);

        if (response.success && response.data.url) {
          // Redirect to Stripe Checkout
          window.location.href = response.data.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      }
    } catch (err) {
      console.error('Plan selection error:', err);
      setError(extractErrorMessage(err, 'Failed to process your request. Please try again.'));
      setCheckoutLoading(null);
    }
  };

  // Handle portal redirect
  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      setError(null);

      const response = await api.stripe.getPortalUrl();

      if (response.success && response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to open billing portal');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError(extractErrorMessage(err, 'Failed to open billing portal. Please try again.'));
      setPortalLoading(false);
    }
  };

  // Get tier display name
  const getTierDisplayName = (tier: string) => {
    const names: Record<string, string> = {
      free: 'Free',
      pro: 'Echo',
      studio: 'Echo Studio',
      enterprise: 'Echo Pro',
    };
    return names[tier] || tier;
  };

  // Check if user is on this plan
  const isCurrentPlan = (plan: StripePlan) => {
    return subscription?.tier === plan.tier && subscription?.isSubscribed;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-600">
          <Sparkles className="w-5 h-5" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Current Subscription Status */}
      <div className="mb-8 p-6 bg-card border rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">Current Plan</h2>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {getTierDisplayName(subscription?.tier || 'free')}
              </span>
              {subscription?.status === 'active' && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-600 text-xs font-medium rounded-full">
                  Active
                </span>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-600 text-xs font-medium rounded-full">
                  Cancels at period end
                </span>
              )}
            </div>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground mt-1">
                {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {subscription?.isSubscribed && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Manage Subscription
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-6 py-2 rounded-md font-medium transition-all ${
              billingInterval === 'month'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`relative px-6 py-2 rounded-md font-medium transition-all ${
              billingInterval === 'year'
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan);
          const isPopular = plan.id === 'echo-studio';
          const price = billingInterval === 'month' ? plan.monthlyPrice : plan.annualPrice;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                isPopular
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border bg-card'
              } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  CURRENT
                </div>
              )}

              <div className="mb-4 mt-2">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-extrabold">${price}</span>
                  <span className="text-muted-foreground">
                    /{billingInterval === 'month' ? 'mo' : 'yr'}
                  </span>
                </div>
                {billingInterval === 'year' && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    2 months free
                  </p>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isCurrent || checkoutLoading !== null}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                  isCurrent
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : isPopular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                } disabled:opacity-50`}
              >
                {checkoutLoading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {subscription?.isSubscribed && !subscription?.isAdminAssigned ? 'Switching...' : 'Redirecting...'}
                  </span>
                ) : isCurrent ? (
                  'Current Plan'
                ) : subscription?.isSubscribed && !subscription?.isAdminAssigned ? (
                  'Switch to this plan'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise CTA */}
      <div className="text-center p-8 bg-muted/50 rounded-2xl">
        <h3 className="text-xl font-bold mb-2">Need Enterprise Features?</h3>
        <p className="text-muted-foreground mb-4">
          API access, 4K exports, team collaboration, white-label options, and custom integrations.
        </p>
        <a
          href="mailto:enterprise@tryechome.com"
          className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-semibold hover:bg-foreground/90 transition-colors"
        >
          Contact Sales
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export default function BillingContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <BillingContentInner />
    </Suspense>
  );
}
