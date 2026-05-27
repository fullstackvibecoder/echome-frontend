'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Polls the backend `/health` endpoint and reports whether it's reachable.
 *
 * Asymmetric thresholds (post-2026-05-27 — paid user Ressie was seeing the
 * amber OutageBanner persistently because the prior fail-once-show-immediately
 * pattern fired on every Railway deploy window, cold-ish response, or
 * transient 5xx blip):
 *   - SHOW the banner only after TWO consecutive failed checks (so a single
 *     transient flake doesn't flag the backend as down).
 *   - CLEAR the banner on the FIRST successful check (recovery is fast and
 *     we don't want users staring at false-positive doom).
 *
 * Returns `true` once two checks in a row fail; flips back to `false` on
 * any successful subsequent check. Used by:
 *   - OutageBanner (global sticky notice)
 *   - LoginContent inline notice (so users see why "Sign in" is dead)
 *
 * The check fires immediately on mount and every 30 seconds after. Timeout
 * widened from 5s to 8s — Railway sometimes responds in 5-7s on cold paths.
 */
export function useBackendHealth(): { isDown: boolean } {
  const [isDown, setIsDown] = useState(false);
  // Tracks consecutive failures. Synchronous ref (not state) so two adjacent
  // failed checks always see the latest counter without waiting for a render.
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
    const healthUrl = `${apiBase}/health`;

    let cancelled = false;

    async function check() {
      let ok = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(healthUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        ok = res.ok;
      } catch {
        ok = false;
      }

      if (cancelled) return;

      if (ok) {
        consecutiveFailuresRef.current = 0;
        setIsDown(false);
      } else {
        consecutiveFailuresRef.current += 1;
        // Only show the banner after the SECOND consecutive failure. Single
        // flakes (deploy windows, transient 5xx, cold-ish responses) don't
        // surface to users.
        if (consecutiveFailuresRef.current >= 2) {
          setIsDown(true);
        }
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
