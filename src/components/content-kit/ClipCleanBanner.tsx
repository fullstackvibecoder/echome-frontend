import { Sparkles } from 'lucide-react';
import type { CleanReport } from '@/lib/api-client';

interface ClipCleanBannerProps {
  report: CleanReport;
  showingOriginal: boolean;
  onToggleOriginal: (showOriginal: boolean) => void;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/**
 * Compact banner shown above the caption controls when a clip has been
 * auto-cleaned. States what was removed and lets the user flip the player
 * between the cleaned render and the original for comparison.
 */
export function ClipCleanBanner({ report, showingOriginal, onToggleOriginal }: ClipCleanBannerProps) {
  const summary = `Removed ${plural(report.fillerRemoved, 'filler word')}, trimmed ${plural(
    report.pausesTrimmed,
    'pause',
  )}, saved ${Math.round(report.secondsSaved)}s.`;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 text-primary-interactive shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Auto-cleaned</p>
          <p className="text-[12px] text-muted-foreground">{summary}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggleOriginal(!showingOriginal)}
        className="text-[12px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors shrink-0"
      >
        {showingOriginal ? 'Back to cleaned' : 'Compare to original'}
      </button>
    </div>
  );
}
