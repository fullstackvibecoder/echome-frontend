'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, CheckCircle2, Loader2, ArrowRight, Shield } from 'lucide-react';
import { api } from '@/lib/api-client';
import { showInfoToast } from '@/lib/toast';

// ============================================
// Echo avatar (mirrors the existing onboarding chat shape)
// ============================================

function EchoAvatar() {
  return (
    <div
      className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
      style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)' }}
    >
      <Sparkles className="w-5 h-5 text-white" />
    </div>
  );
}

// The four sources the backend reads. We simulate progress for perceived
// speed; the response itself is one shot, so on resolution we mark them all ✓.
const LOOKUP_SOURCES: Array<{ key: string; label: string }> = [
  { key: 'brand', label: 'Reading your brand site' },
  { key: 'remax', label: 'Reading remax.ca' },
  { key: 'nar', label: 'Reading realtor.ca' },
  { key: 'instagram', label: 'Reading your Instagram' },
];

type SourceStatus = 'pending' | 'reading' | 'done';

// ============================================
// MAIN COMPONENT
// ============================================

export default function LookupContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<'disclosure' | 'looking' | 'done' | 'redirecting'>(
    'disclosure'
  );
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, SourceStatus>>(
    Object.fromEntries(LOOKUP_SOURCES.map(s => [s.key, 'pending'])) as Record<string, SourceStatus>
  );
  const [firstName, setFirstName] = useState<string>('');
  const lookupFiredRef = useRef(false);

  // Try to greet the user by name (optional polish — silent if unavailable).
  useEffect(() => {
    (async () => {
      try {
        const res = await api.auth.getProfile();
        const name = res?.data?.display_name || res?.data?.full_name;
        if (name) setFirstName(name.trim().split(/\s+/)[0]);
      } catch {
        // Silent — name greeting is decorative.
      }
    })();
  }, []);

  // Animate "Reading X" lines while the backend works. Each source ticks
  // through pending → reading → done. The actual response will mark all done.
  const startProgressAnimation = useCallback(() => {
    let cancelled = false;
    const tick = (i: number) => {
      if (cancelled || i >= LOOKUP_SOURCES.length) return;
      const key = LOOKUP_SOURCES[i].key;
      setSourceStatuses(prev => ({ ...prev, [key]: 'reading' }));
      // Mark done after a beat, then start the next.
      setTimeout(() => {
        if (cancelled) return;
        setSourceStatuses(prev => ({ ...prev, [key]: 'done' }));
        tick(i + 1);
      }, 1200);
    };
    tick(0);
    return () => {
      cancelled = true;
    };
  }, []);

  // Run the lookup once the user accepts the privacy disclosure.
  const runLookup = useCallback(async () => {
    if (lookupFiredRef.current) return;
    lookupFiredRef.current = true;
    setPhase('looking');
    const stopAnimation = startProgressAnimation();

    try {
      const result = await api.wbtw.lookup();

      // Backend returned — finalize all sources visually.
      stopAnimation();
      setSourceStatuses(
        Object.fromEntries(LOOKUP_SOURCES.map(s => [s.key, 'done'])) as Record<string, SourceStatus>
      );
      setPhase('done');

      const fields = result?.fields ?? {};
      const hasAnyField =
        fields && typeof fields === 'object' && Object.keys(fields).length > 0;

      // Brief pause so the user sees the ✓ row before transitioning.
      setTimeout(() => {
        if (hasAnyField) {
          router.push('/onboarding/lookup/review');
        } else {
          // Empty profile is a valid response — degrade gracefully.
          showInfoToast(
            "Couldn't find much yet",
            "Drop a video, paste a link, or type a topic — Echo learns from anything you give it."
          );
          router.push('/app');
        }
      }, 600);
    } catch (err: unknown) {
      stopAnimation();
      // 402 (cost cap / free-tier used), 404 (flag off), 429 (rate limit) →
      // silent fallthrough. Per the handoff: no scary errors at signup.
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? 0;
      if (status === 402 || status === 404 || status === 429) {
        setPhase('redirecting');
        router.push('/app');
        return;
      }
      // Unexpected (5xx, network) — silent fallthrough too. Better to land
      // the user in the app than to show an error on their first session.
      setPhase('redirecting');
      router.push('/app');
    }
  }, [router, startProgressAnimation]);

  // If the user declines, drop them at /app — no scary banner, just go.
  const handleDecline = useCallback(() => {
    router.push('/app');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — minimal, mirrors onboarding shell */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <span className="text-lg font-bold text-accent">EchoMe</span>
        {phase === 'disclosure' && (
          <button
            onClick={handleDecline}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {phase === 'disclosure' && (
            <DisclosurePanel
              firstName={firstName}
              onAccept={runLookup}
              onDecline={handleDecline}
            />
          )}

          {(phase === 'looking' || phase === 'done') && (
            <LookingPanel
              firstName={firstName}
              sourceStatuses={sourceStatuses}
              done={phase === 'done'}
            />
          )}

          {phase === 'redirecting' && (
            <div className="flex items-center gap-3 pl-2 sm:pl-[52px] text-sm text-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Taking you in…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function DisclosurePanel({
  firstName,
  onAccept,
  onDecline,
}: {
  firstName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const greeting = firstName ? `Hey ${firstName} — ` : '';
  return (
    <>
      {/* Echo opening — chat bubble */}
      <div className="flex gap-3 items-start">
        <EchoAvatar />
        <div className="max-w-[85%] bg-white/[0.03] backdrop-blur-xl text-text-primary px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/[0.06] text-sm leading-relaxed">
          {greeting}before we start, give me 30 seconds. I&apos;d rather read what&apos;s
          already public about you than ask you to fill out a profile.
        </div>
      </div>

      {/* Privacy disclosure card */}
      <div className="pl-2 sm:pl-[52px]">
        <div className="rounded-2xl border border-border bg-card p-5 max-w-xl">
          <div className="flex items-start gap-3 mb-3">
            <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-semibold text-text-primary">
              What I&apos;ll read, and what I won&apos;t do with it
            </h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            EchoMe will read your public web presence (your brand site, public
            Instagram, public realtor profiles) so you don&apos;t have to fill
            out a profile manually. We don&apos;t share, sell, or use this data
            anywhere except for your own content generation. You can edit or
            delete anything we find at any time.
          </p>
          <Link
            href="/privacy"
            target="_blank"
            className="text-xs text-primary-interactive hover:underline"
          >
            Read the full privacy policy →
          </Link>
        </div>
      </div>

      {/* CTAs */}
      <div className="pl-2 sm:pl-[52px] flex flex-wrap items-center gap-3">
        <button
          onClick={onAccept}
          className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-all flex items-center gap-2"
        >
          Go ahead, take a look <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onDecline}
          className="px-4 py-3 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          I&apos;ll fill it in myself
        </button>
      </div>
    </>
  );
}

function LookingPanel({
  firstName,
  sourceStatuses,
  done,
}: {
  firstName: string;
  sourceStatuses: Record<string, 'pending' | 'reading' | 'done'>;
  done: boolean;
}) {
  const greeting = firstName ? `${firstName}, ` : '';
  return (
    <>
      <div className="flex gap-3 items-start">
        <EchoAvatar />
        <div className="max-w-[85%] bg-white/[0.03] backdrop-blur-xl text-text-primary px-5 py-3.5 rounded-2xl rounded-tl-none border border-white/[0.06] text-sm leading-relaxed">
          {done
            ? "Done. Let's confirm what I got right."
            : `${greeting}reading your public footprint. Won't take long.`}
        </div>
      </div>

      <div className="pl-2 sm:pl-[52px] space-y-2">
        {LOOKUP_SOURCES.map(src => {
          const status = sourceStatuses[src.key];
          return (
            <div
              key={src.key}
              className="flex items-center gap-2.5 text-sm"
              data-status={status}
            >
              {status === 'done' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : status === 'reading' ? (
                <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
              ) : (
                <span className="w-4 h-4 inline-block rounded-full border border-border flex-shrink-0" />
              )}
              <span
                className={
                  status === 'done'
                    ? 'text-text-secondary'
                    : status === 'reading'
                    ? 'text-text-primary'
                    : 'text-text-tertiary'
                }
              >
                {src.label}
              </span>
            </div>
          );
        })}
      </div>

      {done && (
        <div className="pl-2 sm:pl-[52px]">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <Loader2 className="w-3 h-3 animate-spin" />
            Putting it together…
          </div>
        </div>
      )}
    </>
  );
}
