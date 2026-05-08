'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Loader2,
  Pencil,
} from 'lucide-react';
import { downloadImage } from '@/lib/download';
import { showErrorToast } from '@/lib/toast';
import { CarouselStyleEditor } from './CarouselStyleEditor';
import { DraggableTextOverlay } from './DraggableTextOverlay';
import { PhotoPicker } from './PhotoPicker';
import { PostCaptionBlock } from './PostCaptionBlock';
import { VisualPostActions } from './VisualPostActions';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  backgroundUrl?: string;
  /** Source photo URL — the photo used as the slide background (distinct
   *  from `backgroundUrl` which is the bg-PNG for two-phase templates). */
  backgroundImageUrl?: string;
  text: string;
  template?: string;
}

interface SlideEdit {
  text: string;
  position: { x: number; y: number };
  /** Per-slide photo override from the photo picker. Undefined = leave as-is. */
  backgroundImageUrl?: string;
}

interface CarouselEditorModalProps {
  open: boolean;
  onClose: () => void;
  slides: CarouselSlide[];
  contentKitId: string;
  designPreset?: string;
  uploadId?: string;
  onCarouselUpdate: () => void;
  /** Per-carousel Instagram post caption. Falls back to content_instagram if null. */
  suggestedCaption?: string | null;
  /** Kit-level Instagram caption, used as fallback when per-carousel caption is missing. */
  fallbackCaption?: string | null;
}

const TEMPLATE_TEXT_STYLES: Record<string, {
  color: string;
  fontSize: string;
  fontWeight: string;
  textShadow: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: string;
}> = {
  'tweet-style': {
    color: '#0f1419',
    fontSize: '12px',
    fontWeight: '400',
    textShadow: 'none',
  },
  'text-box': {
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '800',
    textShadow: '0 2px 8px rgba(0,0,0,0.7)',
  },
  'photo-overlay': {
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: '700',
    textShadow: 'none',
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: '6px 14px',
    borderRadius: '8px',
  },
};

/**
 * Templates rendered single-pass (text burned into the slide image — no
 * separate background layer). For these, the live preview can't reflect
 * text edits because there's no overlay to draw the new text on; the only
 * way to refresh the preview is a server-side re-render. Mirrors the
 * backend's cf63c01 fix ("single-pass for tweet-style, two-phase for others").
 */
const SINGLE_PASS_TEMPLATES = new Set(['tweet-style']);

