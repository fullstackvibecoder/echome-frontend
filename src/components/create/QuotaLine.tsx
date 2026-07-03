'use client';

/**
 * QuotaLine.tsx
 * Quiet free-tier counter rendered directly under the Create composer.
 * Replaces the banner that used to push the hero down. Amber on the
 * last kit preserves the urgency signal at lower visual cost.
 */

import Link from 'next/link';

interface QuotaLineProps {
  remaining: number;
  limit: number;
}

export function QuotaLine({ remaining, limit }: QuotaLineProps) {
  const isLast = remaining === 1;
  const isExhausted = remaining <= 0;

  const label = isExhausted
    ? 'Free content kits used up'
    : isLast
      ? 'Last free content kit'
      : `${remaining} of ${limit} free content kits left`;

  return (
    <p
      className={[
        'mt-2.5 flex items-center justify-center gap-1.5 text-xs',
        isLast ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground',
      ].join(' ')}
    >
      <span>{label}</span>
      <span aria-hidden="true">·</span>
      <Link
        href="/app/billing"
        className={isLast ? 'font-semibold underline underline-offset-2' : 'underline underline-offset-2 hover:text-foreground'}
      >
        {isLast ? 'Subscribe' : 'Upgrade'}
      </Link>
    </p>
  );
}
