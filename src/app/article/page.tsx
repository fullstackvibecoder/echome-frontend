'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { captureModeFromParams, persistMode } from '@/lib/mode';
import { track } from '@/lib/telemetry';

function ArticleLanding() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const captured = captureModeFromParams(searchParams) ?? { mode: 'article' as const, source: 'utm' as const };
    persistMode(captured.mode, captured.source);
    track('mode.landing_viewed', {
      mode: 'article',
      utm_content: searchParams.get('utm_content') ?? undefined,
    });
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold mb-4">Draft your next Substack in your own voice.</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Paste a link or your notes. Get a full article with images plus a matching
        newsletter, written the way you write. Publish ready.
      </p>
      <Link
        href="/auth/signup?mode=article"
        className="inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground"
      >
        Write my article
      </Link>
      <p className="mt-4 text-sm text-muted-foreground">5 free, no credit card.</p>
    </main>
  );
}

export default function ArticlePage() {
  return (
    <Suspense fallback={null}>
      <ArticleLanding />
    </Suspense>
  );
}
