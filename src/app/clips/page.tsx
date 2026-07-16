'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { captureModeFromParams, persistMode } from '@/lib/mode';
import { track } from '@/lib/telemetry';

function ClipsLanding() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const captured = captureModeFromParams(searchParams) ?? { mode: 'clips' as const, source: 'utm' as const };
    persistMode(captured.mode, captured.source);
    track('mode.landing_viewed', {
      mode: 'clips',
      utm_content: searchParams.get('utm_content') ?? undefined,
    });
  }, [searchParams]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold mb-4">Turn any video into ready to post clips.</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Paste a YouTube, Zoom, Loom or Vimeo link. Get vertical, captioned, face tracked
        clips in minutes. No editing, no timeline, no setup.
      </p>
      <Link
        href="/auth/signup?mode=clips"
        className="inline-block rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground"
      >
        Get my clips
      </Link>
      <p className="mt-4 text-sm text-muted-foreground">5 free, no credit card.</p>
    </main>
  );
}

export default function ClipsPage() {
  return (
    <Suspense fallback={null}>
      <ClipsLanding />
    </Suspense>
  );
}
