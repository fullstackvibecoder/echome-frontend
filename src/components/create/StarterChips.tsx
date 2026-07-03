'use client';

/**
 * StarterChips.tsx
 * Empty-state starter actions under the Create composer. Each chip
 * reuses an existing hero affordance (mic, file picker, composer focus).
 * No new ingest logic lives here.
 */

interface StarterChipsProps {
  onTalk: () => void;
  onAttach: () => void;
  onType: () => void;
}

const CHIP_CLASS =
  'rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:border-[var(--muted-foreground)] hover:text-foreground';

export function StarterChips({ onTalk, onAttach, onType }: StarterChipsProps) {
  return (
    <div className="mt-5 flex w-full max-w-2xl flex-wrap justify-center gap-2">
      <button type="button" className={CHIP_CLASS} onClick={onTalk}>Talk for one minute</button>
      <button type="button" className={CHIP_CLASS} onClick={onAttach}>Drop a Zoom recording</button>
      <button type="button" className={CHIP_CLASS} onClick={onType}>Paste a YouTube link</button>
    </div>
  );
}
