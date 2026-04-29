'use client';

/**
 * Voice page wrapper with tabs.
 *
 * Tier 3 Phase 3 (audit §5.3 + §5.5): folds /app/team-voices into /app/voice
 * as a Teams-tier-only tab, and gives the page a route name that matches
 * its H1 ("Your Voice"). The legacy /app/knowledge route 308-redirects here.
 *
 * Tab state is URL-driven via ?tab=voice|team so deep links and the
 * /team-voices → /voice?tab=team redirect both land in the right place.
 *
 * The "Team Voices" tab is rendered ONLY for users on a Teams plan
 * (per useVoiceContext().isTeamsUser). Non-Teams users see the page as
 * a single-purpose voice profile page; they never see the tab nav at all.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { Brain, Mic } from 'lucide-react';
import { useVoiceContext } from '@/contexts/voice-context';
import KnowledgeContent from './KnowledgeContent';
import TeamVoicesContent from './TeamVoicesContent';

type Tab = 'voice' | 'team';

const TABS: Array<{ id: Tab; label: string; icon: typeof Brain; teamsOnly?: boolean }> = [
  { id: 'voice', label: 'Your Voice', icon: Brain },
  { id: 'team', label: 'Team Voices', icon: Mic, teamsOnly: true },
];

function VoiceTabsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isTeamsUser } = useVoiceContext();

  const requestedTab = searchParams.get('tab');
  // Non-Teams users land on the voice tab regardless of ?tab=team — the
  // team tab simply doesn't exist for them.
  const tab: Tab = requestedTab === 'team' && isTeamsUser ? 'team' : 'voice';

  const setTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'voice') {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const qs = params.toString();
      router.replace(`/app/voice${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Single-tab users (non-Teams) skip the tab nav entirely.
  const visibleTabs = TABS.filter(t => !t.teamsOnly || isTeamsUser);
  const showTabNav = visibleTabs.length > 1;

  return (
    <div>
      {showTabNav && (
        <div className="container mx-auto px-6 pt-6 max-w-4xl">
          <div className="flex items-center gap-1 border-b border-border" role="tablist" aria-label="Voice sections">
            {visibleTabs.map(({ id, label, icon: Icon }) => {
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`voice-panel-${id}`}
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
      )}

      <div
        id={`voice-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'voice' ? <KnowledgeContent /> : <TeamVoicesContent />}
      </div>
    </div>
  );
}

export default function VoiceTabs() {
  return (
    <Suspense fallback={<div className="container mx-auto px-6 py-8 max-w-4xl" />}>
      <VoiceTabsInner />
    </Suspense>
  );
}
