'use client';

import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useJustEchoAccess } from '@/hooks/just-echo/useJustEchoAccess';

const JustEchoApp = dynamic(() => import('./JustEchoApp').then((m) => m.JustEchoApp), {
  ssr: false,
});

// The new shell only understands these. Any other key (topic, transfer,
// echoFile, echoPrompt, echoAsk, classic, ...) is a classic deep link.
const SHELL_PARAMS = new Set(['c', 'open']);

// Marketing tracking keys that ride along on email links; they never mean classic.
function isTracking(key: string): boolean {
  return key.startsWith('utm_') || key === 'fbclid' || key === 'gclid' || key === 'ref';
}

export function ShellSwitch({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();
  const access = useJustEchoAccess(user?.id ?? null);

  const shellRoute =
    pathname === '/app' && Array.from(params.keys()).every((k) => SHELL_PARAMS.has(k) || isTracking(k));

  if (shellRoute && access === 'on') return <JustEchoApp />;
  if (shellRoute && access === 'loading') {
    return <div className="je je-canvas min-h-screen" aria-hidden="true" />;
  }
  return <>{children}</>;
}
