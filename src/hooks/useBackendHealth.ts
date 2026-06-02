'use client';

import { useEffect, useRef, useState } from 'react';
import { computeBackendStatus, DOWN_THRESHOLD, type BackendStatus } from '@/lib/backend-health-state';
import type { DeployState } from '@/lib/railway-deploy-status';

/**
 * Polls the backend `/health` endpoint. When it goes down (>= DOWN_THRESHOLD
 * consecutive failures), asks the Vercel-side `/api/backend-status` route whether
 * Railway is mid-deploy, then maps the combined signal to a banner status.
 *
 *   ok       — backend reachable
 *   updating — backend down AND a deploy is in progress
 *   outage   — backend down AND not a deploy (or we couldn't tell — safe default)
 *
 * `/health` poll is unchanged from the prior version: fires on mount and every 30s,
 * 8s timeout, show-after-two-failures, clear-on-first-success. See
 * backend-health-state.ts for the pure mapping and its tests.
 */
export function useBackendHealth(): { status: BackendStatus } {
  const [status, setStatus] = useState<BackendStatus>('ok');
  const failuresRef = useRef(0);
  const deployStateRef = useRef<DeployState | 'pending'>('up');

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
    const healthUrl = `${apiBase}/health`;
    let cancelled = false;

    function recompute() {
      if (cancelled) return;
      setStatus(
        computeBackendStatus({
          healthOk: false,
          consecutiveFailures: failuresRef.current,
          deployState: deployStateRef.current,
        }),
      );
    }

    async function fetchDeployState(): Promise<DeployState> {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/backend-status', { cache: 'no-store', signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) return 'unknown';
        const json = await res.json();
        return json?.state === 'deploying' || json?.state === 'up' ? json.state : 'unknown';
      } catch {
        return 'unknown';
      }
    }

    async function check() {
      let ok = false;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(healthUrl, { method: 'GET', cache: 'no-store', signal: controller.signal });
        clearTimeout(t);
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (cancelled) return;

      if (ok) {
        failuresRef.current = 0;
        deployStateRef.current = 'up';
        setStatus('ok');
        return;
      }

      failuresRef.current += 1;
      if (failuresRef.current < DOWN_THRESHOLD) return; // single flake — stay silent

      // Down. Probe why; show nothing while pending, then resolve to updating/outage.
      deployStateRef.current = 'pending';
      recompute();
      const state = await fetchDeployState();
      if (cancelled) return;
      deployStateRef.current = state;
      recompute();
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { status };
}
