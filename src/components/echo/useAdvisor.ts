'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { AdvisorResponse } from '@/types/advisor';

export interface UseAdvisorResult {
  advisor: AdvisorResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the KB advisor once on mount for the Echo thread. The advisor drives
 * the in-thread coverage line, gap nudges, and autopilot proposals. Read-only.
 */
export function useAdvisor(): UseAdvisorResult {
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.kb.advisor();
        if (!alive) return;
        if (res?.success && res.data) {
          setAdvisor(res.data);
          setError(null);
        } else {
          setAdvisor(null);
          setError('Advisor unavailable');
        }
      } catch (e) {
        if (!alive) return;
        setAdvisor(null);
        setError(e instanceof Error ? e.message : 'Advisor failed');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { advisor, loading, error };
}
