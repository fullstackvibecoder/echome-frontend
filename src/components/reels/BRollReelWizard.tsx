'use client';

/**
 * B-Roll Reel Wizard
 *
 * Multi-step wizard for composing B-roll reels with text overlays.
 * Steps: Source -> Style -> Text -> Music -> Generate
 */

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api-client';
import type {
  AIGeneratedBRoll,
  TextOverlayStyleId,
  TextOverlaySegment,
  BRollReelComposition,
  MusicTrackSummary,
  MusicTrack,
} from '@/types';
import { BRollLibrary } from '@/components/broll/BRollLibrary';
import { BRollGenerator } from '@/components/broll/BRollGenerator';
import { MusicPicker } from '@/components/reels/MusicPicker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BRollReelWizardProps {
  onComplete?: (composition: BRollReelComposition) => void;
  onCancel?: () => void;
}

type WizardStep = 'source' | 'style' | 'text' | 'music' | 'generate';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'source', label: 'Source' },
  { key: 'style', label: 'Style' },
  { key: 'text', label: 'Text' },
  { key: 'music', label: 'Music' },
  { key: 'generate', label: 'Generate' },
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
];

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
            {/* Step circle */}
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

            {/* Connecting line */}
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
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');

  // Step 1 – Source
  const [selectedClips, setSelectedClips] = useState<AIGeneratedBRoll[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);

  // Step 2 – Style
  const [selectedStyle, setSelectedStyle] = useState<TextOverlayStyleId | null>(null);

  // Step 3 – Text
  const [textSegments, setTextSegments] = useState<TextOverlaySegment[]>([]);
  const [regeneratingText, setRegeneratingText] = useState(false);

  // Step 4 – Music
  const [musicTracks, setMusicTracks] = useState<MusicTrackSummary[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [beatSyncEnabled, setBeatSyncEnabled] = useState(false);
  const [loadingMusic, setLoadingMusic] = useState(false);

  // Step 5 – Generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [composition, setComposition] = useState<BRollReelComposition | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

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

  // Initialize text segments when entering step 3
  useEffect(() => {
    if (currentStep === 'text' && textSegments.length === 0 && selectedClips.length > 0) {
      setTextSegments(
        selectedClips.map((_, i) => ({
          clipIndex: i,
          text: '',
          position: 'center' as const,
        }))
      );
    }
  }, [currentStep, selectedClips, textSegments.length]);

  // Fetch music tracks when entering step 4
  useEffect(() => {
    if (currentStep === 'music' && musicTracks.length === 0) {
      fetchMusicTracks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const fetchMusicTracks = async () => {
    setLoadingMusic(true);
    try {
      const res = await api.reels.listMusic({ limit: 50 });
      if (res.success && res.data) {
        setMusicTracks(res.data);
      }
    } catch {
      // silent – user can skip music
    } finally {
      setLoadingMusic(false);
    }
  };

  const handleRegenerateText = useCallback(async () => {
    if (!selectedStyle || selectedClips.length === 0) return;
    setRegeneratingText(true);
    try {
      const res = await api.brollReels.compose({
        brollClipIds: selectedClips.map((c) => c.id),
        templateStyle: selectedStyle,
        generateText: true,
      });
      if (res.success && res.data?.textOverlays) {
        setTextSegments(res.data.textOverlays);
      }
    } catch {
      // keep existing text
    } finally {
      setRegeneratingText(false);
    }
  }, [selectedStyle, selectedClips]);

  const handleMusicSelect = async (track: MusicTrackSummary | null) => {
    if (!track) {
      setSelectedMusic(null);
      return;
    }
    try {
      const res = await api.reels.getMusicTrack(track.id);
      if (res.success && res.data) {
        setSelectedMusic(res.data);
      }
    } catch {
      // silent
    }
  };

  const handleGenerate = async () => {
    if (!selectedStyle || selectedClips.length === 0) return;
    setIsGenerating(true);
    setGenerateError(null);
    setGenerateProgress(0);

    try {
      const res = await api.brollReels.compose({
        brollClipIds: selectedClips.map((c) => c.id),
        templateStyle: selectedStyle,
        musicTrackId: selectedMusic?.id,
        generateText: false,
      });

      if (res.success && res.data) {
        setComposition(res.data);
        setGenerateProgress(100);
        onComplete?.(res.data);
      } else {
        setGenerateError('Failed to generate reel. Please try again.');
      }
    } catch {
      setGenerateError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectionChange = (ids: string[]) => {
    // Keep clips in the order they were selected, adding new ones
    setSelectedClips((prev) => {
      const existing = prev.filter((c) => ids.includes(c.id));
      // For newly added IDs, create placeholder entries
      const newIds = ids.filter((id) => !existing.find((c) => c.id === id));
      const newClips: AIGeneratedBRoll[] = newIds.map((id) => ({
        id,
        userId: '',
        prompt: '',
        sourceType: 'ai_generated' as const,
        status: 'completed' as const,
        aspectRatio: '9:16' as const,
        createdAt: '',
      }));
      return [...existing, ...newClips];
    });
  };

  const handleGeneratorComplete = (clip: AIGeneratedBRoll) => {
    setSelectedClips((prev) => [...prev, clip]);
    setShowGenerator(false);
  };

  const updateSegmentText = (index: number, text: string) => {
    setTextSegments((prev) =>
      prev.map((seg, i) => (i === index ? { ...seg, text } : seg))
    );
  };

  // ---------------------------------------------------------------------------
  // Step 1 – Source Selection
  // ---------------------------------------------------------------------------

  const renderSourceStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-2">Select B-Roll Clips</h2>
        <p className="text-text-secondary text-sm">
          Choose one or more clips from your library, or generate new ones.
        </p>
      </div>

      {/* Selected clips count */}
      {selectedClips.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-accent font-medium">
            {selectedClips.length} clip{selectedClips.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedClips([])}
            className="text-xs text-text-secondary hover:text-accent"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Generator toggle */}
      {showGenerator ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Generate New Clip</h3>
            <button
              onClick={() => setShowGenerator(false)}
              className="text-sm text-text-secondary hover:text-accent"
            >
              Back to Library
            </button>
          </div>
          <BRollGenerator onGenerated={handleGeneratorComplete} />
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => setShowGenerator(true)}
            className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-accent hover:text-accent transition-colors text-sm font-medium"
          >
            Or Generate New
          </button>
          <BRollLibrary
            selectable
            selectedIds={selectedClips.map((c) => c.id)}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 2 – Style Selection
  // ---------------------------------------------------------------------------

  const renderStyleStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-2">Choose a Style</h2>
        <p className="text-text-secondary text-sm">
          Pick a text overlay style for your reel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`
              aspect-[9/16] bg-surface-secondary rounded-xl border-2 cursor-pointer
              flex flex-col items-center justify-center p-4 text-center transition-all
              ${
                selectedStyle === style.id
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-text-tertiary'
              }
            `}
          >
            {/* Visual mockup */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              {style.id === 'bold_impact' && (
                <div className="space-y-1">
                  {style.mockupLines.map((line) => (
                    <p key={line} className="text-2xl font-black uppercase text-text-primary tracking-tight">
                      {line}
                    </p>
                  ))}
                </div>
              )}
              {style.id === 'minimal_clean' && (
                <div className="space-y-1">
                  {style.mockupLines.map((line) => (
                    <p key={line} className="text-lg font-light text-text-secondary tracking-wide">
                      {line}
                    </p>
                  ))}
                </div>
              )}
              {style.id === 'brand_gradient' && (
                <div className="bg-gradient-to-r from-accent/80 to-purple-500/80 rounded-lg px-4 py-3">
                  {style.mockupLines.map((line) => (
                    <p key={line} className="text-lg font-bold text-white">
                      {line}
                    </p>
                  ))}
                </div>
              )}
              {style.id === 'story_cards' && (
                <div className="bg-white/90 dark:bg-black/60 rounded-lg px-4 py-3 shadow-sm">
                  {style.mockupLines.map((line) => (
                    <p key={line} className="text-lg font-semibold text-text-primary">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-text-primary">{style.name}</p>
              <p className="text-xs text-text-secondary mt-0.5">{style.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 3 – Text Overlay Editor
  // ---------------------------------------------------------------------------

  const renderTextStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-text-primary mb-2">Edit Text Overlays</h2>
        <p className="text-text-secondary text-sm">
          Add or edit the text that appears on each clip.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Phone preview – left */}
        <div className="mx-auto md:mx-0 flex-shrink-0">
          <div className="w-[240px] aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border border-border">
            {/* Show first selected clip thumbnail or placeholder */}
            {selectedClips[0]?.thumbnailUrl ? (
              <img
                src={selectedClips[0].thumbnailUrl}
                alt="Preview"
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="w-full h-full bg-surface-secondary" />
            )}

            {/* Overlay text preview */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {textSegments[0]?.text ? (
                <div
                  className={`
                    px-3 py-2 rounded-lg text-center
                    ${selectedStyle === 'bold_impact' ? 'text-white text-xl font-black uppercase' : ''}
                    ${selectedStyle === 'minimal_clean' ? 'text-white text-base font-light tracking-wide' : ''}
                    ${selectedStyle === 'brand_gradient' ? 'bg-gradient-to-r from-accent/80 to-purple-500/80 text-white text-base font-bold rounded-lg' : ''}
                    ${selectedStyle === 'story_cards' ? 'bg-white/90 dark:bg-black/60 text-text-primary text-base font-semibold rounded-lg shadow-sm' : ''}
                  `}
                >
                  {textSegments[0].text}
                </div>
              ) : (
                <p className="text-white/40 text-sm">Text preview</p>
              )}
            </div>
          </div>
        </div>

        {/* Text fields – right */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">
              {textSegments.length} segment{textSegments.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={handleRegenerateText}
              disabled={regeneratingText}
              className="text-sm text-accent hover:text-accent/80 disabled:opacity-50 flex items-center gap-1"
            >
              {regeneratingText ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate Text
                </>
              )}
            </button>
          </div>

          {textSegments.map((segment, i) => (
            <div key={i} className="space-y-1">
              <label className="text-xs text-text-secondary">
                Clip {i + 1}
                {selectedClips[i]?.prompt && (
                  <span className="ml-1 text-text-tertiary">
                    — {selectedClips[i].prompt.slice(0, 40)}
                    {selectedClips[i].prompt.length > 40 ? '...' : ''}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={segment.text}
                onChange={(e) => updateSegmentText(i, e.target.value)}
                placeholder={`Text for clip ${i + 1}...`}
                className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 4 – Music
  // ---------------------------------------------------------------------------

  const renderMusicStep = () => (
    <div className="space-y-6">
      {loadingMusic ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Loading music library...</p>
        </div>
      ) : (
        <>
          <MusicPicker
            tracks={musicTracks}
            selectedTrack={selectedMusic}
            onSelect={handleMusicSelect}
            volume={musicVolume}
            onVolumeChange={setMusicVolume}
            beatSyncEnabled={beatSyncEnabled}
            onBeatSyncChange={setBeatSyncEnabled}
            musicRequired={false}
          />

          {/* Prominent skip button */}
          {!selectedMusic && (
            <div className="text-center">
              <button
                onClick={goNext}
                className="text-base font-medium text-text-secondary hover:text-accent transition-colors py-2 px-6 border border-border rounded-lg hover:border-accent"
              >
                Skip — continue without music
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step 5 – Generate
  // ---------------------------------------------------------------------------

  const renderGenerateStep = () => {
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
            This may take a moment. We are composing your clips, overlays, and audio.
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
          <h2 className="text-xl font-medium text-text-primary">Your B-Roll Reel is Ready!</h2>
          {composition.outputUrl && (
            <div className="max-w-xs mx-auto">
              <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
                <video
                  src={composition.outputUrl}
                  poster={composition.thumbnailUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
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

    // Summary before generating
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-2">Review &amp; Generate</h2>
          <p className="text-text-secondary text-sm">
            Double-check your selections before generating.
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-surface-secondary rounded-xl border border-border p-6 space-y-5">
          {/* Clips */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {selectedClips.length} B-Roll Clip{selectedClips.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {selectedClips.map((clip) => (
                  <div key={clip.id} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-surface">
                    {clip.thumbnailUrl ? (
                      <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <svg className="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Style */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.name || 'No style'}
              </p>
              <p className="text-xs text-text-secondary">
                {STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.description}
              </p>
            </div>
          </div>

          {/* Text */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {textSegments.filter((s) => s.text.trim()).length} text overlay{textSegments.filter((s) => s.text.trim()).length !== 1 ? 's' : ''}
              </p>
              {textSegments.filter((s) => s.text.trim()).length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {textSegments.filter((s) => s.text.trim()).map((seg, i) => (
                    <li key={i} className="text-xs text-text-secondary truncate max-w-xs">
                      &ldquo;{seg.text}&rdquo;
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Music */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div>
              {selectedMusic ? (
                <>
                  <p className="text-sm font-medium text-text-primary">{selectedMusic.name}</p>
                  <p className="text-xs text-text-secondary">{selectedMusic.artist}</p>
                </>
              ) : (
                <p className="text-sm text-text-secondary">No music selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          className="btn-primary w-full text-lg py-4"
        >
          Generate B-Roll Reel
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'source':
        return selectedClips.length >= 1;
      case 'style':
        return selectedStyle !== null;
      case 'text':
        return true; // text is optional
      case 'music':
        return true; // music is optional
      case 'generate':
        return false; // handled by generate button
      default:
        return false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step content */}
      <div className="min-h-[400px]">
        {currentStep === 'source' && renderSourceStep()}
        {currentStep === 'style' && renderStyleStep()}
        {currentStep === 'text' && renderTextStep()}
        {currentStep === 'music' && renderMusicStep()}
        {currentStep === 'generate' && renderGenerateStep()}
      </div>

      {/* Navigation buttons */}
      {!isGenerating && !composition && (
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <button
            onClick={stepIndex === 0 ? onCancel : goBack}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep !== 'generate' && (
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
