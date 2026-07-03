'use client';

/**
 * CreateStarterCards.tsx
 * Source-first entry cards below the Create composer (all KB states).
 * Riverside-style row: icon + verb + one-line subtitle. Each card routes
 * into an existing affordance (mic, file picker, composer focus) or an
 * existing page (calendar); no new logic lives here.
 */

import { useRouter } from 'next/navigation';
import { Mic, Upload, Link2, CalendarDays } from 'lucide-react';

interface CreateStarterCardsProps {
  /** Start voice capture (mic). */
  onRecord: () => void;
  /** Open the file picker. */
  onUpload: () => void;
  /** Focus the composer (paste-a-link path). */
  onPasteLink: () => void;
}

const CARD_CLASS = [
  'flex items-center gap-3 rounded-xl border border-[var(--border)]',
  'bg-[var(--surface-container-low)] px-4 py-3.5 text-left',
  'transition-colors hover:border-[var(--muted-foreground)]',
].join(' ');

function CardBody({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-[0.8125rem] font-semibold text-foreground">{title}</span>
      <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
    </span>
  );
}

function CardIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container-lowest)] text-muted-foreground"
    >
      {children}
    </span>
  );
}

export function CreateStarterCards({ onRecord, onUpload, onPasteLink }: CreateStarterCardsProps) {
  const router = useRouter();

  return (
    <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <button type="button" className={CARD_CLASS} onClick={onRecord}>
        <CardIcon><Mic size={16} /></CardIcon>
        <CardBody title="Record" subtitle="Echo learns to write like you" />
      </button>
      <button type="button" className={CARD_CLASS} onClick={onUpload}>
        <CardIcon><Upload size={16} /></CardIcon>
        <CardBody title="Upload" subtitle="Becomes posts, clips, and carousels" />
      </button>
      <button type="button" className={CARD_CLASS} onClick={onPasteLink}>
        <CardIcon><Link2 size={16} /></CardIcon>
        <CardBody title="Paste a link" subtitle="Turns into content in your voice" />
      </button>
      <button type="button" className={CARD_CLASS} onClick={() => router.push('/app/calendar')}>
        <CardIcon><CalendarDays size={16} /></CardIcon>
        <CardBody title="Plan your week" subtitle="A week of posts, scheduled" />
      </button>
    </div>
  );
}
