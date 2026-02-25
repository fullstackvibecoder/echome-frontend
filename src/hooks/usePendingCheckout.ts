'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api-client';
import type { PlanId, BillingInterval } from '@/lib/api-client';

/**
 * Hook to handle pending checkout from signup flow
 *
 * When a user signs up from a pricing page link (e.g., /auth/signup?plan=echo-studio),
 * the plan is stored in sessionStorage. This hook checks for that pending plan
 * and initiates checkout.
 */
export function usePendingCheckout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const checkPendingPlan = async () => {
      try {
        // Check sessionStorage (from signup flow) and localStorage (from checkout that survived session expiry)
        let pendingPlan = sessionStorage.getItem('pendingPlan') as PlanId | null;
        let billingIntervalOverride: BillingInterval | null = null;

        if (!pendingPlan) {
          // Check localStorage for plan saved before Stripe redirect
          const stored = localStorage.getItem('pendingCheckoutPlan');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              pendingPlan = parsed.planId as PlanId;
              billingIntervalOverride = parsed.billingInterval as BillingInterval;
            } catch { /* ignore parse errors */ }
            localStorage.removeItem('pendingCheckoutPlan');
          }
        }

        if (!pendingPlan) {
          setChecking(false);
          return;
        }

        // Clear the pending plan immediately to prevent loops
        sessionStorage.removeItem('pendingPlan');

        // Check if user already has an active subscription
        const subResponse = await api.stripe.getSubscription();
        if (subResponse.success && subResponse.data.isSubscribed) {
          // User already has a subscription, skip checkout
          setChecking(false);
          return;
        }

        // Start checkout process
        setCheckoutLoading(true);
        const billingInterval: BillingInterval = billingIntervalOverride || 'month';

        const response = await api.stripe.createCheckoutSession(pendingPlan, billingInterval);

        if (response.success && response.data.url) {
          // Redirect to Stripe Checkout
          window.location.href = response.data.url;
        } else {
          // If checkout fails, redirect to billing page
          router.push('/app/billing');
        }
      } catch (error) {
        console.error('Pending checkout error:', error);
        // On error, just continue to the app
        setChecking(false);
        setCheckoutLoading(false);
      }
    };

    checkPendingPlan();
  }, [router]);

  return { checking, checkoutLoading };
}