export default function CarouselEditorModal({
  open,
  onClose,
  slides: initialSlides,
  contentKitId,
  suggestedCaption,
  fallbackCaption,
  designPreset,
  uploadId,
  onCarouselUpdate,
}: CarouselEditorModalProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [edits, setEdits] = useState<SlideEdit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [currentPreset, setCurrentPreset] = useState(designPreset || 'auto');
  const abortRef = useRef<AbortController | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const hasBackground = slides.some(s => !!s.backgroundUrl);
  const hasEdits = edits.some((e, i) => e.text !== slides[i]?.text);

  useEffect(() => {
    setSlides(initialSlides);
    setEdits(initialSlides.map((s) => ({
      text: s.text,
      position: { x: 0.5, y: 0.5 },
      backgroundImageUrl: s.backgroundImageUrl,
    })));
    // Clamp activeIndex when slides shrink (e.g., post-restyle: original 10
    // branded-overlay → user picks Tweet Card → regenerate returns 5 slides
    // via text-parsing fallback). Without this, activeIndex stays out of
    // bounds, slides[activeIndex] becomes undefined, the modal early-returns
    // null, and the parent's open state stays stuck → carousel card looks
    // dead because clicking re-sets an already-true state. Bug 4 from the
    // 2026-05-07 test surface.
    if (initialSlides.length > 0) {
      setActiveIndex((prev) => Math.min(prev, initialSlides.length - 1));
    }
  }, [initialSlides]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const el = document.activeElement;
      const isTyping = el?.tagName === 'TEXTAREA' || el?.tagName === 'INPUT';
      if (e.key === 'ArrowLeft' && !isTyping) setActiveIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight' && !isTyping) setActiveIndex((p) => Math.min(slides.length - 1, p + 1));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, slides.length]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const updateEdit = (index: number, patch: Partial<SlideEdit>) => {
    setEdits((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  /**
   * Run a compose-only regenerate using the given overrides and swap the
   * resulting slide URLs into local state. Shared by handlePhotoSelect
   * (immediate, photo swap) and the auto-debounced text-edit watcher
   * below. composeOnly:true skips the LLM and the full canvas pipeline
   * for two-phase templates; for branded-overlay it re-renders single-pass
   * via renderSlideToBuffer (~2-3s for 10 slides).
   */
  const runComposeOnlyRefresh = useCallback(
    async (overrides: Array<{ text: string; textPosition: { x: number; y: number }; backgroundImageUrl?: string }>) => {
      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (currentPreset as 'auto' | 'tweet-style' | 'text-box' | 'branded-overlay') || 'auto',
        composeOnly: true,
        slideOverrides: overrides,
      });
      if (response.success && response.data?.carousel?.slides) {
        const composed = response.data.carousel.slides;
        setSlides(
          composed.map((s) => ({
            slideNumber: s.slideNumber,
            publicUrl: s.publicUrl,
            backgroundUrl: (s as { backgroundUrl?: string; background_url?: string }).backgroundUrl
              ?? (s as { background_url?: string }).background_url,
            backgroundImageUrl: (s as { backgroundImageUrl?: string }).backgroundImageUrl,
            text: s.text,
            template: (s as { template?: string }).template,
          })),
        );
        onCarouselUpdate();
      }
    },
    [contentKitId, currentPreset, onCarouselUpdate],
  );

  /**
   * User picked a different photo from the rail. Update local state, then
   * trigger compose-only regenerate so the preview reflects the swap.
   */
  const handlePhotoSelect = useCallback(
    async (slideIndex: number, photoUrl: string) => {
      // Optimistic state update so the picker shows the new selection
      // immediately, even before the compose round-trip completes.
      setEdits((prev) =>
        prev.map((e, i) => (i === slideIndex ? { ...e, backgroundImageUrl: photoUrl } : e)),
      );
      try {
        setRefreshingPreview(true);
        const overrides = edits.map((e, i) => ({
          text: e.text,
          textPosition: e.position,
          backgroundImageUrl: i === slideIndex ? photoUrl : e.backgroundImageUrl,
        }));
        await runComposeOnlyRefresh(overrides);
      } catch (err) {
        showErrorToast(err, 'swapping photo');
      } finally {
        setRefreshingPreview(false);
      }
    },
    [edits, runComposeOnlyRefresh],
  );

  /**
   * Auto-debounced live preview: when the user pauses typing for 1.5s, run
   * a compose-only refresh so the preview reflects their text edits without
   * requiring them to click the manual "Refresh preview" button. Only
   * triggers when compose-only is actually supported for the active
   * carousel — branded-overlay slides re-render single-pass; legacy
   * two-phase templates need cached backgrounds (hasBackground=true).
   * For tweet-style without backgrounds, the manual button still works
   * via the full regenerate path.
   */
  const lastAutoRefreshSnapshot = useRef<string>('');
  useEffect(() => {
    if (!open) return;
    const editsSnapshot = edits.map((e) => `${e.text}@${e.position.x},${e.position.y}|${e.backgroundImageUrl ?? ''}`).join('||');
    const slidesSnapshot = slides.map((s) => s.text).join('||');
    // Skip when nothing has changed since the last snapshot.
    if (editsSnapshot === lastAutoRefreshSnapshot.current) return;
    // Skip when edits match the slides (no user changes yet, just initial sync).
    if (editsSnapshot.split('||').map((s) => s.split('@')[0]).join('||') === slidesSnapshot) {
      lastAutoRefreshSnapshot.current = editsSnapshot;
      return;
    }
    // Compose-only requires either branded-overlay (single-pass) or a
    // cached background per slide (two-phase). Skip auto-refresh otherwise.
    const supportsComposeOnly =
      hasBackground ||
      slides.some((s) => s.template?.startsWith('branded-overlay'));
    if (!supportsComposeOnly) return;
    if (refreshingPreview) return;

    const handle = setTimeout(async () => {
      try {
        setRefreshingPreview(true);
        const overrides = edits.map((e) => ({
          text: e.text,
          textPosition: e.position,
          backgroundImageUrl: e.backgroundImageUrl,
        }));
        await runComposeOnlyRefresh(overrides);
        lastAutoRefreshSnapshot.current = editsSnapshot;
      } catch {
        // Silent — manual refresh button is still available as the fallback.
      } finally {
        setRefreshingPreview(false);
      }
    }, 1500);

    return () => clearTimeout(handle);
  }, [edits, slides, open, hasBackground, refreshingPreview, runComposeOnlyRefresh]);

  // Prepare backgrounds for drag editing (only for non-tweet templates)
  const handlePrepareEditing = useCallback(async () => {
    if (preparing || hasBackground) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPreparing(true);
    try {
      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (currentPreset as any) || 'auto',
      });
      if (controller.signal.aborted) return;
      if (response.success && response.data?.carousel?.slides) {
        const newSlides = response.data.carousel.slides.map((s: any) => ({
          slideNumber: s.slideNumber,
          publicUrl: s.publicUrl,
          backgroundUrl: s.backgroundUrl || s.background_url,
          text: s.text,
          template: s.template || s.slideType,
        }));
        setSlides(newSlides);
        setEdits(newSlides.map((s: CarouselSlide) => ({ text: s.text, position: { x: 0.5, y: 0.5 } })));
        onCarouselUpdate();
        if (newSlides.some((s: CarouselSlide) => s.backgroundUrl)) {
          toast.success('Drag text to reposition');
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) showErrorToast(err, 'preparing editor');
    } finally {
      if (!controller.signal.aborted) setPreparing(false);
    }
  }, [preparing, hasBackground, contentKitId, currentPreset, onCarouselUpdate]);

  /**
   * Refresh preview for single-pass templates (tweet-style). Calls the
   * backend regenerate with the current text overrides, then swaps the
   * slide image URLs in state so the preview reflects the user's edits.
   * Same code path as the download fallback but doesn't trigger a file
   * download. ~15-30s on the backend (full re-render of all slides).
   */
  const handleRefreshPreview = async () => {
    if (refreshingPreview) return;
    setRefreshingPreview(true);
    try {
      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (currentPreset as any) || 'auto',
        slideOverrides: edits.map((e) => ({ text: e.text })),
      });
      if (response.success && response.data?.carousel?.slides) {
        const composed = response.data.carousel.slides;
        setSlides(composed.map((s: any) => ({
          slideNumber: s.slideNumber,
          publicUrl: s.publicUrl,
          backgroundUrl: s.backgroundUrl,
          text: s.text,
          template: s.template || s.slideType,
        })));
        toast.success('Preview updated');
        onCarouselUpdate();
      }
    } catch (err) {
      showErrorToast(err, 'refreshing preview');
    } finally {
      setRefreshingPreview(false);
    }
  };

  // Download: composeOnly if backgrounds exist, full regenerate with overrides otherwise
  const handleDownload = async (slideIndex?: number) => {
    setDownloading(true);
    try {
      if (hasBackground) {
        // Two-phase: compose text onto cached backgrounds
        const response = await api.contentKits.regenerateCarousel(contentKitId, {
          designPreset: (currentPreset as any) || 'auto',
          composeOnly: true,
          slideOverrides: edits.map((e) => ({ text: e.text, textPosition: e.position })),
        });
        if (response.success && response.data?.carousel?.slides) {
          const composed = response.data.carousel.slides;
          if (slideIndex !== undefined) {
            const s = composed[slideIndex];
            if (s) await downloadImage(s.publicUrl, `carousel-slide-${s.slideNumber}.png`);
          } else {
            for (const s of composed) await downloadImage(s.publicUrl, `carousel-slide-${s.slideNumber}.png`);
          }
        }
      } else if (hasEdits) {
        // Single-pass (tweet-style): full regenerate with text overrides
        const response = await api.contentKits.regenerateCarousel(contentKitId, {
          designPreset: (currentPreset as any) || 'auto',
          slideOverrides: edits.map((e) => ({ text: e.text })),
        });
        if (response.success && response.data?.carousel?.slides) {
          const composed = response.data.carousel.slides;
          if (slideIndex !== undefined) {
            const s = composed[slideIndex];
            if (s) await downloadImage(s.publicUrl, `carousel-slide-${s.slideNumber}.png`);
          } else {
            for (const s of composed) await downloadImage(s.publicUrl, `carousel-slide-${s.slideNumber}.png`);
          }
          // Update slides with new renders
          setSlides(composed.map((s: any) => ({
            slideNumber: s.slideNumber, publicUrl: s.publicUrl,
            backgroundUrl: s.backgroundUrl, text: s.text,
            template: s.template || s.slideType,
          })));
        }
      } else {
        // No edits: download existing composites
        if (slideIndex !== undefined) {
          const s = slides[slideIndex];
          if (s) await downloadImage(s.publicUrl, `carousel-slide-${s.slideNumber}.png`);
        } else {
          for (const s of slides) await downloadImage(s.publicUrl, `carousel-slide-${s.slideNumber}.png`);
        }
      }
      toast.success(slideIndex !== undefined ? 'Slide downloaded' : 'All slides downloaded');
    } catch (err) {
      showErrorToast(err, 'downloading carousel');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestyleComplete = (carousel: {
    slides: Array<{ slideNumber: number; text: string; publicUrl: string; template?: string; backgroundUrl?: string; backgroundImageUrl?: string }>;
    designPreset?: string;
  }) => {
    const newSlides = carousel.slides.map((s) => ({
      slideNumber: s.slideNumber, publicUrl: s.publicUrl,
      backgroundUrl: s.backgroundUrl,
      backgroundImageUrl: s.backgroundImageUrl,
      text: s.text, template: s.template,
    }));
    setSlides(newSlides);
    setEdits(newSlides.map((s) => ({
      text: s.text, position: { x: 0.5, y: 0.5 }, backgroundImageUrl: s.backgroundImageUrl,
    })));
    // Clamp activeIndex so we don't end up out of bounds when the new
    // carousel has fewer slides than the old one (Tweet Card text-parsing
    // gives ~5 slides; original branded-overlay was 10).
    if (newSlides.length > 0) {
      setActiveIndex((prev) => Math.min(prev, newSlides.length - 1));
    }
    if (carousel.designPreset) {
      setCurrentPreset(carousel.designPreset);
    }
    onCarouselUpdate();
  };

  const activeSlide = slides[activeIndex];
  const activeEdit = edits[activeIndex];
  // Defensive: if `open` says we should be visible but state is invalid (no
  // slides, or activeIndex out of bounds), fire onClose so the parent's
  // open state syncs with reality. Without this, the parent thinks the
  // modal is open but it's rendering null — clicking the carousel card
  // becomes a no-op (re-setting an already-true state). Bug 4 second-layer
  // safety net; the activeIndex clamp above is the primary fix.
  if (open && (slides.length === 0 || !activeSlide || !activeEdit)) {
    queueMicrotask(() => onClose());
    return null;
  }
  if (!open || slides.length === 0 || !activeSlide || !activeEdit) return null;

  const previewImageUrl = (activeSlide.backgroundUrl && hasBackground) ? activeSlide.backgroundUrl : activeSlide.publicUrl;
  const templateStyle = TEMPLATE_TEXT_STYLES[activeSlide.template || 'text-box'] || TEMPLATE_TEXT_STYLES['text-box'];
  const supportsDrag = hasBackground && !!activeSlide.backgroundUrl;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Preview */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[45%] shrink-0 bg-background/50">
            <div className="relative w-full max-w-[300px]" ref={previewContainerRef}>
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={previewImageUrl} alt={`Slide ${activeSlide.slideNumber}`} className="w-full" draggable={false} />
                {supportsDrag && (
                  <DraggableTextOverlay
                    text={activeEdit.text}
                    position={activeEdit.position}
                    onPositionChange={(pos) => updateEdit(activeIndex, { position: pos })}
                    containerRef={previewContainerRef}
                    style={templateStyle}
                  />
                )}
              </div>
              {slides.length > 1 && (
                <>
                  <button type="button" onClick={() => setActiveIndex((p) => Math.max(0, p - 1))} disabled={activeIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors z-20">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setActiveIndex((p) => Math.min(slides.length - 1, p + 1))} disabled={activeIndex === slides.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors z-20">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
              {slides.map((slide, i) => (
                <button key={slide.slideNumber} type="button" onClick={() => setActiveIndex(i)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    i === activeIndex ? 'border-primary-interactive ring-1 ring-primary-interactive/30' : 'border-border hover:border-muted-foreground/30'
                  }`}>
                  <img src={slide.publicUrl} alt={`Slide ${slide.slideNumber}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow-md">{slide.slideNumber}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">{activeIndex + 1} / {slides.length}</p>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col gap-4 p-6 lg:w-[55%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Carousel Editor</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Text editor — always visible */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Slide {activeSlide.slideNumber} Text</label>
              <textarea
                value={activeEdit.text}
                onChange={(e) => updateEdit(activeIndex, { text: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                rows={3}
                placeholder="Slide text..."
              />
              {supportsDrag && (
                <p className="text-[11px] text-muted-foreground/60">Drag the text on the preview to reposition</p>
              )}
              {/* Single-pass templates (tweet-style) bake text into the image
                  at render time, so the live preview can't reflect edits in
                  real time. Surface the constraint + a manual refresh path
                  so the user isn't left wondering why their edit isn't
                  showing on the card. */}
              {SINGLE_PASS_TEMPLATES.has(activeSlide.template || '') &&
                activeEdit.text.trim() !== (activeSlide.text || '').trim() && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                  <p className="text-[11px] text-amber-700 dark:text-amber-200 flex-1 leading-relaxed">
                    Text is baked into the tweet card layout for this style. The preview will refresh on download &mdash; or click below to refresh now.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshPreview}
                    disabled={refreshingPreview}
                    className="flex items-center gap-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-200 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {refreshingPreview ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      'Refresh preview'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Enable drag editing — only for templates that support it and don't have backgrounds yet */}
            {!hasBackground && !['tweet-style'].includes(activeSlide.template || '') && (
              <button type="button" onClick={handlePrepareEditing} disabled={preparing}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-interactive/40 bg-primary-interactive/5 px-4 py-3 text-sm font-medium text-primary-interactive hover:bg-primary-interactive/10 transition-colors disabled:opacity-50">
                {preparing ? (<><Loader2 className="h-4 w-4 animate-spin" />Preparing...</>) : (<><Pencil className="h-4 w-4" />Enable drag positioning</>)}
              </button>
            )}

            {/* Photo picker — branded-overlay slides support photo swap via the
                compose-only fast path. Legacy templates (tweet-style, text-box,
                photo-overlay) don't render the photo themselves, so the picker
                is hidden for those. */}
            {(activeSlide.template?.startsWith('branded-overlay')) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Background photo</h4>
                  {refreshingPreview && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-text-tertiary">
                  Click a photo to swap it on slide {activeSlide.slideNumber}.
                </p>
                <PhotoPicker
                  kitId={contentKitId}
                  uploadId={uploadId}
                  currentPhotoUrl={
                    edits[activeIndex]?.backgroundImageUrl ?? activeSlide.backgroundImageUrl
                  }
                  onSelect={(url) => handlePhotoSelect(activeIndex, url)}
                />
              </div>
            )}

            {/* Style editor */}
            <CarouselStyleEditor kitId={contentKitId} currentDesignPreset={currentPreset} uploadId={uploadId} onRestyleComplete={handleRestyleComplete} />

            {/* Post caption — the text to paste into Instagram when uploading.
                Falls back to the kit-level Instagram caption if a per-carousel
                caption hasn't been generated yet. */}
            <PostCaptionBlock caption={suggestedCaption} fallback={fallbackCaption} />

            {/* Download */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => handleDownload(activeIndex)} disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Slide
              </button>
              <button type="button" onClick={() => handleDownload()} disabled={downloading}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                All ({slides.length})
              </button>
            </div>

            {/* Multi-platform post actions — appear after edits are final so the user commits
                to a platform only once they know what the asset looks like. The finalization
                recipe ensures the backend worker recomposes slides with the user's latest
                text/position edits right before posting; without it, Outstand would receive
                whatever slide URLs happened to be in state, which may be stale. */}
            <VisualPostActions
              contentKitId={contentKitId}
              sourceOutputId={`carousel:${contentKitId}`}
              caption={suggestedCaption || fallbackCaption || ''}
              mediaUrls={slides.map((s) => s.publicUrl).filter(Boolean)}
              outputKind="carousel"
              finalizationRecipe={{
                kind: 'carousel',
                kit_id: contentKitId,
                design_preset: (currentPreset === 'photo-overlay' ? 'auto' : currentPreset) as 'auto' | 'tweet-style' | 'text-box',
                slide_overrides: edits.map((e) => ({
                  text: e.text,
                  text_position: e.position,
                })),
              }}
            />

          </div>
        </div>
      </div>
    </div>
  );
}

