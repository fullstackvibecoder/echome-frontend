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
import CarouselFilmstrip from './CarouselFilmstrip';
import { CarouselStyleEditor } from './CarouselStyleEditor';
import { DraggableTextOverlay } from './DraggableTextOverlay';
import { PhotoPicker } from './PhotoPicker';
import { RedWordPicker } from './RedWordPicker';
import { PostCaptionBlock } from './PostCaptionBlock';
import { VisualPostActions } from './VisualPostActions';
import { CarouselEditorTour } from '@/components/tour/tours/carousel-editor';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  renderSlide,
  supportsClientRender,
  BRANDED_OVERLAY_PRESET,
  type SlideConfig,
  type TemplateType,
  type StructuredFields,
} from '@/lib/carousel-renderer';
import { reorderSlides, insertBlankSlide, deleteSlide, isBlankSlide } from '@/lib/carousel-slide-ops';

interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  backgroundUrl?: string;
  /** Source photo URL — the photo used as the slide background (distinct
   *  from `backgroundUrl` which is the bg-PNG for two-phase templates). */
  backgroundImageUrl?: string;
  text: string;
  template?: string;
  /** LLM-parsed structured fields (headline/body/subtitle/cta/details).
   *  When present, the post-gen editor shows per-field inputs instead of
   *  a single textarea, and the live renderer uses these as the source of
   *  truth. Branded-overlay slides have these; legacy templates don't. */
  structured?: StructuredFields;
}

