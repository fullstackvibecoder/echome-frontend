'use client';

import { KBContentStats } from '@/types';
import { InfoTooltip } from '@/components/info-tooltip';
import { SourceCompositionBar } from './SourceCompositionBar';
import { VoiceGuidanceChip } from './VoiceGuidanceChip';

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface VoiceIntelligenceDashboardProps {
  contentStats: KBContentStats;
  totalItems: number;
  totalChunks: number;
  loading: boolean;
  onRefresh: () => void;
  onOpenModal: (modal: string) => void;
}

export function VoiceIntelligenceDashboard({
  contentStats,
  totalItems,
  totalChunks,
  loading,
  onRefresh,
  onOpenModal,
}: VoiceIntelligenceDashboardProps) {
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
      {/* Header + Stats Strip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">Knowledge Base</h1>
          <InfoTooltip text="Everything you add here teaches EchoMe how you write and speak. The more you add, the more authentic your generated content sounds." />
        </div>
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span>{totalItems} source{totalItems !== 1 ? 's' : ''}</span>
          <span className="text-text-tertiary">·</span>
          <span className="font-semibold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
            {totalChunks.toLocaleString()}
          </span>
          <span>nuggets</span>
          {contentStats.totalSize > 0 && (
            <>
              <span className="text-text-tertiary">·</span>
              <span>{formatSize(contentStats.totalSize)}</span>
            </>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-text-secondary hover:text-primary transition-colors ml-1"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

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

      {/* Guidance Chip */}
      <VoiceGuidanceChip
        totalChunks={totalChunks}
        bySourceType={contentStats.bySourceType}
        onOpenModal={onOpenModal}
      />
    </div>
  );
}
