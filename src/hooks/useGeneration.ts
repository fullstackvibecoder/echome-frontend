'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { GeneratedContent, Platform, InputType } from '@/types';

interface UseGenerationReturn {
  generating: boolean;
  results: GeneratedContent[] | null;
  error: string | null;
  voiceScore?: number;
  qualityScore?: number;
  generate: (
    input: string,
    inputType: InputType,
    platforms: Platform[]
  ) => Promise<void>;
  reset: () => void;
}

export function useGeneration(): UseGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceScore, setVoiceScore] = useState<number>();
  const [qualityScore, setQualityScore] = useState<number>();

  const generate = useCallback(
    async (input: string, inputType: InputType, platforms: Platform[]) => {
      try {
        setGenerating(true);
        setError(null);
        setResults(null);

        const response = await api.generation.generate({
          input_type: inputType,
          input_text: inputType === 'text' ? input : undefined,
          input_audio_path: inputType === 'audio' ? input : undefined,
          input_video_path: inputType === 'video' ? input : undefined,
          platforms,
        });

        if (response.success && response.data) {
          setResults(response.data.results || []);
          setVoiceScore(response.data.voiceScore);
          setQualityScore(response.data.qualityScore);
        } else {
          throw new Error(response.error || 'Generation failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResults(null);
    setError(null);
    setVoiceScore(undefined);
    setQualityScore(undefined);
  }, []);

  return {
    generating,
    results,
    error,
    voiceScore,
    qualityScore,
    generate,
    reset,
  };
}
