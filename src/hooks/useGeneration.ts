'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { extractError } from '@/lib/error-utils';
import { GeneratedContent, Platform, InputType, BackgroundConfig, DesignPreset } from '@/types';
import { ApiTimeoutWrapper } from '@/lib/api-timeout-wrapper';
import { TimeoutConfigs } from '@/lib/timeout-manager';

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
  progress: string | null;
  timeElapsed: number;
  canCancel: boolean;
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
  cancel: () => boolean;
}

export function useGeneration(): UseGenerationReturn {
  const [generating, setGenerating] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedContent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [voiceScore, setVoiceScore] = useState<number>();
  const [qualityScore, setQualityScore] = useState<number>();
  const [progress, setProgress] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canCancel, setCanCancel] = useState(false);
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);

  const generate = useCallback(
    async (
      input: string,
      inputType: InputType,
      platforms: Platform[],
      options?: GenerationOptions
    ): Promise<string | null> => {
      const operationId = `generation-${Date.now()}`;
      setCurrentOperationId(operationId);
      
      try {
        setGenerating(true);
        setError(null);
        setIsQuotaError(false);
        setResults(null);
        setRequestId(null);
        setProgress('Preparing generation...');
        setTimeElapsed(0);
        setCanCancel(true);

        const generateInput = {
          inputType,
          inputText: inputType === 'text' ? input : undefined,
          inputAudioPath: inputType === 'audio' ? input : undefined,
          inputVideoPath: inputType === 'video' ? input : undefined,
          platforms,
          voiceId: options?.voiceId,
          designPreset: options?.designPreset,
          carouselBackground: options?.carouselBackground,
        };

        const response = await ApiTimeoutWrapper.generateContent(
          generateInput,
          {
            operationId,
            onProgress: (message, elapsed) => {
              setProgress(message);
              setTimeElapsed(elapsed);
            },
            onTimeout: (attempt, elapsed) => {
              const minutes = Math.floor(elapsed / 60000);
              
              if (attempt === 1) {
                setProgress(`Taking longer than expected (${minutes}m). Retrying with extended timeout...`);
                return true; // Auto-retry first timeout
              }
              
              // Ask user for subsequent retries
              const shouldContinue = confirm(
                `Content generation has been running for ${minutes} minutes. This might be due to high server load.\n\n` +
                `Would you like to continue waiting? (Attempt ${attempt} of 3)`
              );
              
              if (shouldContinue) {
                setProgress(`Continuing generation (attempt ${attempt} of 3)...`);
              }
              
              return shouldContinue;
            },
          }
        );

        if (response.success && response.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = response.data as any;
          const newRequestId = (data.requestId as string) || null;
          setRequestId(newRequestId);
          setResults(data.results || []);
          setVoiceScore(data.voiceScore);
          setQualityScore(data.qualityScore);
          setProgress('Generation completed!');
          return newRequestId;
        } else {
          throw new Error(response.error || 'Generation failed');
        }
      } catch (err: any) {
        // Handle timeout-specific errors with better messaging
        if (err.message?.includes('timed out') || err.message?.includes('180000ms exceeded')) {
          setError(
            'Content generation is taking longer than expected due to high server load. ' +
            'Please try again in a few minutes. If this continues, please contact support.'
          );
          return null;
        }
        
        if (err.message?.includes('cancelled by user')) {
          setError('Generation cancelled');
          return null;
        }

        const extracted = extractError(err, 'Generation failed');
        setError(extracted.message);
        
        // Detect quota/subscription errors from backend
        const isQuota = extracted.status === 403 &&
          /free generation|generation limit|subscribe|upgrade|quota/i.test(extracted.message);
        setIsQuotaError(isQuota || extracted.isPaymentRequired);
        return null;
      } finally {
        setGenerating(false);
        setCanCancel(false);
        setCurrentOperationId(null);
        
        // Clear progress after a delay
        setTimeout(() => {
          setProgress(null);
        }, 3000);
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

        // Build API options - send both designPreset and carouselBackground
        // Backend's resolveCarouselDesign() handles the priority logic
        const apiOptions: Parameters<typeof api.creators.repurpose>[1] = {
          platforms: platforms as string[],
          designPreset: options?.designPreset || 'auto',
        };

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

  const cancel = useCallback(() => {
    if (currentOperationId) {
      const cancelled = ApiTimeoutWrapper.cancel(currentOperationId);
      if (cancelled) {
        setGenerating(false);
        setCanCancel(false);
        setProgress('Cancelled');
        setCurrentOperationId(null);
        
        // Clear cancelled state after a delay
        setTimeout(() => {
          setProgress(null);
        }, 2000);
      }
      return cancelled;
    }
    return false;
  }, [currentOperationId]);

  const reset = useCallback(() => {
    // Cancel any running operation
    if (currentOperationId) {
      ApiTimeoutWrapper.cancel(currentOperationId);
    }
    
    setRequestId(null);
    setResults(null);
    setError(null);
    setIsQuotaError(false);
    setVoiceScore(undefined);
    setQualityScore(undefined);
    setProgress(null);
    setTimeElapsed(0);
    setCanCancel(false);
    setGenerating(false);
    setCurrentOperationId(null);
  }, [currentOperationId]);

  return {
    generating,
    requestId,
    results,
    error,
    isQuotaError,
    voiceScore,
    qualityScore,
    progress,
    timeElapsed,
    canCancel,
      };
}
