'use client';

/**
 * VoiceLearningChip.tsx
 * Small status chip rendered under the EchoHero composer.
 * Shows the user's voice-profile build state and links to /app/voice.
 *
 * Voice-scope rule: voice = written posts only. Never say clips "sound like
 * you". The clip IS the user on camera.
 *
 * States driven by useVoiceStrength + api.wbtw.outcome:
 *   no data / unknown  -> "Teach Echo your voice"
 *   WBTW pending       -> "Learning your voice..."
 *   score 0–25         -> "Voice profile: Seed"
 *   score 26–50        -> "Voice profile: Growing"
 *   score 51–75        -> "Voice profile: Strong"
 *   score 76+          -> "Voice profile: Signature"
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2 } from 'lucide-react';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { api } from '@/lib/api-client';

type ChipState = 'idle' | 'wbtw-pending' | 'Seed' | 'Growing' | 'Strong' | 'Signature';

function getTier(score: number): 'Seed' | 'Growing' | 'Strong' | 'Signature' {
  if (score >= 76) return 'Signature';
  if (score >= 51) return 'Strong';
  if (score >= 26) return 'Growing';
  return 'Seed';
}

function getLabel(state: ChipState): string {
  switch (state) {
    case 'wbtw-pending':
      return 'Learning your voice...';
    case 'idle':
      return 'Teach Echo your voice';
    default:
      return `Voice profile: ${state}`;
  }
}

export function VoiceLearningChip() {
  const { data: voiceStrength } = useVoiceStrength();
  const [chipState, setChipState] = useState<ChipState>('idle');

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // First derive from voice strength score if available.
      if (voiceStrength !== null && voiceStrength !== undefined) {
        const score = voiceStrength.overallStrength;
        if (!cancelled) {
          setChipState(getTier(score));
        }
        return;
      }

      // No strength data yet. Check WBTW outcome for in-progress signal.
      try {
        const result = await api.wbtw.outcome();
        if (cancelled) return;
        if (result.outcome === 'pending') {
          setChipState('wbtw-pending');
        } else {
          setChipState('idle');
        }
      } catch {
        if (!cancelled) setChipState('idle');
      }
    }

    void resolve();
    return () => { cancelled = true; };
  }, [voiceStrength]);

  const isPending = chipState === 'wbtw-pending';

  return (
    <Link
      href="/app/voice"
      data-tour="echo-hero-voice"
      className={[
        'inline-flex items-center gap-1.5 mt-3',
        'rounded-full px-3 py-1',
        'border border-[var(--border)]',
        'text-xs',
        'text-[var(--muted-foreground)]',
        'bg-[var(--surface-container-low)]',
        'hover:text-foreground hover:border-[var(--muted-foreground)]',
        'transition-colors',
        'select-none',
      ].join(' ')}
    >
      {isPending ? (
        <Loader2 size={11} className="animate-spin shrink-0" />
      ) : (
        <Sparkles size={11} className="shrink-0" />
      )}
      <span>{getLabel(chipState)}</span>
    </Link>
  );
}
