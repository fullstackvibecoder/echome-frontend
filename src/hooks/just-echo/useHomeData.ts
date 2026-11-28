'use client';

/**
 * useHomeData
 *
 * Loads the Just Echo home payload for the browser's time zone. A failed
 * first load leaves data null and error true; a failed refresh keeps the last good data; nothing is invented.
 */
import { useCallback, useEffect, useState } from 'react';
import { getHome, type HomeData } from '@/lib/just-echo-client';

export function useHomeData(): {
  data: HomeData | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchHome = useCallback(
    () => getHome(Intl.DateTimeFormat().resolvedOptions().timeZone),
    [],
  );
  const onData = useCallback((next: HomeData) => {
    setData(next);
    setError(false);
    setLoading(false);
  }, []);
  // A failed refresh keeps the last good data; only the error flag is set.
  const onFail = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      onData(await fetchHome());
    } catch {
      onFail();
    }
  }, [fetchHome, onData, onFail]);

  useEffect(() => {
    let cancelled = false;
    fetchHome().then(
      (next) => !cancelled && onData(next),
      () => !cancelled && onFail(),
    );
    return () => {
      cancelled = true;
    };
  }, [fetchHome, onData, onFail]);

  return { data, loading, error, refresh };
}
