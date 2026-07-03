'use client';

/**
 * RecentKitsStrip.tsx
 * Below-the-fold strip of the user's 4 most recent content kits on the
 * Create page. Continuation loop: finished work stays one scroll away
 * instead of disappearing into Library. Silent on empty/error; never
 * blocks the hero.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type ContentKitListItem } from '@/lib/api-client';

const PLATFORM_FLAGS = [
  'hasLinkedin', 'hasTwitter', 'hasInstagram', 'hasBlog', 'hasEmail', 'hasTiktok', 'hasYoutube',
] as const;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function detailLine(k: ContentKitListItem): string {
  const parts: string[] = [];
  if (k.clipsGenerated > 0) parts.push(`${k.clipsGenerated} clip${k.clipsGenerated === 1 ? '' : 's'}`);
  const platforms = PLATFORM_FLAGS.filter((f) => (k as unknown as Record<string, boolean>)[f]).length;
  if (platforms > 0) parts.push(`${platforms} platform${platforms === 1 ? '' : 's'}`);
  parts.push(timeAgo(k.createdAt));
  return parts.join(' · ');
}

export function RecentKitsStrip() {
  const [kits, setKits] = useState<ContentKitListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    api.contentKits.list(4)
      .then((res) => {
        if (!alive) return;
        setKits(res?.data?.kits ?? []);
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  if (!loaded || kits.length === 0) return null;

  return (
    <section aria-label="Recent content kits" className="mt-12 w-full max-w-4xl">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="text-[0.9375rem] font-semibold text-foreground">Recent</h2>
        <Link href="/app/library" className="text-[0.8125rem] text-muted-foreground hover:text-foreground">
          View all in Library →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kits.map((k) => (
          <Link
            key={k.id}
            href={`/app/library/${k.id}`}
            data-testid="recent-kit-card"
            className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-container-low)] transition-colors hover:border-[var(--muted-foreground)]"
          >
            <div className="relative aspect-video bg-[var(--surface-container-lowest)]">
              {k.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={k.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
                  <span className="text-lg text-muted-foreground opacity-40">▮▮▮</span>
                </div>
              )}
              <span
                className={[
                  'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.5625rem] uppercase tracking-wider',
                  'bg-black/45',
                  k.contentGenerated ? 'text-emerald-300' : 'text-amber-300',
                ].join(' ')}
              >
                {k.contentGenerated ? 'Ready' : 'Processing'}
              </span>
            </div>
            <div className="px-3 py-2.5">
              <p className="truncate text-[0.8125rem] font-medium text-foreground">{k.title}</p>
              <p className="mt-0.5 text-[0.71875rem] text-muted-foreground">{detailLine(k)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
