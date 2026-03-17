'use client';

/**
 * B-Roll Reel Wizard (Revamped)
 *
 * Simplified 3-step wizard: Choose Clips -> Describe & Style -> Review & Generate
 * Centers on curated B-roll + AI text overlays.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api-client';
import type {
  AIGeneratedBRoll,
  TextOverlayStyleId,
  BRollReelComposition,
} from '@/types';
import { CuratedBRollPicker } from '@/components/broll/CuratedBRollPicker';
import { BRollLibrary } from '@/components/broll/BRollLibrary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BRollReelWizardProps {
  onComplete?: (composition: BRollReelComposition) => void;
  onCancel?: () => void;
}

type WizardStep = 'clips' | 'describe' | 'review';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'clips', label: 'Choose Clips' },
  { key: 'describe', label: 'Describe & Style' },
  { key: 'review', label: 'Review & Generate' },
];

interface StyleOption {
  id: TextOverlayStyleId;
  name: string;
  description: string;
  mockupLines: string[];
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'bold_impact',
    name: 'Bold Impact',
    description: 'Big, punchy text that grabs attention',
    mockupLines: ['STOP', 'SCROLLING'],
  },
  {
    id: 'minimal_clean',
    name: 'Minimal Clean',
    description: 'Subtle, elegant text placement',
    mockupLines: ['less is', 'more'],
  },
  {
    id: 'brand_gradient',
    name: 'Brand Gradient',
    description: 'Gradient-backed text with brand energy',
    mockupLines: ['Your Brand', 'Your Story'],
  },
  {
    id: 'story_cards',
    name: 'Story Cards',
    description: 'Card-style overlays like IG stories',
    mockupLines: ['Swipe-ready', 'stories'],
  },
  {
    id: 'outlined_stroke',
    name: 'Outlined',
    description: 'Bold outlined text, no background',
    mockupLines: ['STAND', 'OUT'],
  },
  {
    id: 'subtitle_bar',
    name: 'Auto-Caption',
    description: 'Bottom pill bar like IG captions',
    mockupLines: ['auto-generated captions'],
  },
  {
    id: 'neon_glow',
    name: 'Neon Glow',
    description: 'Glowing text with color halo',
    mockupLines: ['glow', 'up'],
  },
];

// ---------------------------------------------------------------------------
// Shared Styled Text Overlay Component
// ---------------------------------------------------------------------------

function StyledTextOverlay({ text, styleId }: { text: string; styleId: TextOverlayStyleId }) {
  if (!text) {
    return <p className="text-white/40 text-sm">Text preview</p>;
  }

  switch (styleId) {
    case 'bold_impact':
      return (
        <div className="px-3 py-2 rounded-lg text-center text-white text-xl font-black uppercase">
          {text}
        </div>
      );
    case 'minimal_clean':
      return (
        <div className="px-3 py-2 rounded-lg text-center text-white text-base font-light tracking-wide">
          {text}
        </div>
      );
    case 'brand_gradient':
      return (
        <div className="px-4 py-3 rounded-lg text-center bg-gradient-to-r from-accent/80 to-purple-500/80 text-white text-base font-bold">
          {text}
        </div>
      );
    case 'story_cards':
      return (
        <div className="px-4 py-3 rounded-lg text-center bg-white/90 dark:bg-black/60 text-text-primary text-base font-semibold shadow-sm">
          {text}
        </div>
      );
    case 'outlined_stroke':
      return (
        <div
          className="px-3 py-2 text-center text-white text-2xl font-black uppercase"
          style={{ WebkitTextStroke: '2px black' }}
        >
          {text}
        </div>
      );
    case 'subtitle_bar':
      return (
        <div className="absolute bottom-6 left-3 right-3 flex justify-center">
          <div className="bg-black/70 rounded-full px-5 py-2 text-white text-sm text-center">
            {text}
          </div>
        </div>
      );
    case 'neon_glow':
      return (
        <div
          className="px-3 py-2 text-center text-white text-xl font-bold"
          style={{ textShadow: '0 0 20px #a78bfa, 0 0 40px #a78bfa' }}
        >
          {text}
        </div>
      );
    default:
      return (
        <div className="px-3 py-2 rounded-lg text-center text-white text-base">
          {text}
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: typeof STEPS;
  currentStep: WizardStep;
}) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center w-full">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${isCompleted ? 'bg-accent text-white' : ''}
                  ${isActive ? 'bg-accent/20 text-accent font-semibold ring-2 ring-accent' : ''}
                  ${!isCompleted && !isActive ? 'bg-surface-secondary text-text-tertiary' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`
                  text-xs mt-1 whitespace-nowrap
                  ${isActive ? 'text-accent font-semibold' : ''}
                  ${isCompleted ? 'text-accent' : ''}
                  ${!isCompleted && !isActive ? 'text-text-tertiary' : ''}
                `}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 mt-[-1rem] ${
                  i < currentIndex ? 'bg-accent' : 'bg-border'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Wizard Component
// ---------------------------------------------------------------------------

export function BRollReelWizard({ onComplete, onCancel }: BRollReelWizardProps) {
  // Wizard navigation
  const [currentStep, setCurrentStep] = useState<WizardStep>('clips');

  // Step 1 - Choose Clips
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [selectedClipUrl, setSelectedClipUrl] = useState<string | null>(null);
  const [showAILibrary, setShowAILibrary] = useState(false);

  // Step 2 - Describe & Style
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<TextOverlayStyleId>('bold_impact');
  const [activePreviewStyleIndex, setActivePreviewStyleIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  // Step 3 - Review & Generate
  const [overlays, setOverlays] = useState<Array<{ text: string; position: string }>>([]);
  const [loadingOverlays, setLoadingOverlays] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [composition, setComposition] = useState<BRollReelComposition | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Style auto-rotation for step 2
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isAutoRotating || currentStep !== 'describe') return;
    const timer = setInterval(() => {
      setActivePreviewStyleIndex((i) => (i + 1) % STYLE_OPTIONS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [isAutoRotating, currentStep]);

  // Sync selectedStyle when auto-rotating
  useEffect(() => {
    if (isAutoRotating && currentStep === 'describe') {
      setSelectedStyle(STYLE_OPTIONS[activePreviewStyleIndex].id);
    }
  }, [activePreviewStyleIndex, isAutoRotating, currentStep]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1].key);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1].key);
    }
  };

  // Preview text: first ~6 words of topic, or style's mockup fallback
  const getPreviewText = (style: StyleOption): string => {
    if (topic.trim()) {
      const words = topic.trim().split(/\s+/).slice(0, 6);
      return words.join(' ') + (topic.trim().split(/\s+/).length > 6 ? '...' : '');
    }
    return style.mockupLines.join(' ');
  };

  // Fetch AI text overlays on entering review step
  useEffect(() => {
    if (currentStep === 'review' && overlays.length === 0 && topic.trim()) {
      fetchOverlays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const fetchOverlays = useCallback(async () => {
    setLoadingOverlays(true);
    setOverlayError(null);
    try {
      const res = await api.brollReels.previewTextOverlays({
        topic: topic.trim(),
        clipCount: selectedClipIds.length,
      });
      if (res.success && res.data?.overlays) {
        setOverlays(res.data.overlays);
      } else {
        setOverlayError('Could not generate text. You can type your own overlays below.');
        // Initialize empty overlays
        setOverlays(selectedClipIds.map(() => ({ text: '', position: 'center' })));
      }
    } catch {
      setOverlayError('Could not generate text. You can type your own overlays below.');
      setOverlays(selectedClipIds.map(() => ({ text: '', position: 'center' })));
    } finally {
      setLoadingOverlays(false);
    }
  }, [topic, selectedClipIds]);

  const handleGenerate = async () => {
    if (!selectedStyle || selectedClipIds.length === 0) return;
    setIsGenerating(true);
    setGenerateError(null);
    setGenerateProgress(5);

    try {
      const res = await api.brollReels.compose({
        brollClipIds: selectedClipIds,
        templateStyle: selectedStyle,
        generateText: false,
        topic: topic.trim() || undefined,
        textOverlays: overlays.filter((o) => o.text.trim()),
      });

      if (!res.success || !res.data?.projectId) {
        throw new Error('submit_failed');
      }

      const projectId = res.data.projectId;
      setGenerateProgress(15);

      // Poll for completion
      const maxAttempts = 120;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));

        try {
          const statusRes = await api.reels.getRenderStatus(projectId);
          const status = statusRes.data;

          if (status?.status === 'completed') {
            setGenerateProgress(100);
            const result: BRollReelComposition = {
              id: projectId,
              userId: '',
              reelProjectId: projectId,
              brollSource: 'library',
              brollClipIds: selectedClipIds,
              templateStyle: selectedStyle,
              textOverlays: overlays.map((o, i) => ({ clipIndex: i, text: o.text, position: o.position as 'top' | 'center' | 'bottom' })),
              status: 'completed',
              outputUrl: status.outputUrl || '',
              thumbnailUrl: status.thumbnailUrl || '',
              createdAt: new Date().toISOString(),
            };
            setComposition(result);
            onComplete?.(result);
            return;
          }

          if (status?.status === 'failed') {
            throw new Error(status.errorMessage || 'render_failed');
          }

          const newProgress = Math.min(15 + Math.round((attempt / maxAttempts) * 75), 90);
          setGenerateProgress(newProgress);
        } catch (pollErr: any) {
          if (pollErr?.message === 'render_failed' || pollErr?.message?.includes('failed')) {
            throw pollErr;
          }
        }
      }

      throw new Error('timeout');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('timeout')) {
        setGenerateError('Reel generation is taking longer than expected. Check back in My Reels.');
      } else if (msg.includes('not configured') || msg.includes('503')) {
        setGenerateError('AI video service is temporarily unavailable. Please try again shortly.');
      } else if (msg === 'submit_failed') {
        setGenerateError('Failed to start reel generation. Please check your clips and try again.');
      } else if (msg.includes('render_failed') || msg.includes('failed')) {
        setGenerateError('Reel rendering failed. Try different clips or a shorter selection.');
      } else {
        setGenerateError('Something went wrong. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClipSelectionChange = (ids: string[], mediaUrl?: string) => {
    setSelectedClipIds(ids);
    setSelectedClipUrl(mediaUrl || null);
  };

  const handleAILibrarySelectionChange = (ids: string[]) => {
    setSelectedClipIds(ids);
    setSelectedClipUrl(null);
  };

  const updateOverlayText = (index: number, text: string) => {
    setOverlays((prev) =>
      prev.map((o, i) => (i === index ? { ...o, text } : o))
    );
  };

  // ---------------------------------------------------------------------------
  // Step 1 - Choose Clips
  // ---------------------------------------------------------------------------

  const renderClipsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-2">Choose B-Roll Clips</h2>
        <p className="text-text-secondary text-sm">
          Select a clip from the curated library, or use your own AI-generated clip.
        </p>
      </div>

      {/* Selected count */}
      {selectedClipIds.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-accent font-medium">
            {selectedClipIds.length} clip{selectedClipIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedClipIds([])}
            className="text-xs text-text-secondary hover:text-accent"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Curated clips (primary) */}
      <CuratedBRollPicker
        selectedIds={selectedClipIds}
        onSelectionChange={handleClipSelectionChange}
      />

      {/* AI-generated clips (secondary, collapsible) */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAILibrary(!showAILibrary)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>Or use your AI-generated clips</span>
          <svg
            className={`w-4 h-4 transition-transform ${showAILibrary ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAILibrary && (
          <div className="px-4 pb-4">
            <BRollLibrary
              selectable
              selectedIds={selectedClipIds}
              onSelectionChange={handleAILibrarySelectionChange}
            />
          </div>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 2 - Describe & Style (Redesigned)
  // ---------------------------------------------------------------------------

  const renderDescribeStep = () => {
    const currentPreviewStyle = STYLE_OPTIONS[activePreviewStyleIndex];
    const previewText = getPreviewText(currentPreviewStyle);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-2">Describe & Style</h2>
          <p className="text-text-secondary text-sm">
            Tell us what this reel is about and pick a text style. We&apos;ll generate voice-matched overlays.
          </p>
        </div>

        {/* Topic textarea */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            What&apos;s this reel about?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., 3 tips for staging a home before listing"
            rows={3}
            className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            maxLength={2000}
          />
          <p className="text-xs text-text-tertiary text-right">{topic.length}/2000</p>
        </div>

        {/* Single rotating preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[240px] aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border border-border">
            {selectedClipUrl ? (
              <video
                src={selectedClipUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-surface-secondary to-black/80" />
            )}
            {/* Text overlay — positioned based on style */}
            {currentPreviewStyle.id === 'subtitle_bar' ? (
              <StyledTextOverlay text={previewText} styleId={currentPreviewStyle.id} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <StyledTextOverlay text={previewText} styleId={currentPreviewStyle.id} />
              </div>
            )}
            {/* Style name badge */}
            <div className="absolute top-3 left-3 bg-black/60 rounded-full px-3 py-1">
              <span className="text-xs text-white/80 font-medium">{currentPreviewStyle.name}</span>
            </div>
          </div>

          {/* Auto-preview toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className="text-xs text-text-tertiary hover:text-accent transition-colors flex items-center gap-1"
          >
            {isAutoRotating ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Auto-previewing
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Resume auto-preview
              </>
            )}
          </button>
        </div>

        {/* Horizontal style chip row */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Text Style</label>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {STYLE_OPTIONS.map((style, i) => (
              <button
                key={style.id}
                onClick={() => {
                  setSelectedStyle(style.id);
                  setActivePreviewStyleIndex(i);
                  setIsAutoRotating(false);
                }}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${
                    selectedStyle === style.id
                      ? 'bg-accent text-white ring-2 ring-accent ring-offset-2 ring-offset-surface'
                      : 'bg-surface-secondary text-text-secondary hover:text-text-primary border border-border'
                  }
                `}
              >
                {style.name}
              </button>
            ))}
          </div>
          {/* Selected style description */}
          <p className="text-xs text-text-tertiary">
            {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.description}
          </p>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Step 3 - Review & Generate
  // ---------------------------------------------------------------------------

  const renderReviewStep = () => {
    // Progress screen
    if (isGenerating) {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-surface-secondary" />
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-accent">{generateProgress}%</span>
            </div>
          </div>
          <h2 className="text-xl font-medium text-text-primary mb-2">Creating your reel...</h2>
          <p className="text-text-secondary">
            Composing clips with text overlays. This may take a moment.
          </p>
          <div className="w-full max-w-md mx-auto h-2 bg-surface-secondary rounded-full overflow-hidden mt-6">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${generateProgress}%` }}
            />
          </div>
        </div>
      );
    }

    // Completed
    if (composition) {
      return (
        <div className="text-center py-12 space-y-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-text-primary">Your Reel is Ready!</h2>
          {composition.outputUrl && (
            <div className="max-w-xs mx-auto space-y-4">
              <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
                <video
                  src={composition.outputUrl}
                  poster={composition.thumbnailUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <a
                href={composition.outputUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Reel
              </a>
            </div>
          )}
        </div>
      );
    }

    // Error
    if (generateError) {
      return (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-text-primary">Generation Failed</h2>
          <p className="text-text-secondary">{generateError}</p>
          <button onClick={() => setGenerateError(null)} className="btn-primary">
            Try Again
          </button>
        </div>
      );
    }

    // Loading overlays
    if (loadingOverlays) {
      return (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-medium text-text-primary mb-2">Generating text overlays...</h2>
          <p className="text-text-secondary text-sm">
            Creating voice-matched text for your reel based on your topic.
          </p>
        </div>
      );
    }

    // Review with editable overlays
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-2">Review & Generate</h2>
          <p className="text-text-secondary text-sm">
            Edit the AI-generated text overlays, then generate your reel.
          </p>
        </div>

        {overlayError && (
          <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {overlayError}
          </p>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Phone preview with actual video */}
          <div className="mx-auto md:mx-0 flex-shrink-0">
            <div className="w-[240px] aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border border-border">
              {selectedClipUrl ? (
                <video
                  src={selectedClipUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-secondary" />
              )}
              {selectedStyle === 'subtitle_bar' ? (
                <StyledTextOverlay text={overlays[0]?.text || ''} styleId={selectedStyle} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <StyledTextOverlay text={overlays[0]?.text || ''} styleId={selectedStyle} />
                </div>
              )}
            </div>
          </div>

          {/* Editable overlay fields */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-secondary">
                {overlays.length} segment{overlays.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={fetchOverlays}
                disabled={loadingOverlays || !topic.trim()}
                className="text-sm text-accent hover:text-accent/80 disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
            </div>

            {overlays.map((overlay, i) => (
              <div key={i} className="space-y-1">
                <label className="text-xs text-text-secondary">Segment {i + 1}</label>
                <input
                  type="text"
                  value={overlay.text}
                  onChange={(e) => updateOverlayText(i, e.target.value)}
                  placeholder={`Text for segment ${i + 1}...`}
                  className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            ))}

            {/* Summary */}
            <div className="bg-surface-secondary rounded-lg border border-border p-4 space-y-2 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary">Clips:</span>
                <span className="text-text-primary font-medium">{selectedClipIds.length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary">Style:</span>
                <span className="text-text-primary font-medium">
                  {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name}
                </span>
              </div>
              {topic && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-text-secondary flex-shrink-0">Topic:</span>
                  <span className="text-text-primary truncate">{topic}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="btn-primary w-full text-lg py-4"
        >
          Generate Reel
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'clips':
        return selectedClipIds.length >= 1;
      case 'describe':
        return selectedStyle !== null;
      case 'review':
        return false;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <div className="min-h-[400px]">
        {currentStep === 'clips' && renderClipsStep()}
        {currentStep === 'describe' && renderDescribeStep()}
        {currentStep === 'review' && renderReviewStep()}
      </div>

      {/* Navigation */}
      {!isGenerating && !composition && (
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <button
            onClick={stepIndex === 0 ? onCancel : goBack}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep !== 'review' && (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}
