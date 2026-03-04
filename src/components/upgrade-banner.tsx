'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';

const DISMISS_KEY = 'upgradeBannerDismissedAt';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * UpgradeBanner — Shows a persistent CTA for free users who have exhausted
 * their 2 free generations. Renders nothing for paid/trial users or
 * free users who still have generations remaining. Can be dismissed for 24h.
 */
export function UpgradeBanner() {
  const { isFreeUser, freeGenerationsRemaining, loading } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  }, []);

  if (loading || !isFreeUser || freeGenerationsRemaining > 0 || isDismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setIsDismissed(true);
  };

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent-purple/10 border border-primary/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative card-lift">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-black/5"
        aria-label="Dismiss upgrade banner"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="pr-6">
        <p className="text-sm font-semibold text-foreground">
          Your 2 free generations are used up
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Subscribe to unlock unlimited content creation, video clips, and more.
        </p>
      </div>
      <Link
        href="/app/billing"
        className="shrink-0 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all hover:scale-[1.02]"
      >
        View Plans
      </Link>
    </div>
  );
}
