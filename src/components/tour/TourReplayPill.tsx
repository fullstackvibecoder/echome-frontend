'use client';

/**
 * TourReplayPill
 *
 * Floating help pill that re-fires a tour without writing to toursSeen again.
 * Placement: bottom-left on desktop, bottom-right on mobile.
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §5.5.
 */
import { HelpCircle } from 'lucide-react';

interface Props {
  onClick: () => void;
  /** Short label shown next to the icon. e.g. "Replay clip tour". */
  label: string;
}

export function TourReplayPill({ onClick, label }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed z-[8500] inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-full shadow-md bg-card border border-border text-muted-foreground hover:text-foreground transition-colors bottom-4 right-4 md:left-4 md:right-auto"
    >
      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
