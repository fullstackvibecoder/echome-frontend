'use client';

import { useMemo } from 'react';
import { useSocialIntegration } from './useSocialIntegration';
import { useKnowledgeBase } from './useKnowledgeBase';
import { useContentKit } from './useContentKit';
import { useScheduledKitCounts } from './useScheduledKitCounts';
import { useVoiceStrength } from './useVoiceStrength';

export type DataState = 'pre' | 'partial' | 'full';

/**
 * `pre`     — cold start: no KB items AND no integrations connected
 * `full`    — closed loop: user has generated content AND has it scheduled/posted
 * `partial` — anything in between (most users live here for weeks)
 *
 * The thresholds are deliberate. We don't promote to `full` on KB content
 * alone — generation + scheduling is the loop that actually delivers
 * value. We don't demote to `pre` if integrations exist but KB is empty —
 * a connected platform is signal enough that onboarding has begun.
 */
export interface UserHealth {
  hasConnectedInbox: boolean;
  hasKnowledgeBaseContent: boolean;
  hasGeneratedContent: boolean;
  hasScheduledContent: boolean;
  voiceStrengthScore: number;          // 0–100 from useVoiceStrength
  voiceLevelUpReady: boolean;          // ≥ 80 AND has generated content
  dataState: DataState;
  loading: boolean;
}

const VOICE_LEVEL_UP_THRESHOLD = 80;
const CONNECTED_STATUSES = new Set(['connected', 'active']);

export function useDataState(): UserHealth {
  const { integrations, loading: integrationsLoading } = useSocialIntegration();
  const { contentStats, loading: kbLoading } = useKnowledgeBase();
  const { stats: kitStats, loading: kitLoading } = useContentKit();
  const { counts: scheduleCounts, loading: scheduleLoading } = useScheduledKitCounts();
  const { data: voiceData, loading: voiceLoading } = useVoiceStrength();

  return useMemo<UserHealth>(() => {
    const hasConnectedInbox = integrations.some((i) =>
      CONNECTED_STATUSES.has(i.status),
    );
    const hasKnowledgeBaseContent = (contentStats?.totalItems ?? 0) > 0;
    const hasGeneratedContent = (kitStats?.total ?? 0) > 0;
    const hasScheduledContent = Object.values(scheduleCounts).some(
      (c) => c.scheduled > 0 || c.posted > 0,
    );
    const voiceStrengthScore = voiceData?.overallStrength ?? 0;
    const voiceLevelUpReady =
      voiceStrengthScore >= VOICE_LEVEL_UP_THRESHOLD && hasGeneratedContent;

    let dataState: DataState;
    if (!hasKnowledgeBaseContent && !hasConnectedInbox) {
      dataState = 'pre';
    } else if (hasGeneratedContent && hasScheduledContent) {
      dataState = 'full';
    } else {
      dataState = 'partial';
    }

    return {
      hasConnectedInbox,
      hasKnowledgeBaseContent,
      hasGeneratedContent,
      hasScheduledContent,
      voiceStrengthScore,
      voiceLevelUpReady,
      dataState,
      loading:
        integrationsLoading ||
        kbLoading ||
        kitLoading ||
        scheduleLoading ||
        voiceLoading,
    };
  }, [
    integrations,
    contentStats,
    kitStats,
    scheduleCounts,
    voiceData,
    integrationsLoading,
    kbLoading,
    kitLoading,
    scheduleLoading,
    voiceLoading,
  ]);
}
