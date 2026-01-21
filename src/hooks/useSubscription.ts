/**
 * useSubscription Hook
 * Subscription state management for paywall enforcement
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, StripeSubscriptionStatus } from '@/lib/api-client';

export type SubscriptionTier = 'free' | 'pro' | 'studio' | 'enterprise';

interface UseSubscriptionReturn {
  /** Current subscription status */
  subscription: StripeSubscriptionStatus | null;
  /** Loading state */
  loading: boolean;
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
  /** Refresh subscription status from server */
  refresh: () => Promise<void>;
  /** Check if user has access to a tier-gated feature */
  hasTierAccess: (requiredTier: SubscriptionTier) => boolean;
  /** Redirect to billing page if not subscribed */
  requireSubscription: () => boolean;
}

// Tier hierarchy for comparison
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,      // Echo ($29/mo)
  studio: 2,   // Echo Studio ($49/mo)
  enterprise: 3, // Echo Pro ($99/mo)
};

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<StripeSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSubscription = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      const response = await api.stripe.getSubscription();
      if (response.success && response.data) {
        setSubscription(response.data);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch subscription on mount
  useEffect(() => {
    fetchSubscription();
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

  // Check tier access
  const hasTierAccess = useCallback((requiredTier: SubscriptionTier): boolean => {
    if (!isSubscribed && !isTrial) return false;
    const userLevel = TIER_LEVELS[tier] || 0;
    const requiredLevel = TIER_LEVELS[requiredTier] || 0;
    return userLevel >= requiredLevel;
  }, [tier, isSubscribed, isTrial]);

  // Require subscription - redirects to billing if not subscribed
  const requireSubscription = useCallback((): boolean => {
    if (loading) return false;
    if (!isSubscribed && !isTrial) {
      router.push('/app/billing?upgrade=true');
      return false;
    }
    return true;
  }, [loading, isSubscribed, isTrial, router]);

  return {
    subscription,
    loading,
    isSubscribed,
    isTrial,
    isActive,
    tier,
    trialDaysRemaining,
    refresh: fetchSubscription,
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
