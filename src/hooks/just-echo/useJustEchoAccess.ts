'use client';

import { useEffect, useState } from 'react';
import { getJustEchoAccess } from '@/lib/just-echo-client';

export type JustEchoAccess = 'loading' | 'on' | 'off';

const key = (userId: string) => `je-access:${userId}`;

function readCache(userId: string | null): JustEchoAccess {
  if (!userId) return 'off';
  try {
    const v = localStorage.getItem(key(userId));
    if (v === '1') return 'on';
    if (v === '0') return 'off';
  } catch {
    // storage blocked: behaves as no cache
  }
  return 'loading';
}

/**
 * Whether this user sees the Just Echo shell. The cached answer renders at
 * once; the server answer replaces it (and the cache) once per user per mount.
 */
export function useJustEchoAccess(userId: string | null): JustEchoAccess {
  const [state, setState] = useState<{ userId: string | null; value: JustEchoAccess }>(() => ({
    userId,
    value: readCache(userId),
  }));

  // userId changed: re-read the cache for the new user (derived state, no effect lag).
  let current = state;
  if (state.userId !== userId) {
    current = { userId, value: readCache(userId) };
    setState(current);
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getJustEchoAccess()
      .then((on) => {
        try {
          localStorage.setItem(key(userId), on ? '1' : '0');
        } catch {
          // storage blocked: state still updates
        }
        if (!cancelled) setState({ userId, value: on ? 'on' : 'off' });
      })
      .catch(() => {
        // keep the cached value; with none cached, fall back to classic
        if (!cancelled) setState((s) => (s.userId === userId && s.value === 'loading' ? { userId, value: 'off' } : s));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return userId ? current.value : 'off';
}
