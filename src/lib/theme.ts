export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'echome-theme';

export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemDark ? 'dark' : 'light';
}

export function readThemePref(): ThemePref {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyThemePref(pref: ThemePref): ResolvedTheme {
  try {
    if (pref === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage unavailable (private mode, blocked): the attribute still applies for this page.
  }
  const resolved = resolveTheme(pref, systemPrefersDark());
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

/**
 * Inline script that runs before first paint so the correct data-theme is set
 * with no flash. Self-contained: no imports, only localStorage and matchMedia.
 * Keep the rules in sync with resolveTheme/readThemePref above.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var s=null;try{s=localStorage.getItem('${THEME_STORAGE_KEY}');}catch(e){}var t;if(s==='light'||s==='dark'){t=s;}else{try{t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}catch(e){t='light';}}document.documentElement.setAttribute('data-theme',t);})();`;
