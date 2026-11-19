'use client';

/**
 * EchoMe in Claude consent screen (spec 2026-11-18 §9.1). Claude (or another
 * MCP app) sends the user here to sign in and approve. The backend validates
 * everything; this page only renders and forwards the decision.
 *
 * Signed out: stash this URL and go through login/signup, which return here.
 * Untrusted app or return address: show the error, never redirect.
 * Not Studio: upgrade page, no grant.
 * Already approved this app: finish silently.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { extractErrorMessage } from '@/lib/error-utils';
import {
  checkAuthorize,
  decideAuthorize,
  isSafeRedirectTarget,
  readAuthorizeParams,
  type ConsentClient,
} from '@/lib/oauth-consent';

type View =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'plan'; message: string }
  | { kind: 'consent'; client: ConsentClient; email: string | null; csrfToken: string }
  | { kind: 'leaving' };

export const CONSENT_LINE =
  'read your voice, kits and schedule, draft posts and kits, and schedule or post after you confirm each one.';

export default function AuthorizeContent() {
  const search = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const params = useMemo(() => readAuthorizeParams(search), [search]);
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const leave = (url: string) => {
    if (!isSafeRedirectTarget(url)) {
      setView({ kind: 'error', message: 'This app asked to return somewhere unsafe, so EchoMe stopped here.' });
      return;
    }
    setView({ kind: 'leaving' });
    window.location.assign(url);
  };

  useEffect(() => {
    if (authLoading || started.current) return;
    if (!isAuthenticated) {
      started.current = true;
      const here = `${window.location.pathname}${window.location.search}`;
      try {
        localStorage.setItem('redirectAfterLogin', here);
      } catch {
        // storage blocked: the ?redirect= param below still carries it
      }
      router.replace(`/auth/login?redirect=${encodeURIComponent(here)}`);
      return;
    }
    started.current = true;
    (async () => {
      try {
        const res = await checkAuthorize(params);
        if (res.kind === 'render_error') return setView({ kind: 'error', message: res.message });
        if (res.kind === 'redirect') return leave(res.redirectTo);
        if (res.kind === 'plan_required') return setView({ kind: 'plan', message: res.message });
        if (res.silent) return leave(await decideAuthorize(params, res.csrfToken, 'allow'));
        setView({ kind: 'consent', client: res.client, email: res.email, csrfToken: res.csrfToken });
      } catch (err) {
        setView({ kind: 'error', message: extractErrorMessage(err, 'Could not load this request. Try connecting again from the app.') });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, params]);

  const decide = async (decision: 'allow' | 'deny') => {
    if (view.kind !== 'consent' || busy) return;
    setBusy(true);
    try {
      leave(await decideAuthorize(params, view.csrfToken, decision));
    } catch (err) {
      setBusy(false);
      setView({ kind: 'error', message: extractErrorMessage(err, 'Could not finish connecting. Try again from the app.') });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="max-w-md w-full">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src="/media/echome-logo.svg" alt="" width={36} height={36} className="object-contain" />
          <span className="text-xl font-bold tracking-tight text-foreground">EchoMe</span>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8">
          {(view.kind === 'loading' || view.kind === 'leaving') && (
            <p className="text-center text-muted-foreground">
              {view.kind === 'leaving' ? 'Returning you to the app...' : 'Checking this request...'}
            </p>
          )}

          {view.kind === 'error' && (
            <div className="text-center" role="alert">
              <h1 className="text-lg font-semibold text-foreground mb-2">This connection can&apos;t continue</h1>
              <p className="text-muted-foreground">{view.message}</p>
            </div>
          )}

          {view.kind === 'plan' && (
            <div className="text-center">
              <h1 className="text-lg font-semibold text-foreground mb-2">EchoMe in Claude is part of Studio</h1>
              <p className="text-muted-foreground mb-6">{view.message}</p>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                See plans
              </Link>
            </div>
          )}

          {view.kind === 'consent' && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                {view.client.logoUri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={view.client.logoUri} alt="" className="h-10 w-10 rounded-lg object-contain border border-border" />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-lg font-semibold text-muted-foreground">
                    {view.client.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-foreground truncate">{view.client.name}</h1>
                  <p className="text-xs text-muted-foreground truncate">Returns to {view.client.redirectHost}</p>
                </div>
              </div>

              <p className="text-foreground mb-4">
                Let {view.client.name} act as you in EchoMe: {CONSENT_LINE}
              </p>

              {view.email && (
                <p className="text-sm text-muted-foreground mb-6">
                  Signed in as <span className="font-medium text-foreground">{view.email}</span>
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => decide('deny')}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  Deny
                </button>
                <button
                  type="button"
                  onClick={() => decide('allow')}
                  disabled={busy}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? 'Connecting...' : 'Allow'}
                </button>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">
                You can disconnect anytime in Settings, under EchoMe in Claude.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
