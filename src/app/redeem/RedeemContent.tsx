'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <Link href="/" className="text-2xl font-bold text-gray-900">EchoMe</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {status === 'validating' && (
            <p className="text-gray-500">Checking your access...</p>
          )}

          {status === 'redeeming' && (
            <p className="text-gray-500">Activating your {tier} access...</p>
          )}

          {status === 'needsAuth' && partner && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                {partner.partnerName} is upgrading you to {tier}
              </h1>
              <p className="text-gray-600 mb-6">
                It's free for {termLabel(partner.termDays)}, with no card required. Create your
                account to claim it, or sign in if you already have one.
              </p>
              <button
                onClick={() => goToAuth('/auth/signup')}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg py-3 transition mb-3"
              >
                Create your account
              </button>
              <button
                onClick={() => goToAuth('/auth/login')}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg py-3 transition"
              >
                I already have an account
              </button>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">You're on {tier}</h1>
              <p className="text-gray-600 mb-6">
                Your access is active{expiresAt ? ` through ${formatDate(expiresAt)}` : ''}. Time to
                turn your voice into content.
              </p>
              <Link
                href="/app"
                className="inline-block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg py-3 transition"
              >
                Go to Echo
              </Link>
            </>
          )}

          {status === 'already' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">You're all set</h1>
              <p className="text-gray-600 mb-6">
                You already have {tier} access{expiresAt ? ` through ${formatDate(expiresAt)}` : ''}.
                No need to claim it again.
              </p>
              <Link
                href="/app"
                className="inline-block w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg py-3 transition"
              >
                Go to Echo
              </Link>
            </>
          )}

          {status === 'invalid' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">This link isn't valid</h1>
              <p className="text-gray-600">{errorMsg}</p>
              <p className="text-sm text-gray-400 mt-4">
                Check the link in your welcome email, or reach out to whoever sent it to you.
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-3">Something went wrong</h1>
              <p className="text-gray-600 mb-4">{errorMsg}</p>
              <button
                onClick={() => { redeemStarted.current = false; router.refresh(); window.location.reload(); }}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg py-3 transition"
              >
                Try again
              </button>
            </>
          )}
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition">
            Back to EchoMe
          </Link>
        </div>
      </div>
    </div>
  );
}
