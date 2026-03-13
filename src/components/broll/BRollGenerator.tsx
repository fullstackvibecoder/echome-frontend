'use client';

import React, { useState, useRef, useCallback } from 'react';
import api from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import type { AIGeneratedBRoll, BRollGenerateInput } from '@/types';

interface BRollGeneratorProps {
  contentKitId?: string;
  onGenerated?: (broll: AIGeneratedBRoll) => void;
  onClose?: () => void;
}

type Duration = 5 | 10;
type GenerationPhase = 'idle' | 'uploading' | 'generating' | 'polling' | 'complete' | 'error';

export function BRollGenerator({
  contentKitId,
  onGenerated,
  onClose,
}: BRollGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<Duration>(5);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedBRoll, setGeneratedBRoll] = useState<AIGeneratedBRoll | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const isGenerating = phase === 'uploading' || phase === 'generating' || phase === 'polling';

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleImageSelect(file);
    },
    [handleImageSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() && !imageFile) return;

    abortRef.current = false;
    setPhase('generating');
    setProgress(0);
    setStatusMessage('Starting generation...');
    setErrorMessage('');
    setDismissed(false);

    try {
      // Build input
      const input: BRollGenerateInput = {
        contentKitId,
        prompt: prompt.trim() || undefined,
        duration,
      };

      // If image file, upload to Supabase storage first
      if (imageFile) {
        setPhase('uploading');
        setStatusMessage('Uploading image...');
        const timestamp = Date.now();
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `broll-sources/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reels')
          .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('reels')
          .getPublicUrl(filePath);

        input.sourceImageUrl = urlData.publicUrl;
      }

      setPhase('generating');
      setStatusMessage('Submitting to AI...');
      setProgress(5);

      const response = await api.broll.generate(input);
      const broll = response.data;
      if (!broll) throw new Error('No data returned from generate');

      // Start polling
      setPhase('polling');
      setStatusMessage('Generating your B-roll clip...');
      setProgress(10);

      const result = await api.broll.pollStatus(
        broll.id,
        (update) => {
          if (abortRef.current) return;

          if (update.status === 'processing') {
            // Simulate progress between 10-90% over the polling period
            setProgress((prev) => Math.min(prev + 2, 90));
            setStatusMessage('AI is generating your video...');
          } else if (update.status === 'completed') {
            setProgress(100);
            setStatusMessage('Complete!');
          } else if (update.status === 'failed') {
            throw new Error(update.errorMessage || 'Generation failed');
          }
        }
      );

      if (abortRef.current) return;

      setPhase('complete');
      setProgress(100);
      setStatusMessage('B-roll generated successfully!');
      setGeneratedBRoll(result);
      onGenerated?.(result);
    } catch (err: any) {
      if (abortRef.current) return;
      setPhase('error');
      setErrorMessage(err?.message || 'Something went wrong');
      setStatusMessage('');
    }
  };

  const handleDismissProgress = () => {
    setDismissed(true);
  };

  const handleReset = () => {
    setPhase('idle');
    setProgress(0);
    setStatusMessage('');
    setErrorMessage('');
    setGeneratedBRoll(null);
    setDismissed(false);
  };

  const estimatedMinutes = duration === 5 ? '5-10' : '10-14';

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Generate AI B-Roll</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Prompt */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Describe your B-roll
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Aerial drone shot of a modern city skyline at sunset..."
          disabled={isGenerating}
          className="w-full bg-bg-primary border border-border rounded-lg p-3 min-h-[80px] text-text-primary placeholder:text-text-tertiary resize-y focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-shadow disabled:opacity-50"
        />
      </div>

      {/* Duration Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Duration
        </label>
        <div className="flex gap-2">
          {([5, 10] as Duration[]).map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                duration === d
                  ? 'bg-accent text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              } disabled:opacity-50`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* Image Upload Drop Zone */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Source image <span className="text-text-tertiary font-normal">(optional, for image-to-video)</span>
        </label>
        {imagePreview ? (
          <div className="relative border-2 border-border rounded-xl p-2 inline-block">
            <img
              src={imagePreview}
              alt="Source"
              className="max-h-32 rounded-lg object-cover"
            />
            <button
              onClick={clearImage}
              disabled={isGenerating}
              className="absolute -top-2 -right-2 bg-surface-secondary border border-border rounded-full w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Remove image"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => !isGenerating && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors ${
              isGenerating ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <svg
              className="w-8 h-8 mx-auto mb-2 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-text-tertiary">
              Drop an image here or <span className="text-accent">browse</span>
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageSelect(file);
          }}
        />
      </div>

      {/* Generate Button */}
      {phase === 'idle' && (
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() && !imageFile}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate B-Roll
        </button>
      )}

      {/* Progress Display */}
      {isGenerating && !dismissed && (
        <div className="mt-4 bg-bg-primary rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-text-primary">{statusMessage}</p>
            <button
              onClick={handleDismissProgress}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Dismiss progress"
              title="Dismiss — you can check back later"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-2 bg-bg-primary rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Estimated time: {estimatedMinutes} minutes. You can close this and check back.
          </p>
        </div>
      )}

      {/* Dismissed state */}
      {isGenerating && dismissed && (
        <div className="mt-4">
          <button
            onClick={() => setDismissed(false)}
            className="text-sm text-accent hover:underline"
          >
            Show generation progress ({progress}%)
          </button>
        </div>
      )}

      {/* Complete */}
      {phase === 'complete' && generatedBRoll && (
        <div className="mt-4 bg-bg-primary rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-text-primary">{statusMessage}</p>
          </div>
          {generatedBRoll.videoUrl && (
            <video
              src={generatedBRoll.videoUrl}
              controls
              className="w-full rounded-lg mb-3"
              poster={generatedBRoll.thumbnailUrl}
            />
          )}
          <button onClick={handleReset} className="text-sm text-accent hover:underline">
            Generate another
          </button>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="mt-4 bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <p className="text-sm text-red-400 mb-2">{errorMessage}</p>
          <button onClick={handleReset} className="text-sm text-accent hover:underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
