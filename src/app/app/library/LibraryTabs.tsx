'use client';

/**
 * Library page wrapper with tabs.
 *
 * Tab state is URL-driven via ?tab=kits|toolkit|radar|reels so deep links
 * and the old /reels -> /library?tab=reels redirect both land in the right
 * place. Toolkit and Radar were promoted here from their own sidebar items
 * in the 2026-09 nav simplification; /app/toolkit and /app/radar still
 * exist for direct links.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { Package, FolderOpen, Users, Film } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ContentKitContent from './ContentKitContent';
import ReelsContent from './ReelsContent';
import CreatorLibraryContent from '../toolkit/CreatorLibraryContent';
import FollowingContent from '../radar/FollowingContent';

type Tab = 'kits' | 'toolkit' | 'radar' | 'reels';

const ALL_TABS: Array<{ id: Tab; label: string; icon: typeof Package; adminOnly?: boolean }> = [
  { id: 'kits', label: 'Kits', icon: Package },
  { id: 'toolkit', label: 'Toolkit', icon: FolderOpen },
  { id: 'radar', label: 'Radar', icon: Users },
  { id: 'reels', label: 'Reels', icon: Film, adminOnly: true },
];

function parseTab(raw: string | null, isAdmin: boolean): Tab {
  if (raw === 'toolkit' || raw === 'radar') return raw;
  // ?tab=reels honored only for admins. Non-admins always see Kits even if they paste the URL.
  if (raw === 'reels' && isAdmin) return 'reels';
  return 'kits';
}

function LibraryTabsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const tabs = ALL_TABS.filter(t => !t.adminOnly || isAdmin);
  const tab = parseTab(searchParams.get('tab'), isAdmin);

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
          {tabs.map(({ id, label, icon: Icon }) => {
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
        {tab === 'kits' && <ContentKitContent />}
        {tab === 'toolkit' && <CreatorLibraryContent />}
        {tab === 'radar' && <FollowingContent />}
        {tab === 'reels' && <ReelsContent />}
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
