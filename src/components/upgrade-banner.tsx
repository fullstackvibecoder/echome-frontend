'use client';

import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';

/**
 * UpgradeBanner — Shows a persistent CTA for free users who have exhausted
 * their 2 free generations. Renders nothing for paid/trial users or
 * free users who still have generations remaining.
 */
export function UpgradeBanner() {
  const { isFreeUser, freeGenerationsRemaining, loading } = useSubscription();

  if (loading || !isFreeUser || freeGenerationsRemaining > 0) return null;

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 border border-[#00D4FF]/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Your 2 free generations are used up
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Subscribe to unlock unlimited content creation, video clips, and more.
        </p>
      </div>
      <Link
        href="/app/billing"
        className="shrink-0 px-4 py-2 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all hover:scale-[1.02]"
      >
        View Plans
      </Link>
    </div>
  );
}
