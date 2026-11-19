'use client';

/**
 * Keeps a pending ?redirect= (e.g. the EchoMe in Claude consent page, or a
 * partner redeem link) when the user switches between login and signup, so
 * the URL fallback survives alongside localStorage. Same-origin paths only.
 */
import { useSyncExternalStore } from 'react';

export function safeRedirectPath(value: string | null | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function withRedirect(path: string, redirect: string | null): string {
  return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
}

const noSubscribe = () => () => {};

/** The page's ?redirect= (same-origin only); null during server render. */
export function usePendingRedirect(): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => safeRedirectPath(new URLSearchParams(window.location.search).get('redirect')),
    () => null,
  );
}
