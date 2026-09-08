'use client';

/**
 * CreateHeroHeader.tsx
 * Personalized H1 + one-line advisor nudge for the Create page hero,
 * shown in thin/rich KB states. The empty state keeps its own
 * teach-first header inside EchoHero, so this renders nothing there.
 *
 * When `onNudgeClick` is supplied the nudge becomes a pill button that hands
 * its headline back to the caller (EchoHero prefills the composer with it).
 * Without it the nudge stays a plain, non-interactive line.
 */

import { ArrowRight } from 'lucide-react';

interface CreateHeroHeaderProps {
  state: 'empty' | 'thin' | 'rich' | null;
  nudgeHeadline?: string;
  firstName?: string;
  onNudgeClick?: (headline: string) => void;
}

export function CreateHeroHeader({
  state,
  nudgeHeadline,
  firstName,
  onNudgeClick,
}: CreateHeroHeaderProps) {
  if (state !== 'thin' && state !== 'rich') return null;

  const heading = firstName
    ? `What do you want to create, ${firstName}?`
    : 'What do you want to create?';

  return (
    <div className="w-full max-w-2xl">
      <h1
        className="mb-2 text-center font-semibold leading-tight"
        style={{
          fontSize: 'clamp(1.5rem, 1.25rem + 1.25vw, 1.875rem)',
          color: 'var(--foreground)',
          textWrap: 'balance',
        }}
      >
        {heading}
      </h1>
      {nudgeHeadline && onNudgeClick ? (
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            data-testid="hero-nudge-pill"
            onClick={() => onNudgeClick(nudgeHeadline)}
            className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-container-low px-3.5 py-1.5 text-sm leading-snug text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="min-w-0 truncate">{nudgeHeadline}</span>
            <ArrowRight
              className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      ) : nudgeHeadline ? (
        <p
          data-testid="hero-nudge-line"
          className="mb-6 text-center text-sm leading-snug text-muted-foreground"
        >
          {nudgeHeadline}
        </p>
      ) : (
        <div className="mb-4" aria-hidden="true" />
      )}
    </div>
  );
}
