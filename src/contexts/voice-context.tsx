'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, TeamVoice } from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';

interface VoiceContextType {
  /** Currently active voice (null = single-user, no teams) */
  activeVoice: TeamVoice | null;
  /** All voices for this user */
  voices: TeamVoice[];
  /** Whether the user is on a teams tier */
  isTeamsUser: boolean;
  /** Loading state */
  loading: boolean;
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

  const isTeamsUser = (isSubscribed || isTrial) && (tier === 'teams_2' || tier === 'teams_5' || tier === 'teams_10');

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
        setVoices(voiceList);

        // Restore previously active voice from localStorage
        const savedVoiceId = localStorage.getItem(ACTIVE_VOICE_KEY);
        const savedVoice = savedVoiceId ? voiceList.find(v => v.id === savedVoiceId) : null;

        if (savedVoice) {
          setActiveVoice(savedVoice);
        } else {
          // Default to the default voice
          const defaultVoice = voiceList.find(v => v.isDefault) || voiceList[0] || null;
          setActiveVoice(defaultVoice);
          if (defaultVoice) {
            localStorage.setItem(ACTIVE_VOICE_KEY, defaultVoice.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch team voices:', error);
    } finally {
      setLoading(false);
    }
  }, [isTeamsUser]);

  // Fetch voices when teams status changes
  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  const switchVoice = useCallback((voiceId: string) => {
    const voice = voices.find(v => v.id === voiceId);
    if (voice) {
      setActiveVoice(voice);
      localStorage.setItem(ACTIVE_VOICE_KEY, voiceId);
    }
  }, [voices]);

  const refreshVoices = useCallback(async () => {
    await fetchVoices();
  }, [fetchVoices]);

  return (
    <VoiceContext.Provider
      value={{
        activeVoice,
        voices,
        isTeamsUser,
        loading,
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
