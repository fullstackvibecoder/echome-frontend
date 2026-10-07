'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Scorecard } from '@/types/insights';

export type ScorecardStatus = 'loading' | 'ready' | 'locked' | 'hidden';

export interface UseScorecardResult {
  status: ScorecardStatus;
  data?: Scorecard;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour, matches the backend's server-side cache.

let cache: { at: number; value: Scorecard } | null = null;

/** Test-only escape hatch: the module-level cache otherwise leaks between test cases. */
export function resetScorecardCache(): void {
  cache = null;
}

export function useScorecard(): UseScorecardResult {
  const [result, setResult] = useState<UseScorecardResult>(() => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return { status: 'ready', data: cache.value };
    }
    return { status: 'loading' };
  });

  useEffect(() => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await api.insights.getScorecard();
        if (cancelled) return;
        if (response.success && response.data) {
          cache = { at: Date.now(), value: response.data };
          setResult({ status: 'ready', data: response.data });
        } else {
          setResult({ status: 'hidden' });
        }
      } catch (err) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
        if (status === 403 && code === 'QUOTA_EXCEEDED') {
          setResult({ status: 'locked' });
        } else {
          setResult({ status: 'hidden' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return result;
}