interface SlideEdit {
  text: string;
  position: { x: number; y: number };
  /** Per-slide photo override from the photo picker. Undefined = leave as-is. */
  backgroundImageUrl?: string;
  /** Per-slide red-emphasis word override (cover/last only). The compose-only
   *  backend strips any prior `**` markers and wraps this word with `**`. */
  redKeyword?: string;
  /** Editable structured fields. When the source slide has these, the editor
   *  prefers them over the plain text field and saves via PATCH. */
  structured?: StructuredFields;
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
  // Editable per-carousel post caption. Null/empty falls through to the
  // kit-level Instagram caption (fallbackCaption) at post time. The local
  // mirror lets typing feel instant; we PATCH on a 600ms debounce.
  const [postCaptionDraft, setPostCaptionDraft] = useState<string>(suggestedCaption ?? '');
  const [savingCaption, setSavingCaption] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persistSlides(next: CarouselSlide[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      api.contentKits
        .updateCarouselSlides(contentKitId, next as Parameters<typeof api.contentKits.updateCarouselSlides>[1])
        .catch((err) => console.error('[carousel] failed to persist slide order', err));
    }, 600);
  }

  function handleReorder(from: number, to: number) {
    const next = reorderSlides(slides, from, to, currentPreset) as CarouselSlide[];
    setSlides(next);
    setEdits((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
    setActiveIndex(to);
    persistSlides(next);
  }

  function handleInsert(index: number) {
    const makeBlank = (): CarouselSlide =>
      ({
        slideNumber: 0,
        text: '',
        imageUrl: '',
        publicUrl: '',
        template: 'tweet-style',
        backgroundUrl: '',
        structured: { headline: '', body: '' },
      } as unknown as CarouselSlide);
    const next = insertBlankSlide(slides, index, makeBlank, currentPreset) as CarouselSlide[];
    setSlides(next);
    setEdits((prev) => {
      const blankEdit: SlideEdit = {
        text: '',
        position: { x: 0.5, y: 0.5 },
        backgroundImageUrl: undefined,
        redKeyword: undefined,
        structured: { headline: '', body: '' },
      };
      const copy = [...prev];
      copy.splice(index, 0, blankEdit);
      return copy;
    });
    setActiveIndex(index);
    persistSlides(next);
  }

  function handleDelete(index: number) {
    const target = slides[index];
    if (!isBlankSlide(target)) {
      const ok = window.confirm('Delete this slide? Its text will be lost.');
      if (!ok) return;
    }
    const next = deleteSlide(slides, index, currentPreset) as CarouselSlide[];
    setSlides(next);
    setEdits((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setActiveIndex(Math.min(index, next.length - 1));
    persistSlides(next);
  }

  const hasBackground = slides.some(s => !!s.backgroundUrl);
  // hasEdits drives whether the download flow flushes overrides to the
  // backend re-render path. Must detect ANY editable change — text,
  // structured fields, position, photo, redKeyword — otherwise stale
  // cached publicUrls get served when the user edits only a structured
  // field (e.g., just the headline) and clicks Download.
  const hasEdits = edits.some((e, i) => {
    const s = slides[i];
    if (!s) return false;
    if (e.text !== s.text) return true;
    if (e.backgroundImageUrl && e.backgroundImageUrl !== s.backgroundImageUrl) return true;
    if (e.redKeyword) return true;
    if (e.position && (e.position.x !== 0.5 || e.position.y !== 0.5)) return true;
    if (e.structured && JSON.stringify(e.structured) !== JSON.stringify(s.structured ?? {})) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    setSlides(initialSlides);
    setEdits(initialSlides.map((s) => {
      // Seed redKeyword from any existing **word** marker in the slide text
      // so AI-chosen emphasis doesn't silently disappear the moment a user
      // edits anything else. Only applies to cover and last templates per
      // the design rule. Body slides ignore red emphasis.
      const isCoverOrLast =
        s.template === 'branded-overlay-cover' || s.template === 'branded-overlay-last';
      const markerMatch = isCoverOrLast ? s.text.match(/\*\*(.+?)\*\*/) : null;
      return {
        text: s.text,
        position: { x: 0.5, y: 0.5 },
        backgroundImageUrl: s.backgroundImageUrl,
        redKeyword: markerMatch?.[1],
        structured: s.structured,
      };
    }));
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
    // Re-init only when the modal opens, the kit changes, or the slide count
    // changes (e.g. post-regen). NOT on every initialSlides reference change —
    // the parent rebuilds that array on every render, so depending on it would
    // wipe local edits any time React re-rendered the parent (e.g. subscription
    // poll between typing and clicking Post Now). The local add/delete/reorder
    // ops update setEdits directly, so they're unaffected.
  }, [open, contentKitId, initialSlides.length]);

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

  // Debounced PATCH for per-slide structured field edits. 600ms cadence
  // matches the post-caption pattern; long enough for a fast typist to
  // finish a thought, short enough that "Saving…" feedback feels real.
  // Slides keyed by slideNumber since timers are per-slide.
  const slideSaveTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [savingSlide, setSavingSlide] = useState<number | null>(null);
  const [slideSaveError, setSlideSaveError] = useState<string | null>(null);

  const handleStructuredFieldChange = useCallback(
    (slideIndex: number, field: keyof StructuredFields, value: string) => {
      const slide = slides[slideIndex];
      if (!slide) return;

      const merged: StructuredFields = {
        ...(edits[slideIndex]?.structured || {}),
        [field]: value,
      };
      updateEdit(slideIndex, { structured: merged });

      const existing = slideSaveTimersRef.current[slide.slideNumber];
      if (existing) clearTimeout(existing);
      slideSaveTimersRef.current[slide.slideNumber] = setTimeout(async () => {
        setSavingSlide(slide.slideNumber);
        setSlideSaveError(null);
        try {
          await api.contentKits.updateSlide(contentKitId, slide.slideNumber, {
            structured: merged,
          });
        } catch (err) {
          console.error('Failed to save slide edit', err);
          setSlideSaveError('Could not save edits. Try again.');
        } finally {
          setSavingSlide((curr) => (curr === slide.slideNumber ? null : curr));
        }
      }, 600);
    },
    [slides, edits, contentKitId],
  );

  // Flush + clear all slide save timers and the persist debounce on unmount
  // so slow last edits don't leak network calls after the modal closes.
  useEffect(() => {
    const timers = slideSaveTimersRef.current;
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t);
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  // Debounced PATCH for the per-carousel post caption. Mirrors the clip
  // editor's pattern (ClipEditorModal:195-208). 600ms cadence lets a fast
  // typist edit without firing a save per keystroke. The local
  // postCaptionDraft is the source of truth for what the user sees while
  // they type; the PATCH catches up after they pause.
  const captionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePostCaptionChange = useCallback(
    (next: string) => {
      setPostCaptionDraft(next);
      if (captionSaveTimerRef.current) clearTimeout(captionSaveTimerRef.current);
      captionSaveTimerRef.current = setTimeout(async () => {
        setSavingCaption(true);
        try {
          await api.contentKits.update(contentKitId, { carouselSuggestedCaption: next });
        } catch (err) {
          console.error('Failed to save carousel caption', err);
          showErrorToast('Could not save caption changes. Please try again.');
        } finally {
          setSavingCaption(false);
        }
      }, 600);
    },
    [contentKitId],
  );

  /**
   * Run a compose-only regenerate using the given overrides and swap the
   * resulting slide URLs into local state. Shared by handlePhotoSelect
   * (immediate, photo swap) and the auto-debounced text-edit watcher
   * below. composeOnly:true skips the LLM and the full canvas pipeline
   * for two-phase templates; for branded-overlay it re-renders single-pass
   * via renderSlideToBuffer (~2-3s for 10 slides).
   */
  const runComposeOnlyRefresh = useCallback(
    async (overrides: Array<{ text: string; textPosition: { x: number; y: number }; backgroundImageUrl?: string; redKeyword?: string }>) => {
      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (currentPreset as 'auto' | 'tweet-style' | 'text-box' | 'branded-overlay' | 'quote-card' | 'stats-card') || 'auto',
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
   * User picked a different photo from the rail. Update local state — the
   * preview canvas re-renders automatically via the renderSlide effect.
   * No server round-trip; the new photo is baked into the export at
   * Download / Post / Schedule time.
   */
  const handlePhotoSelect = useCallback(
    (slideIndex: number, photoUrl: string) => {
      setEdits((prev) =>
        prev.map((e, i) => (i === slideIndex ? { ...e, backgroundImageUrl: photoUrl } : e)),
      );
    },
    [],
  );

  /**
   * Apply the active slide's photo to every slide. Body slides render the
   * photo with a heavier dark overlay (renderBrandedOverlayBody), so text
   * stays readable. Same local-state-only mechanics as handlePhotoSelect:
   * the per-slide overrides are baked in at Download / Post / Schedule.
   */
  const handleApplyPhotoToAll = useCallback(() => {
    const photoUrl =
      edits[activeIndex]?.backgroundImageUrl ?? slides[activeIndex]?.backgroundImageUrl;
    if (!photoUrl) return;
    setEdits((prev) => prev.map((e) => ({ ...e, backgroundImageUrl: photoUrl })));
  }, [activeIndex, edits, slides]);

  /**
   * Client-side preview render. Mirrors the backend canvas pipeline so
   * what shows in the editor IS what gets exported. Replaced the old
   * 1.5s auto-debounced server compose — we no longer round-trip on
   * every keystroke.
   *
   * Only branded-overlay templates render client-side (the legacy
   * single-pass templates bake text into the cached background PNG and
   * can't be recomposed without the full server pipeline). For those,
   * the preview falls back to the server's publicUrl + DraggableTextOverlay.
   *
   * Server-side compose still runs at terminal moments: Download (handleDownload)
   * and the VisualPostActions Post-now / Schedule paths. Those send the
   * current edits as overrides so the final asset matches the editor preview.
   */
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!open) return;
    const canvas = previewCanvasRef.current;
    const slide = slides[activeIndex];
    const edit = edits[activeIndex];
    if (!canvas || !slide || !edit) return;
    if (!supportsClientRender(slide.template)) return;

    const config: SlideConfig = {
      templateType: slide.template as TemplateType,
      text: edit.text,
      slideNumber: slide.slideNumber,
      totalSlides: slides.length,
      aspectRatio: '4:5',
      backgroundImageUrl: edit.backgroundImageUrl ?? slide.backgroundImageUrl,
      designSystem: BRANDED_OVERLAY_PRESET,
      redKeyword: edit.redKeyword,
      // Pass structured edits through so the renderer uses headline/body/subtitle
      // as the source of truth instead of falling back to plain text parsing.
      // Branded-overlay templates only — legacy templates ignore `structured`.
      structured: edit.structured,
    };
    let cancelled = false;
    renderSlide(canvas, config).catch((err) => {
      if (!cancelled) console.warn('Carousel preview render failed', err);
    });
    return () => {
      cancelled = true;
    };
  }, [open, activeIndex, slides, edits]);

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

  // Download: composeOnly if backgrounds exist, full regenerate with overrides otherwise.
  // We always flush the current edits.structured into the slideOverrides so that
  // download/share renders match the live editor preview — even if the debounced
  // updateSlide PATCH hasn't landed yet. Backend prefers override.structured over
  // the persisted slide.structured at render time.
  const handleDownload = async (slideIndex?: number) => {
    setDownloading(true);
    try {
      if (hasBackground) {
        // Two-phase: compose text onto cached backgrounds
        const response = await api.contentKits.regenerateCarousel(contentKitId, {
          designPreset: (currentPreset as any) || 'auto',
          composeOnly: true,
          slideOverrides: edits.map((e) => ({
            text: e.text,
            textPosition: e.position,
            structured: e.structured,
            backgroundImageUrl: e.backgroundImageUrl,
            redKeyword: e.redKeyword,
          })),
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
        // Single-pass (tweet-style): full regenerate with text + structured overrides
        const response = await api.contentKits.regenerateCarousel(contentKitId, {
          designPreset: (currentPreset as any) || 'auto',
          slideOverrides: edits.map((e) => ({
            text: e.text,
            structured: e.structured,
          })),
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
  const coverNeedsEmphasis =
    activeIndex === 0 &&
    activeSlide?.template === 'branded-overlay-cover' &&
    !activeEdit?.redKeyword;
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
  // Branded-overlay templates render fully client-side (canvas pixel-parity
  // with the backend). Legacy single-pass templates (tweet-style, text-box,
  // photo-overlay) bake text into the cached PNG and can't be recomposed
  // without the server pipeline, so they fall back to the publicUrl <img>
  // + DraggableTextOverlay for repositioning hints.
  const useClientCanvas = supportsClientRender(activeSlide.template);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <CarouselEditorTour />
      <div className="relative flex w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Preview.
              min-w-0 is required so flex children (specifically the thumbnail
              strip below) can't push the column past its declared 45% by
              their intrinsic content width. Without it, 10 thumbnails at
              ~64px each (incl. gap) drag the column to ~640px and overflow
              into the right edit pane. */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[45%] shrink-0 min-w-0 bg-background/50">
            <div className="relative w-full max-w-[300px]" ref={previewContainerRef}>
              <div className="relative rounded-xl overflow-hidden border border-border">
                {useClientCanvas ? (
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full block"
                    aria-label={`Slide ${activeSlide.slideNumber}`}
                  />
                ) : (
                  <>
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
                  </>
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
            <CarouselFilmstrip
              slides={slides}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              onReorder={handleReorder}
              onInsert={handleInsert}
              onDelete={handleDelete}
            />
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

            {/* Text editor.
                When slide.structured exists (branded-overlay templates with
                LLM-parsed grammar), show per-field inputs that map 1:1 to the
                renderer's drawing logic. Otherwise fall back to a single
                textarea for legacy templates. The structured path saves via
                PATCH on a 600ms debounce; the legacy textarea is local-only
                until the user triggers a regenerate. */}
            {activeEdit.structured ? (
              <div data-tour="carousel-editor-text" className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Slide {activeSlide.slideNumber} content
                  </label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {savingSlide === activeSlide.slideNumber
                      ? 'Saving…'
                      : slideSaveError
                      ? <span className="text-red-500">{slideSaveError}</span>
                      : 'Saved'}
                  </span>
                </div>

                {coverNeedsEmphasis && (
                  <p className="text-[11px] text-muted-foreground bg-background rounded px-2 py-1 mb-2 border border-border">
                    Cover slides shine with one emphasized word — pick one below.
                  </p>
                )}

                {/* Headline — always present on branded-overlay slides */}
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Headline</label>
                  <textarea
                    value={activeEdit.structured.headline ?? ''}
                    onChange={(e) =>
                      handleStructuredFieldChange(activeIndex, 'headline', e.target.value)
                    }
                    rows={2}
                    placeholder="Main headline"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                  />
                </div>

                {/* Body — branded-overlay-body */}
                {(activeEdit.structured.body !== undefined ||
                  activeSlide.template === 'branded-overlay-body') && (
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Body</label>
                    <textarea
                      value={activeEdit.structured.body ?? ''}
                      onChange={(e) =>
                        handleStructuredFieldChange(activeIndex, 'body', e.target.value)
                      }
                      rows={4}
                      placeholder="Supporting paragraph"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                    />
                  </div>
                )}

                {/* Subtitle — branded-overlay-cover */}
                {(activeEdit.structured.subtitle !== undefined ||
                  activeSlide.template === 'branded-overlay-cover') && (
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Subtitle</label>
                    <input
                      type="text"
                      value={activeEdit.structured.subtitle ?? ''}
                      onChange={(e) =>
                        handleStructuredFieldChange(activeIndex, 'subtitle', e.target.value)
                      }
                      placeholder="Optional subtitle"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50"
                    />
                  </div>
                )}

                {/* CTA — branded-overlay-last */}
                {(activeEdit.structured.cta !== undefined ||
                  activeSlide.template === 'branded-overlay-last') && (
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Call to action</label>
                    <input
                      type="text"
                      value={activeEdit.structured.cta ?? ''}
                      onChange={(e) =>
                        handleStructuredFieldChange(activeIndex, 'cta', e.target.value)
                      }
                      placeholder="e.g., Save this for later"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50"
                    />
                  </div>
                )}

                {/* Details — optional, only render if already populated */}
                {activeEdit.structured.details !== undefined && (
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Details</label>
                    <textarea
                      value={activeEdit.structured.details ?? ''}
                      onChange={(e) =>
                        handleStructuredFieldChange(activeIndex, 'details', e.target.value)
                      }
                      rows={2}
                      placeholder="Additional details"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Slide {activeSlide.slideNumber} Text</label>
                <textarea
                  value={activeEdit.text}
                  onChange={(e) => updateEdit(activeIndex, { text: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                  rows={3}
                  placeholder="Slide text..."
                />
              </div>
            )}
            <div className="space-y-2">
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

            {/* Enable drag editing — only for templates that support it and don't have backgrounds yet.
                Branded-overlay AND quote-card templates bake text into the composed PNG (no separate bg
                layer to drag text over), so this button is a no-op for them. The proper fix (universal
                edit pipeline) is in progress; this exclusion keeps the affordance from misleading users
                until it lands. */}
            {!hasBackground
              && !['tweet-style'].includes(activeSlide.template || '')
              && !(activeSlide.template || '').startsWith('branded-overlay')
              && !(activeSlide.template || '').startsWith('quote-card')
              && !(activeSlide.template || '').startsWith('stats-card') && (
              <button type="button" onClick={handlePrepareEditing} disabled={preparing}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-interactive/40 bg-primary-interactive/5 px-4 py-3 text-sm font-medium text-primary-interactive hover:bg-primary-interactive/10 transition-colors disabled:opacity-50">
                {preparing ? (<><Loader2 className="h-4 w-4 animate-spin" />Preparing...</>) : (<><Pencil className="h-4 w-4" />Enable drag positioning</>)}
              </button>
            )}

            {/* Photo picker — branded-overlay cover/last slides support photo
                swap via the compose-only fast path. Body slides don't get
                their own picker (matches the red-word picker rule below and
                the tour copy in tours/carousel-editor.tsx), but they CAN
                receive the photo via "Apply to all slides" — the body
                renderer draws it with a heavier overlay. Legacy templates
                (tweet-style, text-box, photo-overlay) don't render the
                photo themselves, so the picker is hidden for those too. */}
            {(activeSlide.template === 'branded-overlay-cover' ||
              activeSlide.template === 'branded-overlay-last') && (
              <div data-tour="carousel-editor-photo" className="space-y-2">
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
                {(edits[activeIndex]?.backgroundImageUrl ?? activeSlide.backgroundImageUrl) &&
                  slides.length > 1 && (
                    <button
                      type="button"
                      onClick={handleApplyPhotoToAll}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-card transition-colors"
                    >
                      Apply this photo to all {slides.length} slides
                    </button>
                  )}
              </div>
            )}

            {/* Red-word picker — cover (slide 1) and last slide only. Body
                slides forbid emphasis per the design rules so the picker is
                hidden for them. The auto-debounced compose-only effect
                picks up the new redKeyword and re-renders the slide. */}
            {(activeSlide.template === 'branded-overlay-cover' ||
              activeSlide.template === 'branded-overlay-last') && (
              <RedWordPicker
                text={edits[activeIndex]?.text ?? activeSlide.text ?? ''}
                selectedWord={edits[activeIndex]?.redKeyword}
                onChange={(word) => updateEdit(activeIndex, { redKeyword: word })}
              />
            )}

            {/* Style editor */}
            <CarouselStyleEditor kitId={contentKitId} currentDesignPreset={currentPreset} uploadId={uploadId} slideCount={slides.length} onRestyleComplete={handleRestyleComplete} />

            {/* Post caption — the text to paste into Instagram when uploading.
                Editable: typing persists to generated_carousels.suggested_caption
                via the kit PATCH endpoint (debounced 600ms). Falls back to the
                kit-level Instagram caption when the per-carousel value is empty,
                so unedited carousels still inherit the kit default. */}
            <PostCaptionBlock
              caption={postCaptionDraft}
              fallback={fallbackCaption}
              onChange={handlePostCaptionChange}
              saving={savingCaption}
            />

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
              caption={postCaptionDraft || fallbackCaption || ''}
              mediaUrls={slides.map((s) => s.publicUrl).filter(Boolean)}
              outputKind="carousel"
              disabledReasons={{ youtube: 'YouTube posting supports vertical video clips, not carousels.' }}
              finalizationRecipe={{
                kind: 'carousel',
                kit_id: contentKitId,
                design_preset: (currentPreset === 'photo-overlay' ? 'auto' : currentPreset) as 'auto' | 'tweet-style' | 'text-box' | 'branded-overlay' | 'quote-card' | 'stats-card',
                // Flush every editable field. Backend finalizer prefers
                // override-wins precedence so a click between editing and
                // posting still ships the right pixels even before the
                // debounced updateSlide PATCH lands.
                slide_overrides: edits.map((e) => ({
                  text: e.text,
                  text_position: e.position,
                  structured: e.structured,
                  backgroundImageUrl: e.backgroundImageUrl,
                  redKeyword: e.redKeyword,
                })),
              }}
            />

          </div>
        </div>
      </div>
    </div>
  );
}

