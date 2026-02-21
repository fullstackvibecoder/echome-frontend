'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api, TeamVoice } from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

interface VoiceContextType {
  /** Currently active voice (null = single-user, no teams) */
  activeVoice: TeamVoice | null;
  /** All voices for this user */
  voices: TeamVoice[];
  /** Whether the user is on a teams tier */
  isTeamsUser: boolean;
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
  const { user } = useAuth();
  const { tier, isSubscribed, isTrial } = useSubscription();
  const [voices, setVoices] = useState<TeamVoice[]>([]);
  const [activeVoice, setActiveVoice] = useState<TeamVoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiceLimit, setVoiceLimit] = useState(0);
  const [voiceCount, setVoiceCount] = useState(0);
  const hasAttemptedFallbackRef = useRef(false);

  const isTeamsUser = (isSubscribed || isTrial) && (tier === 'teams_2' || tier === 'teams_5' || tier === 'teams_10');

  // Tier-based fallback limits (used when /limits endpoint isn't available)
  const tierLimits: Record<string, number> = { teams_2: 2, teams_5: 5, teams_10: 10 };

  const fetchLimits = useCallback(async () => {
    if (!isTeamsUser) {
      setVoiceLimit(0);
      setVoiceCount(0);
      return;
    }

    try {
      const response = await api.teamVoices.getLimits();
      if (response.success && response.data) {
        setVoiceLimit(response.data.voiceLimit);
        setVoiceCount(response.data.voiceCount);
        return;
      }
    } catch {
      // Endpoint may not be deployed yet — use tier-based fallback
    }

    // Fallback: derive limit from tier, count from local voices state
    if (tier) {
      setVoiceLimit(tierLimits[tier] || 0);
    }
  }, [isTeamsUser, tier]);

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
    if (!isTeamsUser) {
      setVoices([]);
      setActiveVoice(null);
      return;
    }

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

        // Voices came back empty — retry once after 2s (webhook race condition)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const retryResponse = await api.teamVoices.list();
        if (retryResponse.success && retryResponse.data && retryResponse.data.length > 0) {
          setVoices(retryResponse.data);
          setActiveFromList(retryResponse.data);
          hasAttemptedFallbackRef.current = false;
          return;
        }

        // Still 0 voices after retry — create default voice from user's profile
        if (!hasAttemptedFallbackRef.current) {
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
            // Endpoint may not be deployed yet — fall back to basic create
            try {
              const fallbackResponse = await api.teamVoices.create({
                name: user?.name || 'My Voice',
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

        // All attempts exhausted — set empty state
        setVoices([]);
        setActiveVoice(null);
      }
    } catch (error) {
      console.error('Failed to fetch team voices:', error);
    } finally {
      setLoading(false);
    }
  }, [isTeamsUser, setActiveFromList]);

  // Fetch voices and limits when teams status changes
  useEffect(() => {
    fetchVoices();
    fetchLimits();
  }, [fetchVoices, fetchLimits]);

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
