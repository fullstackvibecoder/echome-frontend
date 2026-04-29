'use client';

/**
 * Library page wrapper with tabs.
 *
 * Tier 3 Phase 2 (audit §5.2 cont'd): folds /app/reels list into /app/library
 * as a tab. The reel editor at /reels/[id] is unchanged.
 *
 * Tab state is URL-driven via ?tab=kits|reels so deep links and the
 * /reels → /library?tab=reels redirect both land in the right place.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { Package, Film } from 'lucide-react';
import ContentKitContent from './ContentKitContent';
import ReelsContent from './ReelsContent';

type Tab = 'kits' | 'reels';

const TABS: Array<{ id: Tab; label: string; icon: typeof Package }> = [
  { id: 'kits', label: 'Kits', icon: Package },
  { id: 'reels', label: 'Reels', icon: Film },
];

function LibraryTabsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab: Tab = searchParams.get('tab') === 'reels' ? 'reels' : 'kits';

  const setTab = useCallback(
    (next: Tab) => {
      // Preserve other query params (e.g., voice filters) when switching tabs.
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'kits') {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const qs = params.toString();
      router.replace(`/app/library${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div>
      {/* Tab nav */}
      <div className="container mx-auto px-6 pt-6 max-w-7xl">
        <div className="flex items-center gap-1 border-b border-border" role="tablist" aria-label="Library sections">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`library-panel-${id}`}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-primary-interactive text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active panel */}
      <div
        id={`library-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'kits' ? <ContentKitContent /> : <ReelsContent />}
      </div>
    </div>
  );
}

export default function LibraryTabs() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 max-w-7xl" />}>
      <LibraryTabsInner />
    </Suspense>
  );
}
