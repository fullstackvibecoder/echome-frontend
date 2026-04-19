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
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  backgroundUrl?: string;
  text: string;
  template?: string;
}

interface SlideEdit {
  text: string;
  position: { x: number; y: number };
}

interface CarouselEditorModalProps {
  open: boolean;
  onClose: () => void;
  slides: CarouselSlide[];
  contentKitId: string;
  designPreset?: string;
  uploadId?: string;
  onCarouselUpdate: () => void;
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
    fontSize: '11px',
    fontWeight: '500',
    textShadow: 'none',
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: '8px 12px',
    borderRadius: '10px',
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

export default function CarouselEditorModal({
  open,
  onClose,
  slides: initialSlides,
  contentKitId,
  designPreset,
  uploadId,
  onCarouselUpdate,
}: CarouselEditorModalProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [edits, setEdits] = useState<SlideEdit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const hasBackground = slides.some(s => !!s.backgroundUrl);

  // Init edits from slides
  useEffect(() => {
    setSlides(initialSlides);
    setEdits(initialSlides.map((s) => ({
      text: s.text,
      position: { x: 0.5, y: 0.5 },
    })));
  }, [initialSlides]);

  // Cleanup on unmount/close
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const active = document.activeElement;
      const isTyping = active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT';
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

  // User-initiated: prepare backgrounds for drag editing
  const handlePrepareEditing = useCallback(async () => {
    if (preparing || hasBackground) return;

    // Abort any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPreparing(true);
    try {
      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (designPreset as any) || 'auto',
      });

      // Check if we were aborted while waiting
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
        setEdits(newSlides.map((s: CarouselSlide) => ({
          text: s.text,
          position: { x: 0.5, y: 0.5 },
        })));
        onCarouselUpdate();
        toast.success('Editor ready — drag text to reposition');
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        showErrorToast(err, 'preparing carousel editor');
      }
    } finally {
      if (!controller.signal.aborted) {
        setPreparing(false);
      }
    }
  }, [preparing, hasBackground, contentKitId, designPreset, onCarouselUpdate]);

  const handleDownload = async (slideIndex?: number) => {
    setDownloading(true);
    try {
      if (hasBackground) {
        // Use composeOnly fast path
        const response = await api.contentKits.regenerateCarousel(contentKitId, {
          designPreset: (designPreset as any) || 'auto',
          composeOnly: true,
          slideOverrides: edits.map((e) => ({
            text: e.text,
            textPosition: e.position,
          })),
        });

        if (response.success && response.data?.carousel?.slides) {
          const composedSlides = response.data.carousel.slides;
          if (slideIndex !== undefined) {
            const slide = composedSlides[slideIndex];
            if (slide) await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
          } else {
            for (const slide of composedSlides) {
              await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
            }
          }
          toast.success(slideIndex !== undefined ? 'Slide downloaded' : 'All slides downloaded');
        }
      } else {
        // No backgrounds — download existing composites directly
        if (slideIndex !== undefined) {
          const slide = slides[slideIndex];
          if (slide) await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
        } else {
          for (const slide of slides) {
            await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
          }
        }
        toast.success(slideIndex !== undefined ? 'Slide downloaded' : 'All slides downloaded');
      }
    } catch (err) {
      showErrorToast(err, 'downloading carousel');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestyleComplete = (carousel: {
    slides: Array<{ slideNumber: number; text: string; publicUrl: string; template?: string; backgroundUrl?: string }>;
    designPreset?: string;
  }) => {
    const newSlides = carousel.slides.map((s) => ({
      slideNumber: s.slideNumber,
      publicUrl: s.publicUrl,
      backgroundUrl: s.backgroundUrl,
      text: s.text,
      template: s.template,
    }));
    setSlides(newSlides);
    setEdits(newSlides.map((s) => ({ text: s.text, position: { x: 0.5, y: 0.5 } })));
    onCarouselUpdate();
  };

  const activeSlide = slides[activeIndex];
  const activeEdit = edits[activeIndex];

  if (!open || slides.length === 0 || !activeSlide || !activeEdit) return null;

  const previewImageUrl = hasBackground ? (activeSlide.backgroundUrl || activeSlide.publicUrl) : activeSlide.publicUrl;
  const templateStyle = TEMPLATE_TEXT_STYLES[activeSlide.template || 'text-box'] || TEMPLATE_TEXT_STYLES['text-box'];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Slide preview */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[45%] shrink-0 bg-background/50">
            <div className="relative w-full max-w-[300px]" ref={previewContainerRef}>
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={previewImageUrl}
                  alt={`Slide ${activeSlide.slideNumber}`}
                  className="w-full"
                  draggable={false}
                />

                {/* Draggable text — only when backgrounds are ready */}
                {hasBackground && (
                  <DraggableTextOverlay
                    text={activeEdit.text}
                    position={activeEdit.position}
                    onPositionChange={(pos) => updateEdit(activeIndex, { position: pos })}
                    containerRef={previewContainerRef}
                    style={templateStyle}
                  />
                )}
              </div>

              {/* Nav arrows */}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                    disabled={activeIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors z-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((p) => Math.min(slides.length - 1, p + 1))}
                    disabled={activeIndex === slides.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors z-20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Filmstrip */}
            <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
              {slides.map((slide, i) => (
                <button
                  key={slide.slideNumber}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    i === activeIndex
                      ? 'border-primary-interactive ring-1 ring-primary-interactive/30'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
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
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Enable editing button — shown when no backgrounds exist */}
            {!hasBackground && (
              <button
                type="button"
                onClick={handlePrepareEditing}
                disabled={preparing}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary-interactive/40 bg-primary-interactive/5 px-4 py-3 text-sm font-medium text-primary-interactive hover:bg-primary-interactive/10 transition-colors disabled:opacity-50"
              >
                {preparing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing editor...
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Enable text editing & positioning
                  </>
                )}
              </button>
            )}

            {/* Text editor — always visible when backgrounds ready */}
            {hasBackground && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Slide {activeSlide.slideNumber} Text
                </label>
                <textarea
                  value={activeEdit.text}
                  onChange={(e) => updateEdit(activeIndex, { text: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                  rows={3}
                  placeholder="Slide text..."
                />
                <p className="text-[11px] text-muted-foreground/60">
                  Drag the text on the preview to reposition
                </p>
              </div>
            )}

            {/* Style editor */}
            <CarouselStyleEditor
              kitId={contentKitId}
              currentDesignPreset={designPreset}
              uploadId={uploadId}
              onRestyleComplete={handleRestyleComplete}
            />

            {/* Download */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownload(activeIndex)}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Slide
              </button>
              <button
                type="button"
                onClick={() => handleDownload()}
                disabled={downloading}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                All ({slides.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
