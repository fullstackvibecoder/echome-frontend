'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { extractError } from '@/lib/error-utils';
import { GeneratedContent, Platform, InputType, BackgroundConfig, DesignPreset } from '@/types';

interface GenerationOptions {
  designPreset?: DesignPreset;
  carouselBackground?: BackgroundConfig;
  voiceId?: string;
}

interface UseGenerationReturn {
  generating: boolean;
  requestId: string | null;
  results: GeneratedContent[] | null;
  error: string | null;
  isQuotaError: boolean;
  voiceScore?: number;
  qualityScore?: number;
  generate: (
    input: string,
    inputType: InputType,
    platforms: Platform[],
    options?: GenerationOptions
  ) => Promise<string | null>;
  repurpose: (
    contentId: string,
    platforms: Platform[],
    options?: GenerationOptions
  ) => Promise<string | null>;
  reset: () => void;
}

export function useGeneration(): UseGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [voiceScore, setVoiceScore] = useState<number>();
  const [qualityScore, setQualityScore] = useState<number>();

  const generate = useCallback(
    async (
      input: string,
      inputType: InputType,
      platforms: Platform[],
      options?: GenerationOptions
    ): Promise<string | null> => {
      try {
        setGenerating(true);
        setError(null);
        setIsQuotaError(false);
        setResults(null);
        setRequestId(null);

        const response = await api.generation.generate({
          inputType,
          inputText: inputType === 'text' ? input : undefined,
          inputAudioPath: inputType === 'audio' ? input : undefined,
          inputVideoPath: inputType === 'video' ? input : undefined,
          platforms,
          voiceId: options?.voiceId,
          // Pass carousel design options
          designPreset: options?.designPreset,
          carouselBackground: options?.carouselBackground,
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
        const extracted = extractError(err, 'Generation failed');
        setError(extracted.message);
        // Detect quota/subscription errors from backend
        const isQuota = extracted.status === 403 &&
          /free generation|generation limit|subscribe|upgrade|quota/i.test(extracted.message);
        setIsQuotaError(isQuota || extracted.isPaymentRequired);
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
    ): Promise<string | null> => {
      try {
        setError(null);
        setResults(null);
        setRequestId(null);

        // Build API options. Don't pass designPreset by default — backend
        // resolveCarouselDesign() defaults to branded-overlay (the modern
        // auto-generated style). Only include if a caller explicitly chose
        // a non-auto value (rare; pre-gen pickers were removed).
        const apiOptions: Parameters<typeof api.creators.repurpose>[1] = {
          platforms: platforms as string[],
        };
        if (options?.designPreset && options.designPreset !== 'auto') {
          apiOptions.designPreset = options.designPreset as typeof apiOptions.designPreset;
        }

        // Always send carouselBackground if present (for image uploads)
        if (options?.carouselBackground) {
          apiOptions.carouselBackground = {
            type: options.carouselBackground.type,
            presetId: options.carouselBackground.presetId,
            imageUrl: options.carouselBackground.imageUrl,
          };
        }

        const response = await api.creators.repurpose(contentId, apiOptions);

        if (response.success && response.result.requestId) {
          const reqId = response.result.requestId;

          // Set requestId for SSE progress tracking
          setRequestId(reqId);

          // If we have generatedContent immediately (sync response), use it
          if (response.result.generatedContent) {
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
          }
          // Note: We don't set generating=true for repurpose flows because
          // the caller redirects immediately to the detail page which has
          // its own progress UI. This also prevents the generation banner
          // from appearing and persisting after redirect.

          // Return requestId so caller can redirect immediately
          return reqId;
        } else {
          throw new Error(response.result?.error || 'Repurposing failed');
        }
      } catch (err) {
        console.error('Repurpose error:', err);
        setError(extractError(err, 'Repurposing failed').message);
        setGenerating(false);
        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setRequestId(null);
    setResults(null);
    setError(null);
    setIsQuotaError(false);
    setVoiceScore(undefined);
    setQualityScore(undefined);
  }, []);

  return {
    generating,
    requestId,
    results,
    error,
    isQuotaError,
    voiceScore,
    qualityScore,
    generate,
    repurpose,
    reset,
  };
}
