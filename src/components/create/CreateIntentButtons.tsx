'use client';

/**
 * CreateIntentButtons.tsx
 * Output-intent buttons directly under the Create composer, all KB states.
 * Higher visual weight than the ghost proposal chips: filled surface, icon,
 * foreground text. Each button routes into an existing composer affordance;
 * no new ingest or generation logic lives here.
 *
 * Riverside-style split: these answer "what do you want to make";
 * CreateStarterCards below answer "what are you starting with".
 */

import { Clapperboard, PenLine, Lightbulb } from 'lucide-react';

interface CreateIntentButtonsProps {
  /** Open the file picker (video -> clips flow). */
  onClipVideo: () => void;
  /** Prefill the composer and focus it. */
  onPrefill: (text: string) => void;
}

const BUTTON_CLASS = [
  'inline-flex items-center gap-2',
  'rounded-lg border border-[var(--border)]',
  'bg-[var(--surface-container-low)]',
  'px-4 py-2 text-[0.8125rem] font-medium text-foreground',
  'transition-colors hover:border-[var(--muted-foreground)]',
].join(' ');

export function CreateIntentButtons({ onClipVideo, onPrefill }: CreateIntentButtonsProps) {
  return (
    <div className="mt-4 flex w-full max-w-2xl flex-wrap justify-center gap-2.5">
      <button type="button" className={BUTTON_CLASS} onClick={onClipVideo}>
        <Clapperboard size={15} className="text-muted-foreground" aria-hidden="true" />
        Clips from a video
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onPrefill('Create content about ')}
      >
        <Lightbulb size={15} className="text-muted-foreground" aria-hidden="true" />
        Content from a prompt
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onPrefill('Make content from my knowledge base')}
      >
        <PenLine size={15} className="text-muted-foreground" aria-hidden="true" />
        Content from my KB
      </button>
    </div>
  );
}
