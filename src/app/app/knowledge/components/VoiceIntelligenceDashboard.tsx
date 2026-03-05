'use client';

import { KBContentStats } from '@/types';
import { SourceCompositionBar } from './SourceCompositionBar';

// Voice strength thresholds: 100 / 500 / 2,000 / 5,000
const SEGMENTS = [
  { label: 'Getting Started', threshold: 0, width: '15%' },
  { label: 'Building', threshold: 100, width: '20%' },
  { label: 'Good', threshold: 500, width: '25%' },
  { label: 'Strong', threshold: 2000, width: '25%' },
  { label: 'Excellent', threshold: 5000, width: '15%' },
] as const;

function getSegmentInfo(chunks: number) {
  let currentIndex = 0;
  for (let i = SEGMENTS.length - 1; i >= 0; i--) {
    if (chunks >= SEGMENTS[i].threshold) {
      currentIndex = i;
      break;
    }
  }

  const nextSegment = currentIndex < SEGMENTS.length - 1 ? SEGMENTS[currentIndex + 1] : null;
  const remaining = nextSegment ? nextSegment.threshold - chunks : 0;

  return { currentIndex, currentLabel: SEGMENTS[currentIndex].label, nextSegment, remaining };
}

interface VoiceIntelligenceDashboardProps {
  contentStats: KBContentStats;
  totalChunks: number;
}

export function VoiceIntelligenceDashboard({
  contentStats,
  totalChunks,
}: VoiceIntelligenceDashboardProps) {
  const totalItems = contentStats.totalItems || 0;
  const { currentIndex, currentLabel, nextSegment, remaining } = getSegmentInfo(totalChunks);

  // Segment colors for filled/unfilled
  const segmentColors = [
    'bg-slate-400',
    'bg-amber-500',
    'bg-accent',
    'bg-emerald-500',
    'bg-emerald-400',
  ];

  return (
    <div className="mb-6 space-y-4">
      {/* Segmented Voice Strength Meter */}
      {totalChunks > 0 && (
        <div className="relative group p-4 bg-card border border-border rounded-xl card-lift">
          {/* Glow effect on hover */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent-purple/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur -z-10" />
          {/* Segment labels */}
          <div className="flex mb-1.5">
            {SEGMENTS.map((seg, i) => (
              <div key={seg.label} className="text-center" style={{ width: seg.width }}>
                <span className={`text-[10px] font-medium ${i === currentIndex ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  {seg.label}
                </span>
              </div>
            ))}
          </div>

          {/* Segmented bar */}
          <div className="flex gap-1 h-3">
            {SEGMENTS.map((seg, i) => {
              const isFilled = i <= currentIndex;
              // For the current segment, calculate partial fill
              let fillPercent = 100;
              if (i === currentIndex && nextSegment) {
                const segStart = seg.threshold;
                const segEnd = nextSegment.threshold;
                fillPercent = Math.min(100, Math.max(5, ((totalChunks - segStart) / (segEnd - segStart)) * 100));
              }

              return (
                <div
                  key={seg.label}
                  className="relative rounded-full overflow-hidden bg-bg-tertiary"
                  style={{ width: seg.width }}
                >
                  {isFilled && (
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${segmentColors[i]}`}
                      style={{ width: i < currentIndex ? '100%' : `${fillPercent}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Milestone text */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              {nextSegment
                ? `${remaining.toLocaleString()} more nuggets to reach ${nextSegment.label}`
                : 'Your voice profile is excellent'}
            </span>
            <span className={`text-xs font-semibold ${
              currentIndex >= 4 ? 'text-emerald-500' :
              currentIndex >= 3 ? 'text-emerald-500' :
              currentIndex >= 2 ? 'text-accent' :
              currentIndex >= 1 ? 'text-amber-500' : 'text-text-secondary'
            }`}>
              {currentLabel}
            </span>
          </div>
        </div>
      )}

      {/* Source Composition Bar */}
      {totalItems > 0 && (
        <SourceCompositionBar bySourceType={contentStats.bySourceType} />
      )}

    </div>
  );
}
