'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api-client';

export default function CallbackContent() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (Supabase OAuth puts tokens in hash)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          // Store the access token for API calls
          localStorage.setItem('authToken', data.session.access_token);

          // Decide whether to send the user through onboarding. The legacy
          // gate only checked "does the KB have items?" — but ~30% of users
          // with a KB end up empty (declined the privacy disclosure, lookup
          // capped, ingest failed, just never tried). On their next login
          // the empty-KB check sent them BACK to /onboarding/lookup, and so
          // on every login forever. The fix: also honor a prior WBTW
          // outcome marker. If the user has any outcome on record (success,
          // declined, capped, errored), they've already been through the
          // funnel once — don't loop them.
          let alreadyOnboarded = false;
          try {
            const kbResponse = await api.kb.list();
            if (kbResponse.success && kbResponse.data && kbResponse.data.length > 0) {
              const contentResponse = await api.kb.getContent(kbResponse.data[0].id);
              if (contentResponse.success && contentResponse.data) {
                alreadyOnboarded = contentResponse.data.items.length > 0;
              }
            }
          } catch {
            // If KB check fails, default to NOT redirecting — better to land
            // on /app than to loop existing users through onboarding.
            alreadyOnboarded = true;
          }

          if (!alreadyOnboarded) {
            // KB is empty. Before sending the user to onboarding, check
            // whether they've already been through it (declined, completed,
            // or hit an error). Any prior outcome means they've seen the
            // disclosure once — don't show it again.
            try {
              const outcomeResponse = await api.wbtw.outcome();
              if (outcomeResponse?.outcome) {
                alreadyOnboarded = true;
              }
            } catch {
              // Outcome lookup is best-effort; default behavior continues.
            }
          }

          if (!alreadyOnboarded) {
            // Truly first-time user with no prior outcome — run the
            // onboarding lookup flow (privacy disclosure → public-data
            // lookup → review → /app).
            router.push('/onboarding/lookup');
          } else {
            // Check for stored redirect path (from 401 session expiry)
            const redirectPath = localStorage.getItem('redirectAfterLogin');
            if (redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
              localStorage.removeItem('redirectAfterLogin');
              router.push(redirectPath);
            } else {
              localStorage.removeItem('redirectAfterLogin');
              router.push('/app');
            }
          }
        } else {
          // No session, redirect to login
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="card animate-fade-in text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Authentication Failed
          </h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={() => router.push('/auth/login')}
          className="btn-primary"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Signing you in...
        </h1>
        <p className="text-muted-foreground">
          Please wait while we complete your authentication.
        </p>
      </div>
    </div>
  );
}
