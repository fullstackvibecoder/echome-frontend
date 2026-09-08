'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { api } from '@/lib/api-client';
import { isGmailConnectEnabled } from '@/lib/flags';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

/**
 * Onboarding step after WBTW review: offer Gmail as a voice source.
 *
 * The OAuth round-trip leaves the SPA entirely (window.location.assign to
 * Google), and the backend redirects back here with ?gmail=connected or
 * ?gmail=error. So this component has two jobs: pitch + kick off, and
 * handle the landing.
 */
export default function ConnectContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [starting, setStarting] = useState(false);

  const enabled = isGmailConnectEnabled();
  const outcome = search.get('gmail');

  useEffect(() => {
    if (!enabled) {
      router.replace('/app');
      return;
    }
    if (outcome === 'connected') {
      showSuccessToast('Gmail connected. Echo is reading your sent mail.');
      router.replace('/app');
    } else if (outcome === 'error') {
      showErrorToast(new Error('Gmail connection failed'), 'connecting Gmail');
    }
    // router is stable; enabled/outcome are derived from env + url
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, outcome]);

  const handleConnect = async () => {
    setStarting(true);
    try {
      const res = await api.social.connectGmail('onboarding');
      if (!res.success || !res.data?.authUrl) {
        throw new Error('No auth url returned');
      }
      window.location.assign(res.data.authUrl);
    } catch (err) {
      showErrorToast(err, 'connecting Gmail');
      setStarting(false);
    }
  };

  if (!enabled) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Mail className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Connect Gmail so Echo learns how you actually write.
      </h1>
      <p className="text-muted-foreground">
        It reads sent mail only. Nothing is kept except your own words. Disconnect any time.
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={handleConnect}
          disabled={starting}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          Connect Gmail
        </button>
        <button
          type="button"
          onClick={() => router.push('/app')}
          disabled={starting}
          className="inline-flex items-center justify-center rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          Skip for now
        </button>
      </div>
    </main>
  );
}
