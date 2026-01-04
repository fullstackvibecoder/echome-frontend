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
  repurpose: (
    contentId: string,
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
          inputType,
          inputText: inputType === 'text' ? input : undefined,
          inputAudioPath: inputType === 'audio' ? input : undefined,
          inputVideoPath: inputType === 'video' ? input : undefined,
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

  const repurpose = useCallback(
    async (contentId: string, platforms: Platform[]) => {
      try {
        setGenerating(true);
        setError(null);
        setResults(null);

        const response = await api.creators.repurpose(contentId, {
          platforms: platforms as string[],
        });

        if (response.success && response.result.generatedContent) {
          // Transform repurpose result to match GeneratedContent format
          const generatedResults: GeneratedContent[] = response.result.generatedContent.results.map((r, idx) => ({
            id: `${contentId}-${r.platform}-${idx}`,
            requestId: contentId,
            platform: r.platform as Platform,
            content: r.content,
            voiceScore: 0, // Will be filled by backend in future
            qualityScore: 0,
            createdAt: new Date(),
          }));
          setResults(generatedResults);
        } else {
          throw new Error(response.result.error || 'Repurposing failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Repurposing failed');
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
    repurpose,
    reset,
  };
}
