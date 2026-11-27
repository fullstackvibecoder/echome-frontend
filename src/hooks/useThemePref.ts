'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyThemePref,
  readThemePref,
  resolveTheme,
  systemPrefersDark,
  type ResolvedTheme,
  type ThemePref,
} from '@/lib/theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function useThemePref(): {
  pref: ThemePref;
  resolved: ResolvedTheme;
  setPref: (p: ThemePref) => void;
} {
  // Initial render is 'system' so server and client markup match; storage is read after mount.
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = readThemePref();
    // Post-mount read of an external store (localStorage) keeps SSR markup identical.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefState(stored);
    setResolved(resolveTheme(stored, systemPrefersDark()));
  }, []);

  useEffect(() => {
    if (pref !== 'system' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = () => setResolved(applyThemePref('system'));
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [pref]);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    setResolved(applyThemePref(next));
  }, []);

  return { pref, resolved, setPref };
}
