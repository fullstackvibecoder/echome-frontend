'use client';

import { useBackendHealth } from '@/hooks/useBackendHealth';

/**
 * Sticky page-top banner. Two variants:
 *   - updating: calm slate notice during a Railway deploy (no status link)
 *   - outage:   amber service-disruption notice + Railway status link
 * Auto-hides when /health recovers. Deploy-vs-outage is decided by
 * useBackendHealth via the /api/backend-status route. Originally added
 * 2026-05-19 during a Railway Edge Network outage.
 */
export function OutageBanner() {
  const { status } = useBackendHealth();
  if (status === 'ok') return null;

  if (status === 'updating') {
    return (
      <div
        role="status"
        className="sticky top-0 z-[100] w-full bg-slate-700 text-white px-4 py-2.5 text-sm font-medium text-center shadow-sm"
      >
        EchoMe is updating — the app will be back in a moment.
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="sticky top-0 z-[100] w-full bg-amber-500 text-black px-4 py-2.5 text-sm font-medium text-center shadow-sm"
    >
      Our hosting provider is having a service disruption — generation, scheduling, and sign-in are temporarily unavailable. We&apos;re monitoring and the app will recover automatically once they&apos;re back.{' '}
      <a
        href="https://status.railway.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:no-underline"
      >
        Status →
      </a>
    </div>
  );
}
