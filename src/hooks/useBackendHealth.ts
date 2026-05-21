'use client';

import { useEffect, useState } from 'react';

/**
 * Polls the backend `/health` endpoint and reports whether it's reachable.
 *
 * Returns `true` once a check fails or times out; flips back to `false`
 * the moment a subsequent check returns 200. Used by:
 *   - OutageBanner (global sticky notice)
 *   - LoginContent inline notice (so users see why "Sign in" is dead)
 *
 * The check fires immediately on mount and every 30 seconds after.
 */
export function useBackendHealth(): { isDown: boolean } {
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

  return { isDown };
}
