'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

type Status =
  | 'validating'   // checking the code with the backend
  | 'invalid'      // missing / unknown / disabled code
  | 'needsAuth'    // code is good, but the visitor isn't signed in yet
  | 'redeeming'    // signed in, claim POST in flight
  | 'success'      // freshly provisioned
  | 'already'      // idempotent re-claim — they already had the seat
  | 'error';       // claim failed server-side

interface PartnerInfo {
  partnerName: string;
  tier: string;
  termDays: number;
}

const tierLabel = (tier: string) =>
  tier === 'studio' ? 'Echo Studio' : tier === 'pro' ? 'Echo Pro' : `Echo ${tier}`;

const termLabel = (days: number) =>
  days >= 365 ? `${Math.round(days / 365)} year${days >= 730 ? 's' : ''}` : `${days} days`;

// Retail value we surface to the member, per tier. Studio annual = $870.
// Gated so a non-studio partner code never renders the wrong figure.
const RETAIL_VALUE_USD: Record<string, number> = { studio: 870 };

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function RedeemContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code') || '';
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<Status>('validating');
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const redeemStarted = useRef(false);

  // Step 1: validate the code (public, runs once).
  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      setErrorMsg('This link is missing its access code.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/partner/validate', { params: { code } });
        if (cancelled) return;
        if (res.data?.valid) {
          setPartner({
            partnerName: res.data.partnerName,
            tier: res.data.tier,
            termDays: res.data.termDays,
          });
        } else {
          setStatus('invalid');
          setErrorMsg(res.data?.error || 'This access code is invalid or expired.');
        }
      } catch (err: any) {
        if (cancelled) return;
        setStatus('invalid');
        setErrorMsg(err?.response?.data?.error || 'This access code is invalid or expired.');
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  // Step 2: once the code is good and auth state has settled, either claim
  // (signed in) or prompt for signup/login (cold visitor).
  useEffect(() => {
    if (!partner || authLoading) return;

    if (!isAuthenticated) {
      setStatus('needsAuth');
      return;
    }

    if (redeemStarted.current) return;
    redeemStarted.current = true;
    setStatus('redeeming');

    (async () => {
      try {
        const res = await apiClient.post('/partner/redeem', { code });
        if (res.data?.success) {
          setExpiresAt(res.data.expiresAt || '');
          setStatus(res.data.alreadyRedeemed ? 'already' : 'success');
        } else {
          setStatus('error');
          setErrorMsg(res.data?.error || 'We could not activate your access. Please try again.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err?.response?.data?.error || 'We could not activate your access. Please try again.');
      }
    })();
  }, [partner, authLoading, isAuthenticated, code]);

  // Stash where to return to, then send the cold visitor through normal auth.
  // Belt-and-suspenders: the destination rides in BOTH localStorage AND the
  // ?redirect= URL param. localStorage is the primary (survives Google OAuth's
  // round-trip); the URL param is the visible, wipe-proof fallback that login()
  // and signup() both honor if storage was cleared between steps.
  const goToAuth = (path: '/auth/signup' | '/auth/login') => {
    const dest = `/redeem?code=${encodeURIComponent(code)}`;
    localStorage.setItem('redirectAfterLogin', dest);
    router.push(`${path}?redirect=${encodeURIComponent(dest)}`);
  };

  const tier = partner ? tierLabel(partner.tier) : 'Echo Studio';
  const term = partner ? termLabel(partner.termDays) : '1 year';
  const retailValue = partner ? RETAIL_VALUE_USD[partner.tier] : undefined;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-6 py-12 overflow-hidden">
      {/* Ambient brand wash — mirrors the marketing pricing section. */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent-purple/10 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/media/echome-logo.svg"
              alt="EchoMe"
              width={40}
              height={40}
              className="object-contain transition-transform group-hover:scale-110"
            />
            <span className="text-2xl font-bold tracking-tight text-foreground">EchoMe</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl shadow-lift border border-border p-8">
          {status === 'validating' && (
            <p className="text-muted-foreground">Checking your access...</p>
          )}

          {status === 'redeeming' && (
            <p className="text-muted-foreground">Activating your {tier} access...</p>
          )}

          {status === 'needsAuth' && partner && (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-primary-interactive mb-3">
                Invited by {partner.partnerName}
              </p>
              <h1 className="font-headline text-2xl font-extrabold text-foreground leading-tight mb-2">
                Welcome to EchoMe
              </h1>
              <p className="text-muted-foreground mb-6">
                {partner.partnerName} has unlocked full {tier} for you, free for {term}. No card
                required, nothing to pay today.
              </p>

              {/* Value highlight */}
              <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-accent-purple/5 p-4 mb-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-headline text-3xl font-extrabold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                    Free
                  </span>
                  {retailValue && (
                    <span className="text-sm text-muted-foreground line-through">
                      ${retailValue} value
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tier}, yours for a full {term}
                </p>
              </div>

              {/* Reassurance bullets */}
              <ul className="text-left text-sm text-muted-foreground space-y-2 mb-6">
                <li className="flex gap-2">
                  <span className="text-primary-interactive font-bold">✓</span>
                  Every {tier} feature, unlocked from day one
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-interactive font-bold">✓</span>
                  Add more voices anytime at retail price
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-interactive font-bold">✓</span>
                  Switches to free automatically at year end, no surprise charges
                </li>
              </ul>

              <button
                onClick={() => goToAuth('/auth/signup')}
                className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-full py-3.5 shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all mb-3"
              >
                Claim your free year
              </button>
              <button
                onClick={() => goToAuth('/auth/login')}
                className="w-full border border-border hover:bg-background text-foreground font-semibold rounded-full py-3 transition"
              >
                I already have an account
              </button>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="font-headline text-2xl font-extrabold text-foreground mb-3">
                You&apos;re on {tier}
              </h1>
              <p className="text-muted-foreground mb-6">
                Your free year is active{expiresAt ? ` through ${formatDate(expiresAt)}` : ''}. Next,
                let&apos;s teach Echo to write in your voice.
              </p>
              {/* Fresh members go through WBTW first-run lookup (auto-pulls their
                  public content and maps their voice) before landing in /app.
                  Re-claims below skip straight to /app — they've onboarded already. */}
              <Link
                href="/onboarding/lookup"
                className="inline-block w-full bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-full py-3.5 shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Set up your voice
              </Link>
            </>
          )}

          {status === 'already' && (
            <>
              <h1 className="font-headline text-2xl font-extrabold text-foreground mb-3">
                You&apos;re all set
              </h1>
              <p className="text-muted-foreground mb-6">
                You already have {tier} access{expiresAt ? ` through ${formatDate(expiresAt)}` : ''}.
                No need to claim it again.
              </p>
              <Link
                href="/app"
                className="inline-block w-full bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-full py-3.5 shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Go to Echo
              </Link>
            </>
          )}

          {status === 'invalid' && (
            <>
              <h1 className="font-headline text-2xl font-extrabold text-foreground mb-3">
                This link isn&apos;t valid
              </h1>
              <p className="text-muted-foreground">{errorMsg}</p>
              <p className="text-sm text-muted-foreground/70 mt-4">
                Check the link in your welcome email, or reach out to whoever sent it to you.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="font-headline text-2xl font-extrabold text-foreground mb-3">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-4">{errorMsg}</p>
              <button
                onClick={() => { redeemStarted.current = false; router.refresh(); window.location.reload(); }}
                className="w-full bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-full py-3.5 shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Try again
              </button>
            </>
          )}
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            Back to EchoMe
          </Link>
        </div>
      </div>
    </div>
  );
}
