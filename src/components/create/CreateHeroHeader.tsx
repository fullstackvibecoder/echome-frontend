'use client';

/**
 * CreateHeroHeader.tsx
 * Personalized H1 + one-line advisor nudge for the Create page hero,
 * shown in thin/rich KB states. The empty state keeps its own
 * teach-first header inside EchoHero, so this renders nothing there.
 */

interface CreateHeroHeaderProps {
  state: 'empty' | 'thin' | 'rich' | null;
  nudgeHeadline?: string;
  firstName?: string;
}

export function CreateHeroHeader({ state, nudgeHeadline, firstName }: CreateHeroHeaderProps) {
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
      {nudgeHeadline ? (
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
