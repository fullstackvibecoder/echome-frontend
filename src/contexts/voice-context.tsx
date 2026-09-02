'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';
import { api, TeamVoice } from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';

interface VoiceContextType {
  /** Currently active voice (null = single-user, no teams) */
  activeVoice: TeamVoice | null;
  /** All voices for this user */
  voices: TeamVoice[];
  /**
   * Whether multi-voice UI should be shown.
   *
   * True when the user is on a teams tier OR already owns more than one
   * voice. Ownership matters independently of tier: legacy and comped
   * accounts can hold voices granted under a plan they have since left,
   * and gating purely on tier hid those voices completely — the switcher
   * never rendered and generation silently wrote `voice_id = null`.
   */
  isTeamsUser: boolean;
  /**
   * Whether the user's *tier* grants multi-voice. Use this for anything
   * that should follow the plan rather than what the user happens to own:
   * upgrade prompts, and creating additional voices.
   */
  isTeamsTier: boolean;
  /** Loading state */
  loading: boolean;
  /** Maximum number of voices allowed for this tier */
  voiceLimit: number;
  /** Current number of voices */
  voiceCount: number;
  /** Switch active voice */
  switchVoice: (voiceId: string) => void;
  /** Refresh voices from server */
  refreshVoices: () => Promise<void>;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

const ACTIVE_VOICE_KEY = 'echome_active_voice_id';

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { tier, isSubscribed, isTrial } = useSubscription();
  const [voices, setVoices] = useState<TeamVoice[]>([]);
  const [activeVoice, setActiveVoice] = useState<TeamVoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiceLimit, setVoiceLimit] = useState(0);
  const [voiceCount, setVoiceCount] = useState(0);
  const hasAttemptedFallbackRef = useRef(false);

  const isTeamsTier = (isSubscribed || isTrial) && (
    tier === 'teams_2' ||
    tier === 'teams_5' ||
    tier === 'teams_10' ||
    tier === 'echo_teams'
  );

  // Ownership is an independent grant. The backend agrees: read and switch
  // access to /api/team-voices is allowed on tier OR on owning >1 voice,
  // while creating a voice stays tier-gated.
  const ownsMultipleVoices = voices.length > 1;
  const isTeamsUser = isTeamsTier || ownsMultipleVoices;

  // Tier-based fallback limits (used when /limits endpoint isn't available).
  // For echo_teams the real limit is in users.voice_count and comes back from
  // /limits — this fallback is just a safety net. Default to the 2-voice
  // plan minimum.
  const tierLimits: Record<string, number> = { teams_2: 2, teams_5: 5, teams_10: 10, echo_teams: 2 };

  const fetchLimits = useCallback(async () => {
    // Always ask. The endpoint is ownership-aware, so a non-teams user who
    // owns several voices gets a real limit back; a single-voice user is
    // refused and falls through to the tier default below.
    try {
      const response = await api.teamVoices.getLimits();
      if (response.success && response.data) {
        setVoiceLimit(response.data.voiceLimit);
        setVoiceCount(response.data.voiceCount);
        return;
      }
    } catch {
      // Not entitled, or endpoint not deployed - use the fallback below.
    }

    // Fallback: derive limit from tier, count from local voices state.
    // Floor at what the user owns so voices granted outside the current
    // tier never render as over-quota.
    const tierLimit = tier ? tierLimits[tier] || 0 : 0;
    setVoiceLimit(Math.max(tierLimit, voices.length));
  }, [tier, voices.length]);

  const setActiveFromList = useCallback((voiceList: TeamVoice[]) => {
    const savedVoiceId = localStorage.getItem(ACTIVE_VOICE_KEY);
    const savedVoice = savedVoiceId ? voiceList.find(v => v.id === savedVoiceId) : null;

    if (savedVoice) {
      setActiveVoice(savedVoice);
    } else {
      const defaultVoice = voiceList.find(v => v.isDefault) || voiceList[0] || null;
      setActiveVoice(defaultVoice);
      if (defaultVoice) {
        localStorage.setItem(ACTIVE_VOICE_KEY, defaultVoice.id);
      }
    }
  }, []);

  const fetchVoices = useCallback(async () => {
    // Fetch unconditionally. Ownership can only be discovered by asking,
    // and gating the fetch on tier was what made a user's own voices
    // unreachable. The backend refuses callers with nothing to switch
    // between, which lands in the catch below and leaves state empty.
    try {
      setLoading(true);
      const response = await api.teamVoices.list();
      if (response.success && response.data) {
        const voiceList = response.data;

        if (voiceList.length > 0) {
          setVoices(voiceList);
          setActiveFromList(voiceList);
          hasAttemptedFallbackRef.current = false;
          return;
        }

        // Voices came back empty - retry once after 2s (webhook race condition)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryResponse = await api.teamVoices.list();
        if (retryResponse.success && retryResponse.data && retryResponse.data.length > 0) {
          setVoices(retryResponse.data);
          setActiveFromList(retryResponse.data);
          hasAttemptedFallbackRef.current = false;
          return;
        }

        // Still 0 voices after retry - create default voice from user's
        // profile. Teams tier only: creating a voice is a tier entitlement,
        // and now that every user reaches this code path, an unguarded
        // create would mint a team voice for the whole user base.
        if (isTeamsTier && !hasAttemptedFallbackRef.current) {
          hasAttemptedFallbackRef.current = true;
          try {
            // Try the profile-based endpoint first (pulls KB, profile context, etc.)
            const createResponse = await api.teamVoices.createDefault();
            if (createResponse.success && createResponse.data) {
              const newVoice = createResponse.data;
              setVoices([newVoice]);
              setActiveVoice(newVoice);
              localStorage.setItem(ACTIVE_VOICE_KEY, newVoice.id);
              fetchLimits();
              return;
            }
          } catch {
            // Endpoint may not be deployed yet - fall back to basic create
            try {
              const kbResponse = await api.kb.list();
              const defaultKb = kbResponse.success && kbResponse.data
                ? (kbResponse.data.find((kb: any) => kb.is_default) || kbResponse.data[0])
                : null;

              const fallbackResponse = await api.teamVoices.create({
                name: 'My Voice',
                knowledgeBaseId: defaultKb?.id,
              });
              if (fallbackResponse.success && fallbackResponse.data) {
                const newVoice = fallbackResponse.data;
                setVoices([newVoice]);
                setActiveVoice(newVoice);
                localStorage.setItem(ACTIVE_VOICE_KEY, newVoice.id);
                fetchLimits();
                return;
              }
            } catch (fallbackErr) {
              console.error('Failed to create fallback voice:', fallbackErr);
            }
          }
        }

        // All attempts exhausted - set empty state and tell the user.
        // Without this toast, AppContent.tsx:296 falls back to
        // `voiceId: undefined` and the user silently generates with their
        // default voice instead of their team voice. They'd never know.
        // Only a teams-tier user is missing something here. For everyone
        // else an empty list is the normal, expected answer.
        if (isTeamsTier) {
          console.error('Team voice fetch + fallback chain exhausted');
          toast.error("Couldn't load your team voice", {
            description: 'Generation will fall back to your default voice. Refresh to try again.',
            duration: 8000,
          });
        }
        setVoices([]);
        setActiveVoice(null);
      }
    } catch (error) {
      // A non-entitled caller gets a 403 here, which is the expected answer
      // rather than a failure. Only surface the retry prompt to users who
      // were supposed to have voices.
      if (isTeamsTier) {
        console.error('Failed to fetch team voices:', error);
        toast.error("Couldn't load your team voice", {
          description: 'Generation will fall back to your default voice. Refresh to try again.',
          duration: 8000,
        });
      }
      setVoices([]);
      setActiveVoice(null);
    } finally {
      setLoading(false);
    }
  }, [isTeamsTier, setActiveFromList]);

  // Fetch voices when entitlement inputs change.
  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  // Limits are fetched separately: fetchLimits depends on how many voices
  // are loaded (it floors the fallback limit at the owned count), so pairing
  // it with fetchVoices in one effect would re-fire the voice fetch every
  // time the voice list changed.
  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  // Keep voiceCount in sync with local voices array
  useEffect(() => {
    setVoiceCount(voices.length);
  }, [voices]);

  const switchVoice = useCallback((voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId);
    if (voice) {
      setActiveVoice(voice);
      localStorage.setItem(ACTIVE_VOICE_KEY, voiceId);
    }
  }, [voices]);

  const refreshVoices = useCallback(async () => {
    await fetchVoices();
    await fetchLimits();
  }, [fetchVoices, fetchLimits]);

  return (
    <VoiceContext.Provider
      value={{
        activeVoice,
        voices,
        isTeamsUser,
        isTeamsTier,
        loading,
        voiceLimit,
        voiceCount,
        switchVoice,
        refreshVoices,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceContext() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoiceContext must be used within a VoiceProvider');
  }
  return context;
}
