'use client';

import { useState, useRef } from 'react';
import { MessageSquare, Upload, Loader2, Check, Sparkles, Quote, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { showErrorToast } from '@/lib/toast';
import { toast } from 'sonner';
import { PhotoPicker } from './PhotoPicker';

type CarouselBackgroundMode =
  | 'branded-overlay'
  | 'quote-card'
  | 'tweet-style'
  | 'stats-card'
  | 'upload';

interface CarouselStyleEditorProps {
  kitId: string;
  currentDesignPreset?: string;
  uploadId?: string; // Used for loading snapshots
  /** Number of slides in the current carousel. Used to gate "My Image" and
   *  "Video Frame" backgrounds to the cover (first) and last slide only —
   *  body slides keep the template look. */
  slideCount: number;
  onRestyleComplete: (carousel: {
    slides: Array<{ slideNumber: number; text: string; publicUrl: string; template?: string }>;
    designPreset?: string;
  }) => void;
}

const STYLE_OPTIONS: Array<{
  value: CarouselBackgroundMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'branded-overlay',
    label: 'Branded',
    description: 'Photo background with bold typography (default)',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    value: 'quote-card',
    label: 'Quote Card',
    description: 'Serif quote on cream — Pinterest-pin energy',
    icon: <Quote className="w-5 h-5" />,
  },
  {
    value: 'tweet-style',
    label: 'Tweet Card',
    description: 'Twitter-style card with dark background',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    value: 'stats-card',
    label: 'Stats Card',
    description: 'Big stat on warm white — data-forward for results posts',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    value: 'upload',
    label: 'My Image',
    description: 'Your photo or a video frame on the cover + last slides. Body slides keep the template look.',
    icon: <Upload className="w-5 h-5" />,
  },
];

export function CarouselStyleEditor({
  kitId,
  currentDesignPreset,
  uploadId,
  slideCount,
  onRestyleComplete,
}: CarouselStyleEditorProps) {
  // Default reflects the kit's current rendered style. New kits render as
  // 'branded-overlay' (the modern auto-default), so that's the fallback
  // when currentDesignPreset isn't provided.
  const [selectedMode, setSelectedMode] = useState<CarouselBackgroundMode>(
    (currentDesignPreset as CarouselBackgroundMode) || 'branded-overlay'
  );
  const [restyling, setRestyling] = useState(false);
  // Image chosen via the shared PhotoPicker (upload, saved library, video
  // frame, or profile photo). One picker, one code path — this component
  // used to carry its OWN file input and its OWN snapshot rail, which meant
  // two differently-behaving upload UIs for the same backgroundImageUrl.
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  // In-flight guard. Without this, rapid clicks on Apply Style (especially
  // for "My Image" mode where isCurrentStyle is always false so the button
  // stays clickable) fan out N parallel regenerate-carousel requests before
  // React's next render disables the button. Surfaced 2026-05-27 via
  // jess@jesslenouvel.com — 20 calls in 4 seconds.
  const applyInFlightRef = useRef(false);

  const handleModeChange = (mode: CarouselBackgroundMode) => {
    setSelectedMode(mode);
  };

  const handleApplyStyle = async () => {
    // Synchronous in-flight guard. setRestyling(true) below ALSO disables
    // the button, but React state updates are batched — rapid clicks before
    // the first render flush would all pass the disabled check. The ref is
    // synchronous and short-circuits the race.
    if (applyInFlightRef.current) return;
    applyInFlightRef.current = true;
    setRestyling(true);
    try {
      let options: Parameters<typeof api.contentKits.regenerateCarousel>[1] = {};

      if (
        selectedMode === 'branded-overlay' ||
        selectedMode === 'quote-card' ||
        selectedMode === 'tweet-style' ||
        selectedMode === 'stats-card'
      ) {
        options = { designPreset: selectedMode };
      } else if (selectedMode === 'upload' && !uploadedImageUrl) {
        toast.error('Pick or upload an image first');
        return;
      } else if (selectedMode === 'upload' && uploadedImageUrl) {
        // Apply the chosen photo ONLY to the cover (slide 0) and last slide.
        // Body slides keep the branded-overlay template look — the photo is a
        // brand anchor, not wallpaper. Matches the PhotoPicker per-slide
        // gating shipped 2026-05-25 (PR #35). Surfaced 2026-05-27 via Jess
        // Lenouvel: applying one image to all 10 slides looked wrong.
        const imageUrl = uploadedImageUrl;
        if (slideCount < 2) {
          toast.error('Carousel needs at least 2 slides to apply a cover photo.');
          return;
        }
        const lastIndex = slideCount - 1;
        const slideOverrides = Array.from({ length: slideCount }, (_, i) =>
          i === 0 || i === lastIndex ? { backgroundImageUrl: imageUrl } : {},
        );
        options = {
          designPreset: 'branded-overlay',
          composeOnly: true,
          slideOverrides,
        };
      }

      const response = await api.contentKits.regenerateCarousel(kitId, options);
      if (response.success && response.data?.carousel) {
        onRestyleComplete({
          slides: response.data.carousel.slides,
          designPreset: response.data.carousel.designPreset,
        });
        toast.success('Carousel restyled successfully');
      }
    } catch (err) {
      showErrorToast(err, 'restyling carousel');
    } finally {
      applyInFlightRef.current = false;
      setRestyling(false);
    }
  };

  const isCurrentStyle = selectedMode === (currentDesignPreset || 'branded-overlay') &&
    selectedMode !== 'upload';

  const canApply =
    selectedMode === 'branded-overlay' ||
    selectedMode === 'quote-card' ||
    selectedMode === 'tweet-style' ||
    selectedMode === 'stats-card' ||
    (selectedMode === 'upload' && !!uploadedImageUrl);

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-4">
      <p className="text-xs uppercase tracking-wider font-medium mb-3 text-text-secondary">
        Carousel Style
      </p>

      {/* Style options grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {STYLE_OPTIONS.map((option) => {
          const isSelected = selectedMode === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleModeChange(option.value)}
              disabled={restyling}
              className={`relative p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${
                isSelected
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/30'
              } ${restyling ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`${isSelected ? 'text-accent' : 'text-text-secondary'}`}>
                {option.icon}
              </div>
              <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conditional: image selection via the shared PhotoPicker — upload,
          saved library, video frames, and profile photo in one place. This
          replaced a bespoke file input here plus a separate "Video Frame"
          style tile; both funnels now go through the same picker the
          per-slide photo rail uses, so upload behavior can't drift. */}
      {selectedMode === 'upload' && (
        <div className="mb-3">
          <PhotoPicker
            kitId={kitId}
            uploadId={uploadId}
            currentPhotoUrl={uploadedImageUrl ?? undefined}
            onSelect={(url) => setUploadedImageUrl(url)}
          />
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={handleApplyStyle}
        disabled={restyling || !canApply || isCurrentStyle}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-accent text-white hover:bg-accent/90"
      >
        {restyling ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Restyling...
          </span>
        ) : isCurrentStyle ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Current Style
          </span>
        ) : (
          'Apply Style'
        )}
      </button>
    </div>
  );
}
