'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import type { AdvisorResponse } from '@/types/advisor';

export interface UseAdvisorResult {
  advisor: AdvisorResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches the KB advisor for the Echo thread. The advisor drives the in-thread
 * coverage line, gap nudges, and autopilot proposals. Fetches once on mount;
 * `refetch` re-runs it (used after a voice-ingest import so the empty state
 * advances to thin/rich in place).
 */
export function useAdvisor(): UseAdvisorResult {
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchAdvisor = useCallback(async () => {
    try {
      const res = await api.kb.advisor();
      if (!mountedRef.current) return;
      if (res?.success && res.data) {
        setAdvisor(res.data);
        setError(null);
      } else {
        setAdvisor(null);
        setError(res?.error ?? 'Advisor unavailable');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setAdvisor(null);
      setError(extractErrorMessage(e, 'Advisor failed'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdvisor();
  }, [fetchAdvisor]);

  return { advisor, loading, error, refetch: fetchAdvisor };
}
