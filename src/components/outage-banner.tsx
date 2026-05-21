'use client';

import { useBackendHealth } from '@/hooks/useBackendHealth';

/**
 * Sticky page-top banner shown when the backend is unreachable. Auto-hides
 * the moment /health comes back. See useBackendHealth for the polling
 * implementation.
 *
 * Added 2026-05-19 during a Railway Edge Network outage that left the
 * Vercel frontend up but the Railway backend unreachable.
 */
export function OutageBanner() {
  const { isDown } = useBackendHealth();
  if (!isDown) return null;

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
