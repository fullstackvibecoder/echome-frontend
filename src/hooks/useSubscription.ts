/**
 * useSubscription Hook
 * Subscription state management for paywall enforcement
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, StripeSubscriptionStatus } from '@/lib/api-client';

export type SubscriptionTier = 'free' | 'pro' | 'studio' | 'enterprise' | 'teams_2' | 'teams_5' | 'teams_10';

interface UseSubscriptionReturn {
  /** Current subscription status */
  subscription: StripeSubscriptionStatus | null;
  /** Loading state */
  loading: boolean;
  /** Whether the subscription API call failed (network/server error) */
  fetchError: boolean;
  /** Whether user has any active subscription (paid or trial) */
  isSubscribed: boolean;
  /** Whether user is in trial period */
  isTrial: boolean;
  /** Whether subscription is actively paid */
  isActive: boolean;
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Days remaining in trial (0 if not in trial) */
  trialDaysRemaining: number;
  /** Number of free generations used (lifetime) */
  freeGenerationsUsed: number;
  /** Maximum free generations allowed */
  freeGenerationsLimit: number;
  /** Free generations remaining */
  freeGenerationsRemaining: number;
  /** Whether user can generate content (subscribed, trialing, or has free generations) */
  canGenerate: boolean;
  /** Whether user is on the free tier (not subscribed, not trialing) */
  isFreeUser: boolean;
  /** Refresh subscription status from server. Pass true to force sync from Stripe. */
  refresh: (forceSync?: boolean) => Promise<void>;
  /** Check if user has access to a tier-gated feature */
  hasTierAccess: (requiredTier: SubscriptionTier) => boolean;
  /** Redirect to billing page if not subscribed */
  requireSubscription: () => boolean;
}

// Tier hierarchy for comparison
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,        // Echo ($29/mo)
  studio: 2,     // Echo Studio ($49/mo)
  enterprise: 3, // Echo Pro ($99/mo)
  teams_2: 4,    // EchoTeams Duo ($129/mo)
  teams_5: 4,    // EchoTeams Pro ($179/mo)
  teams_10: 4,   // EchoTeams Agency ($249/mo)
};

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<StripeSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const router = useRouter();

  const fetchSubscription = useCallback(async (justPaid?: boolean) => {
    try {
      setFetchError(false);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      // If justPaid flag is set, call with the flag to trigger backend Stripe sync
      // This handles the race condition where webhook hasn't processed yet
      const response = await api.stripe.getSubscription(justPaid);
      if (response.success && response.data) {
        setSubscription(response.data);

        // If we synced from Stripe, log it
        if ((response.data as any).syncedFromStripe) {
          console.log('Subscription synced from Stripe (just_paid recovery)');
        }
      } else {
        // API returned but no subscription - user is genuinely not subscribed
        setSubscription(null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      // API failed - don't assume user isn't subscribed, could be network/server issue
      // Set error flag so we can show retry UI instead of immediately redirecting
      setFetchError(true);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch subscription on mount
  // Check URL params for checkout success indicator to handle webhook race condition
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const justPaid = urlParams.get('success') === 'true';
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    fetchSubscription(justPaid).then(() => {
      // If user just paid but tier is still 'free', poll a few times for webhook to land
      if (justPaid) {
        let retries = 0;
        pollInterval = setInterval(async () => {
          retries++;
          const res = await api.stripe.getSubscription(true).catch(() => null);
          if (res?.success && res.data?.isSubscribed) {
            setSubscription(res.data);
            if (pollInterval) clearInterval(pollInterval);
          } else if (retries >= 5) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }, 2000);
      }
    });

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchSubscription]);

  // Computed values
  const tier = subscription?.tier || 'free';
  const status = subscription?.status || null;
  const isSubscribed = subscription?.isSubscribed || false;
  const isTrial = status === 'trialing';
  const isActive = status === 'active';

  // Calculate trial days remaining
  const trialDaysRemaining = (() => {
    if (!isTrial || !subscription?.trialEnd) return 0;
    const endDate = new Date(subscription.trialEnd);
    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  })();

  // Free generation tracking
  const freeGenerationsUsed = subscription?.freeGenerationsUsed || 0;
  const freeGenerationsLimit = subscription?.freeGenerationsLimit || 2;
  const freeGenerationsRemaining = Math.max(0, freeGenerationsLimit - freeGenerationsUsed);
  const isFreeUser = !isSubscribed && !isTrial;
  const canGenerate = isSubscribed || isTrial || freeGenerationsRemaining > 0;

  // Check tier access — free users with remaining generations get pro-level access
  const hasTierAccess = useCallback((requiredTier: SubscriptionTier): boolean => {
    if (isSubscribed || isTrial) {
      const userLevel = TIER_LEVELS[tier] || 0;
      const requiredLevel = TIER_LEVELS[requiredTier] || 0;
      return userLevel >= requiredLevel;
    }
    // Free users with remaining generations get pro-level access
    if (freeGenerationsRemaining > 0 && TIER_LEVELS[requiredTier] <= TIER_LEVELS['pro']) {
      return true;
    }
    return false;
  }, [tier, isSubscribed, isTrial, freeGenerationsRemaining]);

  // Require subscription - allows free users with remaining generations
  const requireSubscription = useCallback((): boolean => {
    if (loading) return false;
    if (isSubscribed || isTrial || freeGenerationsRemaining > 0) return true;
    router.push('/app/billing?upgrade=true');
    return false;
  }, [loading, isSubscribed, isTrial, freeGenerationsRemaining, router]);

  // Wrap refresh to optionally force sync from Stripe
  const refresh = useCallback(async (forceSync?: boolean) => {
    await fetchSubscription(forceSync);
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    fetchError,
    isSubscribed,
    isTrial,
    isActive,
    tier,
    trialDaysRemaining,
    freeGenerationsUsed,
    freeGenerationsLimit,
    freeGenerationsRemaining,
    canGenerate,
    isFreeUser,
    refresh,
    hasTierAccess,
    requireSubscription,
  };
}

/**
 * Hook to handle 402 Payment Required errors from API
 * Use this with react-query or in API error handlers
 */
export function usePaymentRequired() {
  const router = useRouter();

  const handlePaymentRequired = useCallback((error: any) => {
    if (error?.response?.status === 402) {
      router.push('/app/billing?upgrade=true&reason=subscription_required');
      return true;
    }
    return false;
  }, [router]);

  return { handlePaymentRequired };
}
