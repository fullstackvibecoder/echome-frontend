'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Mic, ChevronRight, Sprout, TrendingUp, Zap, Star, type LucideIcon } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useVoiceStrength } from '@/hooks/useVoiceStrength';
import { useVoiceContext } from '@/contexts/voice-context';
import { VoiceWaveform } from '@/components/voice-waveform';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { InfoTooltip } from '@/components/info-tooltip';
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
  if (score <= 30) return 'Echo has a starting read on you. Add a YouTube link, blog, or paste some writing below — the more it has, the more your generated content sounds like you.';
  if (score <= 60) return 'Echo has your style now. Add more of your best work — blog posts, LinkedIn posts, emails you\'re proud of. Quality over quantity.';
  if (score <= 80) return 'Your generated content already sounds like you. Ask Echo below what it knows about your voice.';
  return 'Echo has a strong read on your voice. Everything you generate will carry your tone, phrasing, and perspective.';
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

  // Voice strength — tier/icon fall back to Seed so the scale is always visible
  const tier = voiceStrength ? getStrengthTier(voiceStrength.overallStrength) : null;
  const TierIcon = tier?.icon;
  const displayTier = tier ?? TIERS[0];
  const DisplayIcon = TierIcon ?? TIERS[0].icon;
  const displayScore = voiceStrength?.overallStrength ?? 0;

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

      {/* Header: title + voice strength (always renders the scale, even at 0) */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Your Voice</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${displayTier.badgeBg} ${displayTier.badgeText}`}>
            <DisplayIcon className="w-3 h-3" />
            {displayTier.name}
          </span>
          <span className="text-xs text-text-secondary tabular-nums">
            {displayScore}<span className="text-text-tertiary">/100</span>
          </span>
          <span className="text-xs text-text-tertiary">
            · {totalItems} source{totalItems !== 1 ? 's' : ''}
          </span>
          <InfoTooltip text="Seed (0–25) · Growing (26–50) · Strong (51–75) · Signature (76+). Most people reach Strong with 15–20 good sources." />
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
          {/* First-visit teaching — disappears once the user adds any source */}
          {!hasContent && (
            <div className="mb-6 rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground mb-1">
                What Echo knows about you.
              </h2>
              <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                Drop a YouTube link, paste some writing, or upload a file.
                Echo reads what you&apos;ve already made so the next post
                sounds like you, not like AI.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {['Blog posts', 'LinkedIn posts', 'Past emails', 'YouTube channel', 'Voice recordings', 'PDFs'].map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-bg-secondary text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href="/guides/build-your-voice"
                className="text-xs text-primary-interactive hover:underline"
              >
                How this works →
              </Link>
            </div>
          )}

          {/* Unified Input */}
          <div className="mb-8">
            <KBUnifiedInput
              knowledgeBaseId={selectedKb}
              onImportComplete={handleImportComplete}
            />
          </div>

          {/* Chat — only once there's something to ask about */}
          {hasContent && (
            <div className="mb-8">
              <KBChat
                kbId={selectedKb}
                hasContent={hasContent}
              />
            </div>
          )}

          {/* Sources (collapsible) — hidden at zero to avoid a dead link */}
          {totalItems > 0 && (
            <section>
              <button
                onClick={() => setShowSources(true)}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                Sources ({totalItems})
              </button>
            </section>
          )}
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
