'use client';

import { KBContentStats } from '@/types';
import { Sprout, TrendingUp, Zap, Star } from 'lucide-react';

const TIERS = [
  { name: 'Seed', min: 0, max: 99, color: 'bg-gray-500', textColor: 'text-gray-600', badgeBg: 'bg-gray-100', badgeText: 'text-gray-700', icon: Sprout },
  { name: 'Growing', min: 100, max: 499, color: 'bg-amber-500', textColor: 'text-amber-600', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', icon: TrendingUp },
  { name: 'Strong', min: 500, max: 1999, color: 'bg-emerald-500', textColor: 'text-emerald-600', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', icon: Zap },
  { name: 'Signature', min: 2000, max: Infinity, color: 'bg-violet-500', textColor: 'text-violet-600', badgeBg: 'bg-violet-50', badgeText: 'text-violet-700', icon: Star },
] as const;

function getTierInfo(chunks: number) {
  let tierIndex = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (chunks >= TIERS[i].min) {
      tierIndex = i;
      break;
    }
  }

  const tier = TIERS[tierIndex];
  const nextTier = tierIndex < TIERS.length - 1 ? TIERS[tierIndex + 1] : null;

  let progress = 100;
  let remaining = 0;
  if (nextTier) {
    const rangeStart = tier.min;
    const rangeEnd = nextTier.min;
    progress = Math.min(100, Math.max(0, ((chunks - rangeStart) / (rangeEnd - rangeStart)) * 100));
    remaining = rangeEnd - chunks;
  }

  return { tier, tierIndex, nextTier, progress, remaining };
}

interface VoiceIntelligenceDashboardProps {
  contentStats: KBContentStats;
  totalChunks: number;
}

export function VoiceIntelligenceDashboard({
  contentStats,
  totalChunks,
}: VoiceIntelligenceDashboardProps) {
  const { tier, nextTier, progress, remaining } = getTierInfo(totalChunks);
  const Icon = tier.icon;

  if (totalChunks === 0) return null;

  return (
    <div className="mb-6">
      <div className="relative group p-4 bg-card border border-border rounded-xl card-lift">
        {/* Glow effect on hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur -z-10" />

        <div className="flex items-center gap-3">
          {/* Tier badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${tier.badgeBg} ${tier.badgeText}`}>
            <Icon className="w-3.5 h-3.5" />
            {tier.name}
          </span>

          {/* Progress bar + CTA */}
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
