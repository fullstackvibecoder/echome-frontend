'use client';

import { KBContentStats } from '@/types';
import { Sprout, TrendingUp, Zap, Star } from 'lucide-react';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { VoiceWaveform } from '@/components/voice-waveform';

const TIERS = [
  { name: 'Seed', min: 0, max: 25, color: 'bg-gray-500', textColor: 'text-gray-600', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700', icon: Sprout },
  { name: 'Growing', min: 26, max: 50, color: 'bg-amber-500', textColor: 'text-amber-600', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', icon: TrendingUp },
  { name: 'Strong', min: 51, max: 75, color: 'bg-emerald-500', textColor: 'text-emerald-600', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', icon: Zap },
  { name: 'Signature', min: 76, max: 100, color: 'bg-violet-500', textColor: 'text-violet-600', badgeBg: 'bg-violet-50', badgeText: 'text-violet-700', icon: Star },
] as const;

// Chunk-count fallback tiers (used when voice strength data unavailable)
const CHUNK_TIERS = [
  { name: 'Seed', min: 0, max: 99 },
  { name: 'Growing', min: 100, max: 499 },
  { name: 'Strong', min: 500, max: 1999 },
  { name: 'Signature', min: 2000, max: Infinity },
] as const;

function getStrengthTier(strength: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (strength >= TIERS[i].min) return { tier: TIERS[i], tierIndex: i };
  }
  return { tier: TIERS[0], tierIndex: 0 };
}

function getChunkTier(chunks: number) {
  let tierIndex = 0;
  for (let i = CHUNK_TIERS.length - 1; i >= 0; i--) {
    if (chunks >= CHUNK_TIERS[i].min) { tierIndex = i; break; }
  }
  const nextTier = tierIndex < CHUNK_TIERS.length - 1 ? CHUNK_TIERS[tierIndex + 1] : null;
  let progress = 100;
  let remaining = 0;
  if (nextTier) {
    const rangeStart = CHUNK_TIERS[tierIndex].min;
    const rangeEnd = nextTier.min;
    progress = Math.min(100, Math.max(0, ((chunks - rangeStart) / (rangeEnd - rangeStart)) * 100));
    remaining = rangeEnd - chunks;
  }
  return { tier: TIERS[tierIndex], tierIndex, nextTier, progress, remaining };
}

const DIMENSION_LABELS: Record<string, string> = {
  signaturePresence: 'Phrases',
  avoidAbsence: 'Clean',
  styleAlignment: 'Style',
  aiBlacklistAbsence: 'Natural',
  embeddingSimilarity: 'Voice Match',
};

function getDimensionColor(score: number): string {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

function getGuidanceMessage(dimensionBreakdown: Record<string, number | null>): string {
  // Find weakest dimension and give actionable guidance
  let weakest = '';
  let weakestScore = 101;
  for (const [key, val] of Object.entries(dimensionBreakdown)) {
    if (val !== null && val < weakestScore) {
      weakestScore = val;
      weakest = key;
    }
  }

  switch (weakest) {
    case 'signaturePresence': return 'Add more of your real writing to strengthen your signature phrases';
    case 'styleAlignment': return 'Upload longer-form content to help match your writing rhythm';
    case 'avoidAbsence': return 'Your voice is developing — keep creating to refine it';
    case 'embeddingSimilarity': return 'Add diverse content types to deepen your voice profile';
    default: return 'Keep adding content to strengthen your voice';
  }
}

interface VoiceIntelligenceDashboardProps {
  contentStats: KBContentStats;
  totalChunks: number;
}

export function VoiceIntelligenceDashboard({
  contentStats,
  totalChunks,
}: VoiceIntelligenceDashboardProps) {
  const { data: strength, loading } = useVoiceStrength();

  if (totalChunks === 0) return null;

  // When strength data available, use it. Otherwise fall back to chunks.
  if (strength && !loading) {
    const { tier } = getStrengthTier(strength.overallStrength);
    const Icon = tier.icon;
    const bd = strength.dimensionBreakdown;

    return (
      <div className="mb-6">
        <div className="relative group p-4 bg-card border border-border rounded-xl card-lift">
          {/* Glow effect on hover */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur -z-10" />

          {/* Top row: tier badge + strength score */}
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${tier.badgeBg} ${tier.badgeText}`}>
              <Icon className="w-3.5 h-3.5" />
              {tier.name}
            </span>
            <span className="text-sm font-semibold text-text-secondary">
              {strength.overallStrength}<span className="text-text-tertiary font-normal"> / 100</span>
            </span>
          </div>

          {/* Waveform */}
          <VoiceWaveform
            waveformData={strength.waveformData}
            overallStrength={strength.overallStrength}
          />

          {/* Dimension pills */}
          {strength.recentPerformance.generationCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Object.entries(bd).map(([key, val]) => {
                if (val === null || val === undefined) return null;
                const label = DIMENSION_LABELS[key];
                if (!label) return null;
                return (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getDimensionColor(val)}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${val >= 70 ? 'bg-emerald-500' : val >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Guidance message */}
          <p className="mt-2 text-xs text-text-secondary">
            {strength.overallStrength >= 76
              ? 'Your voice profile is strong — content will closely match your style'
              : getGuidanceMessage(bd)}
          </p>
        </div>
      </div>
    );
  }

  // Fallback: chunk-count based progress bar (loading or no strength data)
  const { tier, nextTier, progress, remaining } = getChunkTier(totalChunks);
  const Icon = tier.icon;

  return (
    <div className="mb-6">
      <div className="relative group p-4 bg-card border border-border rounded-xl card-lift">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur -z-10" />
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${tier.badgeBg} ${tier.badgeText}`}>
            <Icon className="w-3.5 h-3.5" />
            {tier.name}
          </span>
          <div className="flex-1 min-w-0">
            <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tier.color}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary truncate">
              {nextTier
                ? `${remaining.toLocaleString()} more patterns to reach ${nextTier.name}`
                : 'Your voice profile is excellent'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
