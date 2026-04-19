'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Loader2,
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

/** Approximate CSS text style per template type for the drag overlay preview */
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
  const [preparingBackgrounds, setPreparingBackgrounds] = useState(false);
  const bgPreparedRef = useRef(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Init edits from slides
  useEffect(() => {
    setSlides(initialSlides);
    setEdits(initialSlides.map((s) => ({
      text: s.text,
      position: { x: 0.5, y: 0.5 },
    })));
    bgPreparedRef.current = false;
  }, [initialSlides]);

  // Auto-regenerate backgrounds for old carousels that lack backgroundUrl
  useEffect(() => {
    if (!open || bgPreparedRef.current) return;
    const needsBackgrounds = initialSlides.length > 0 && !initialSlides.some(s => s.backgroundUrl);
    if (!needsBackgrounds) return;

    bgPreparedRef.current = true;
    setPreparingBackgrounds(true);

    api.contentKits.regenerateCarousel(contentKitId, {
      designPreset: (designPreset as any) || 'auto',
    }).then((response) => {
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
      }
    }).catch((err) => {
      console.error('Failed to prepare carousel backgrounds:', err);
    }).finally(() => {
      setPreparingBackgrounds(false);
    });
  }, [open, initialSlides, contentKitId, designPreset, onCarouselUpdate]);

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

  const handleDownload = async (slideIndex?: number) => {
    setDownloading(true);
    try {
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

  const previewImageUrl = activeSlide.backgroundUrl || activeSlide.publicUrl;
  const hasBackground = !!activeSlide.backgroundUrl;
  const templateStyle = TEMPLATE_TEXT_STYLES[activeSlide.template || 'text-box'] || TEMPLATE_TEXT_STYLES['text-box'];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Slide preview with draggable text */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[45%] shrink-0 bg-background/50">
            <div className="relative w-full max-w-[300px]" ref={previewContainerRef}>
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={previewImageUrl}
                  alt={`Slide ${activeSlide.slideNumber}`}
                  className="w-full"
                  draggable={false}
                />

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

            {!hasBackground && preparingBackgrounds && (
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Preparing editor...
              </div>
            )}
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
              {hasBackground && (
                <p className="text-[11px] text-muted-foreground/60">
                  Drag the text on the preview to reposition
                </p>
              )}
            </div>

            <CarouselStyleEditor
              kitId={contentKitId}
              currentDesignPreset={designPreset}
              uploadId={uploadId}
              onRestyleComplete={handleRestyleComplete}
            />

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
