'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Mic, ChevronRight, Sprout, TrendingUp, Zap, Star, type LucideIcon } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { useVoiceContext } from '@/contexts/voice-context';
import { VoiceWaveform } from '@/components/voice-waveform';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { KBUnifiedInput } from './KBUnifiedInput';
import KBChat from './KBChat';
import { SourcesDrawer } from './components/SourcesDrawer';

// ============================================
// HELPERS
// ============================================

const TIERS: Array<{ name: string; min: number; icon: LucideIcon; badgeBg: string; badgeText: string }> = [
  { name: 'Seed', min: 0, icon: Sprout, badgeBg: 'bg-gray-100 dark:bg-gray-800', badgeText: 'text-gray-700 dark:text-gray-300' },
  { name: 'Growing', min: 26, icon: TrendingUp, badgeBg: 'bg-amber-50 dark:bg-amber-900/30', badgeText: 'text-amber-700 dark:text-amber-400' },
  { name: 'Strong', min: 51, icon: Zap, badgeBg: 'bg-emerald-50 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-400' },
  { name: 'Signature', min: 76, icon: Star, badgeBg: 'bg-violet-50 dark:bg-violet-900/30', badgeText: 'text-violet-700 dark:text-violet-400' },
];

function getStrengthTier(strength: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (strength >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function getStrengthMessage(score: number): string {
  if (score <= 30) return 'Echo is just getting started. Add a few sources and watch the match improve fast.';
  if (score <= 60) return 'Echo is picking up your patterns. Keep feeding it. The jump from here is where it gets real.';
  if (score <= 80) return 'Strong foundation. Your content is already starting to sound like you wrote it.';
  return 'Echo knows your voice. Every new source fine-tunes the match even further.';
}

// No-op for SourcesDrawer's onOpenModal (modals now live inside KBUnifiedInput)
const noop = () => {};

// ============================================
// MAIN COMPONENT
// ============================================

export default function KnowledgeContent() {
  const { voices, isTeamsUser, activeVoice } = useVoiceContext();
  const {
    contentItems, contentStats, loading, selectedKb, selectKb, deleteContent, refresh,
  } = useKnowledgeBase(isTeamsUser ? activeVoice?.knowledgeBaseId : undefined);
  const { data: voiceStrength, refresh: refreshVoiceStrength } = useVoiceStrength();

  // KB switching for teams
  useEffect(() => {
    if (isTeamsUser && activeVoice?.knowledgeBaseId && activeVoice.knowledgeBaseId !== selectedKb) {
      selectKb(activeVoice.knowledgeBaseId);
    }
  }, [isTeamsUser, activeVoice?.knowledgeBaseId, selectKb, selectedKb]);

  const linkedVoices = useMemo(() => {
    if (!isTeamsUser || !selectedKb) return [];
    return voices.filter(v => v.knowledgeBaseId === selectedKb);
  }, [voices, isTeamsUser, selectedKb]);

  // Sources drawer
  const [showSources, setShowSources] = useState(false);

  // Derived
  const hasContent = contentItems.length > 0;
  const totalChunks = contentStats?.totalChunks || 0;
  const totalItems = contentStats?.totalItems || 0;
  const bySourceType = contentStats?.bySourceType || {};

  const handleImportComplete = useCallback(() => {
    refresh();
    refreshVoiceStrength();
  }, [refresh, refreshVoiceStrength]);

  // Voice strength
  const tier = voiceStrength ? getStrengthTier(voiceStrength.overallStrength) : null;
  const TierIcon = tier?.icon;

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Banners */}
      {!loading && (
        <div className="mb-6">
          <UpgradeBanner />
          {isTeamsUser && activeVoice && !activeVoice.knowledgeBaseId && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-sm">
              <span>&#9888;&#65039;</span>
              <span className="text-text-secondary">
                <strong>{activeVoice.name}</strong> has no Knowledge Base yet.
                <a href="/app/team-voices" className="text-primary hover:underline ml-1">Assign or create one</a>.
              </span>
            </div>
          )}
          {isTeamsUser && linkedVoices.length > 0 && (
            <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-2 text-sm">
              <Mic className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-text-secondary">
                Used by: {linkedVoices.map(v => (
                  <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded-full text-xs font-medium text-accent mx-0.5">
                    {v.name}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header: title + voice strength */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Build Your Voice</h1>
        <div className="flex items-center gap-2 mt-1">
          {tier && TierIcon && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.badgeBg} ${tier.badgeText}`}>
              <TierIcon className="w-3 h-3" />
              {tier.name}
            </span>
          )}
          {voiceStrength && (
            <span className="text-xs text-text-secondary tabular-nums">
              {voiceStrength.overallStrength}<span className="text-text-tertiary">/100</span>
            </span>
          )}
          {hasContent && (
            <span className="text-xs text-text-tertiary">
              · {totalItems} source{totalItems !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {voiceStrength && (
          <div className="mt-3 space-y-2">
            {voiceStrength.waveformData.length > 0 && (
              <div className="w-[200px] h-8 overflow-hidden">
                <VoiceWaveform
                  waveformData={voiceStrength.waveformData}
                  overallStrength={voiceStrength.overallStrength}
                  className="h-8"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {getStrengthMessage(voiceStrength.overallStrength)}
            </p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Unified Input */}
          <div className="mb-8">
            <KBUnifiedInput
              knowledgeBaseId={selectedKb}
              onImportComplete={handleImportComplete}
            />
          </div>

          {/* Chat */}
          <div className="mb-8">
            <KBChat
              kbId={selectedKb}
              hasContent={hasContent}
            />
          </div>

          {/* Sources (collapsible) */}
          <section>
            <button
              onClick={() => setShowSources(true)}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              Sources ({totalItems})
            </button>
          </section>
        </>
      )}

      {/* Sources Drawer */}
      <SourcesDrawer
        isOpen={showSources}
        onClose={() => setShowSources(false)}
        contentStats={contentStats}
        totalChunks={totalChunks}
        contentItems={contentItems}
        bySourceType={bySourceType}
        mboxUploading={false}
        onOpenModal={noop}
        onDeleteContent={deleteContent}
        onRefresh={refresh}
        loading={loading}
      />
    </div>
  );
}
