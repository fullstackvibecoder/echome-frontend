'use client';

/**
 * VoiceStrengthStrip.tsx
 * Below-the-fold voice area on the Create page. Absorbs VoiceLearningChip
 * (tier + /app/voice link + WBTW pending state + tour anchor) and adds a
 * coverage subline plus a "Teach Echo more" CTA that focuses the composer.
 *
 * Voice-scope rule: voice = written posts only. Never say clips "sound
 * like you". The clip IS the user on camera.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { api } from '@/lib/api-client';
import { DIMENSION_KEYS, DIMENSION_LABELS, type Coverage, type DimensionKey } from '@/types/advisor';

type StripState = 'idle' | 'wbtw-pending' | 'Seed' | 'Growing' | 'Strong' | 'Signature';

function getTier(score: number): 'Seed' | 'Growing' | 'Strong' | 'Signature' {
  if (score >= 76) return 'Signature';
  if (score >= 51) return 'Strong';
  if (score >= 26) return 'Growing';
  return 'Seed';
}

function getLabel(state: StripState): string {
  switch (state) {
    case 'wbtw-pending': return 'Learning your voice...';
    case 'idle': return 'Teach Echo your voice';
    default: return `Voice profile: ${state}`;
  }
}

// 'relationships' is hardcoded to 0 on the backend; exclude it like CoverageMeter does.
const DISPLAYED_KEYS = DIMENSION_KEYS.filter((k): k is DimensionKey => k !== 'relationships');

function coverageSubline(coverage: Coverage): string | null {
  const sorted = [...DISPLAYED_KEYS].sort((a, b) => coverage[b].strength - coverage[a].strength);
  const strongest = sorted.filter((k) => coverage[k].covered).slice(0, 2);
  const thinnest = sorted.filter((k) => !coverage[k].covered).slice(-1);
  if (strongest.length === 0 && thinnest.length === 0) return null;
  const parts: string[] = [];
  if (strongest.length > 0) parts.push(`Strongest: ${strongest.map((k) => DIMENSION_LABELS[k]).join(', ')}.`);
  if (thinnest.length > 0) parts.push(`Thinnest: ${thinnest.map((k) => DIMENSION_LABELS[k]).join(', ')}.`);
  return parts.join(' ');
}

interface VoiceStrengthStripProps {
  coverage: Coverage | null;
  onTeachMore: () => void;
}

export function VoiceStrengthStrip({ coverage, onTeachMore }: VoiceStrengthStripProps) {
  const { data: voiceStrength } = useVoiceStrength();
  const [stripState, setStripState] = useState<StripState>('idle');

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (voiceStrength !== null && voiceStrength !== undefined) {
        if (!cancelled) setStripState(getTier(voiceStrength.overallStrength));
        return;
      }
      try {
        const result = await api.wbtw.outcome();
        if (cancelled) return;
        setStripState(result.outcome === 'pending' ? 'wbtw-pending' : 'idle');
      } catch {
        if (!cancelled) setStripState('idle');
      }
    }
    void resolve();
    return () => { cancelled = true; };
  }, [voiceStrength]);

  const isPending = stripState === 'wbtw-pending';
  const score = voiceStrength?.overallStrength ?? 0;
  const subline = coverage ? coverageSubline(coverage) : null;

  return (
    <div className="mt-4 flex w-full max-w-4xl items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-container-low)] px-4 py-3">
      <Link
        href="/app/voice"
        data-tour="echo-hero-voice"
        className="flex min-w-0 flex-1 items-center gap-3 group"
        aria-label={getLabel(stripState)}
      >
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--primary) 0 ${Math.max(0, Math.min(100, score))}%, var(--border) ${Math.max(0, Math.min(100, score))}% 100%)` }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-container-low)]">
            {isPending
              ? <Loader2 size={11} className="animate-spin text-muted-foreground" />
              : <Sparkles size={11} className="text-muted-foreground" />}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.8125rem] font-medium text-foreground group-hover:underline underline-offset-2">
            {getLabel(stripState)}
          </span>
          {subline && (
            <span className="block truncate text-xs text-muted-foreground">{subline}</span>
          )}
        </span>
      </Link>
      <button
        type="button"
        onClick={onTeachMore}
        className="shrink-0 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:border-[var(--muted-foreground)] hover:text-foreground"
      >
        Teach Echo more
      </button>
    </div>
  );
}
