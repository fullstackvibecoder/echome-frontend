'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

export interface VoiceStrengthData {
  overallStrength: number;
  waveformData: number[];
  profileCompleteness: {
    samplesAnalyzed: number;
    signaturePhrasesFound: number;
    toneMarkersFound: number;
    sourceDiversity: number;
  };
  recentPerformance: {
    avgVoiceScore: number;
    avgEmbeddingSimilarity: number;
    generationCount: number;
  };
  dimensionBreakdown: {
    signaturePresence: number;
    avoidAbsence: number;
    styleAlignment: number;
    aiBlacklistAbsence: number;
    embeddingSimilarity: number | null;
  };
}

export function useVoiceStrength() {
  const [data, setData] = useState<VoiceStrengthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStrength = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.voice.getStrength();
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch voice strength');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrength();
  }, [fetchStrength]);

  return { data, loading, error, refresh: fetchStrength };
}
