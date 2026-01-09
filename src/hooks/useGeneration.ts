'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { GeneratedContent, Platform, InputType, BackgroundConfig, DesignPreset } from '@/types';

interface UseGenerationReturn {
  generating: boolean;
  requestId: string | null;
  results: GeneratedContent[] | null;
  error: string | null;
  voiceScore?: number;
  qualityScore?: number;
  generate: (
    input: string,
    inputType: InputType,
    platforms: Platform[]
  ) => Promise<string | null>;
  repurpose: (
    contentId: string,
    platforms: Platform[],
    options?: { designPreset?: DesignPreset; carouselBackground?: BackgroundConfig }
  ) => Promise<void>;
  reset: () => void;
}

export function useGeneration(): UseGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceScore, setVoiceScore] = useState<number>();
  const [qualityScore, setQualityScore] = useState<number>();

  const generate = useCallback(
    async (input: string, inputType: InputType, platforms: Platform[]): Promise<string | null> => {
      try {
        setGenerating(true);
        setError(null);
        setResults(null);
        setRequestId(null);

        const response = await api.generation.generate({
          inputType,
          inputText: inputType === 'text' ? input : undefined,
          inputAudioPath: inputType === 'audio' ? input : undefined,
          inputVideoPath: inputType === 'video' ? input : undefined,
          platforms,
        });

        if (response.success && response.data) {
          // Response data contains requestId at top level (from backend API)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = response.data as any;
          const newRequestId = (data.requestId as string) || null;
          setRequestId(newRequestId);
          setResults(data.results || []);
          setVoiceScore(data.voiceScore);
          setQualityScore(data.qualityScore);
          return newRequestId;
        } else {
          throw new Error(response.error || 'Generation failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
        return null;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const repurpose = useCallback(
    async (
      contentId: string,
      platforms: Platform[],
      options?: { designPreset?: DesignPreset; carouselBackground?: BackgroundConfig }
    ) => {
      try {
        setGenerating(true);
        setError(null);
        setResults(null);
        setRequestId(null);

        // Build API options - prefer new designPreset, fall back to legacy carouselBackground
        const apiOptions: Parameters<typeof api.creators.repurpose>[1] = {
          platforms: platforms as string[],
        };

        if (options?.designPreset) {
          apiOptions.designPreset = options.designPreset;
        } else if (options?.carouselBackground) {
          // Legacy support
          apiOptions.carouselBackground = {
            type: options.carouselBackground.type,
            presetId: options.carouselBackground.presetId,
            imageUrl: options.carouselBackground.imageUrl,
          };
        } else {
          // Default to 'auto' design preset
          apiOptions.designPreset = 'auto';
        }

        const response = await api.creators.repurpose(contentId, apiOptions);

        if (response.success && response.result.requestId) {
          // Set requestId immediately for SSE progress tracking
          setRequestId(response.result.requestId);

          // If we have generatedContent immediately (sync response), use it
          if (response.result.generatedContent) {
            const reqId = response.result.requestId;
            const generatedResults: GeneratedContent[] = response.result.generatedContent.results.map((r, idx) => ({
              id: `${reqId}-${r.platform}-${idx}`,
              requestId: reqId,
              platform: r.platform as Platform,
              content: r.content,
              voiceScore: 0,
              qualityScore: 0,
              createdAt: new Date(),
            }));
            setResults(generatedResults);
            setGenerating(false);
          }
          // Otherwise, async flow - SSE will track progress, results fetched on complete
          // Keep generating=true, results will be fetched when SSE completes
        } else {
          throw new Error(response.result?.error || 'Repurposing failed');
        }
      } catch (err) {
        // Extract error message from axios error response if available
        let errorMessage = 'Repurposing failed';
        if (err && typeof err === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const axiosError = err as any;
          if (axiosError.response?.data?.error?.message) {
            errorMessage = axiosError.response.data.error.message;
          } else if (axiosError.response?.data?.error) {
            errorMessage = typeof axiosError.response.data.error === 'string'
              ? axiosError.response.data.error
              : 'Repurposing failed';
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }
        }
        console.error('Repurpose error:', err);
        setError(errorMessage);
        setGenerating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setRequestId(null);
    setResults(null);
    setError(null);
    setVoiceScore(undefined);
    setQualityScore(undefined);
  }, []);

  return {
    generating,
    requestId,
    results,
    error,
    voiceScore,
    qualityScore,
    generate,
    repurpose,
    reset,
  };
}
