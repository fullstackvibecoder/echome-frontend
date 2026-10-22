'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isBundleStale,
  shouldCheckNow,
  POLL_INTERVAL_MS,
  VISIBILITY_MIN_INTERVAL_MS,
} from './deploy-version';

/**
 * The SHA baked into this bundle at build time, so it reflects what the tab
 * is actually running rather than what the server serves now. Inlined via
 * the `env` key in next.config.ts; "dev" locally, which disables staleness.
 */
const BUNDLE_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev';

/**
 * Polls /api/version every 5 minutes, and when the tab becomes visible
 * (at most once a minute), and reports `stale: true` once the server is
 * running a different commit. Never throws; staleness only latches on.
 */
export function useDeployVersion(): { stale: boolean } {
  const [stale, setStale] = useState(false);
  const lastCheckAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      lastCheckAtRef.current = Date.now();
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data: unknown = await res.json();
        const serverSha = data && typeof data === 'object' ? (data as { sha?: unknown }).sha : undefined;
        if (!cancelled && isBundleStale(BUNDLE_SHA, serverSha)) setStale(true);
      } catch {
        // Offline or flaky network. Try again on the next tick.
      }
    };

    void check();
    const interval = setInterval(() => void check(), POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!shouldCheckNow(lastCheckAtRef.current, Date.now(), VISIBILITY_MIN_INTERVAL_MS)) return;
      void check();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return { stale };
}
