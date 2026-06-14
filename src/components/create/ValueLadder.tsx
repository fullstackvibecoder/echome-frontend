'use client';

import { Mic, Video, Mail, ClipboardPaste, FileText } from 'lucide-react';

export type LadderActionId = 'voice' | 'video' | 'emails' | 'paste' | 'published' | 'topic';

interface Rung {
  id: LadderActionId;
  icon: typeof Mic;
  cta: string;
  why: string;
  top?: boolean;
  dim?: boolean;
}

// Copy per copy-deck-v3 (2026-06-13), paste rung reframed 2026-06-14 (founder:
// every CTA must convey why the user is here, not just what to click). Voice
// stays the top/guided rung. No em or en dashes.
const RUNGS: Rung[] = [
  {
    id: 'voice',
    icon: Mic,
    cta: 'Record your voice (best way to start)',
    why: 'Tap to record, talk for two minutes about your work. I transcribe it and learn how you actually sound. Nothing teaches me faster.',
    top: true,
  },
  {
    id: 'video',
    icon: Video,
    cta: 'Add a video of you talking',
    why: 'Paste a YouTube, Zoom, Loom, or Vimeo link, or upload a file. A podcast, a talk, a webinar. I pull the words and learn from them.',
  },
  {
    id: 'emails',
    icon: Mail,
    cta: 'Bring your emails',
    why: 'Upload your sent-mail file. Hundreds of things you have already written, in your own words. I learn your voice in bulk.',
  },
  {
    id: 'paste',
    icon: ClipboardPaste,
    cta: 'Paste something you wrote',
    why: 'A LinkedIn post, a newsletter, anything in your own words. Paste it below and your posts come out sounding like you, not generic AI. Prefer talking? The mic up top teaches me faster.',
  },
  {
    id: 'published',
    icon: FileText,
    cta: 'Add your published work (PDF, blog link)',
    why: 'Great for context on what you know. Polished, formal writing shows less of your real voice than talking does, so do this after the steps above.',
    dim: true,
  },
];

const DEMOTED =
  "In a hurry? Just tell me what to post about and I'll draft it. Heads up: I do my best work after you have fed me a few things above, so it sounds like you and not generic AI.";

interface ValueLadderProps {
  onAction: (id: LadderActionId) => void;
}

export function ValueLadder({ onAction }: ValueLadderProps) {
  return (
    <div className="flex flex-col gap-2">
      {RUNGS.map((r) => {
        const Icon = r.icon;
        return (
          <button
            key={r.id}
            type="button"
            data-testid="ladder-rung"
            onClick={() => onAction(r.id)}
            className={[
              'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
              r.top
                ? 'border-primary/60 bg-primary/5 hover:bg-primary/10'
                : 'border-border bg-card hover:bg-accent',
              r.dim ? 'opacity-70' : '',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                r.top ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              ].join(' ')}
              aria-hidden
            >
              <Icon size={15} />
            </span>
            <span className="flex-1">
              <span data-testid="ladder-cta" className="block text-sm font-medium text-foreground">
                {r.cta}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {r.why}
              </span>
            </span>
          </button>
        );
      })}

      <button
        type="button"
        data-testid="ladder-demoted"
        onClick={() => onAction('topic')}
        className="mt-2 border-t border-dashed border-border pt-3 text-left text-sm text-muted-foreground hover:text-foreground"
      >
        {DEMOTED}
      </button>
    </div>
  );
}
