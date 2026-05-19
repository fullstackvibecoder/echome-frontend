'use client';

import { useEffect, useState } from 'react';

/**
 * Surfaces a banner across every page when the backend is unreachable.
 *
 * Polls `/health` on mount and every 30 seconds. The banner appears after
 * a failed check and disappears as soon as the backend returns 200 — so
 * we don't have to hand-remove it when the upstream provider recovers.
 *
 * Added 2026-05-19 during a Railway Edge Network outage that left the
 * Vercel frontend up but the Railway backend unreachable; users were
 * clicking "Sign in" and seeing nothing happen.
 */
export function OutageBanner() {
  const [isDown, setIsDown] = useState(false);

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
    const healthUrl = `${apiBase}/health`;

    let cancelled = false;

    async function check() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(healthUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (cancelled) return;
        setIsDown(!res.ok);
      } catch {
        if (cancelled) return;
        setIsDown(true);
      }
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
