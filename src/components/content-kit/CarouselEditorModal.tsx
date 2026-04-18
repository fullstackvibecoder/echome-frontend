'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { downloadImage, downloadCarouselImages } from '@/lib/download';
import { showErrorToast } from '@/lib/toast';
import { CarouselStyleEditor } from './CarouselStyleEditor';
import { api } from '@/lib/api-client';

interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  text: string;
  template?: string;
  storagePath?: string;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sync slides when prop changes
  useEffect(() => {
    setSlides(initialSlides);
  }, [initialSlides]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setActiveIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setActiveIndex((p) => Math.min(slides.length - 1, p + 1));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, slides.length]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleDownloadSlide = async (slide: CarouselSlide) => {
    await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      await downloadCarouselImages(
        slides.map((s) => ({ slideNumber: s.slideNumber, publicUrl: s.publicUrl, storagePath: s.storagePath || '' })),
        contentKitId
      );
    } catch (err) {
      showErrorToast(err, 'downloading carousel');
    } finally {
      setDownloading(false);
    }
  };

  const handleResize = async (target: '1:1' | '9:16') => {
    if (resizing) return;
    setResizing(true);
    try {
      const response = await api.contentKits.resizeCarousel(contentKitId, target);
      if (response.success && response.data?.carousel) {
        const mappedSlides = response.data.carousel.slides.map((s: any) => ({
          slideNumber: s.slideNumber,
          publicUrl: s.publicUrl,
          text: s.text,
          template: s.template || s.slideType || 'content',
        }));
        setSlides(mappedSlides);
        setAspectRatio(target);
      }
    } catch (err) {
      showErrorToast(err, 'resizing carousel');
    } finally {
      setResizing(false);
    }
  };

  const handleRestyleComplete = (carousel: {
    slides: Array<{ slideNumber: number; text: string; publicUrl: string; template?: string }>;
    designPreset?: string;
  }) => {
    setSlides(carousel.slides.map((s) => ({ ...s, storagePath: '' })));
    onCarouselUpdate();
  };

  const activeSlide = slides[activeIndex];

  if (!open || slides.length === 0) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[900px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Slide preview */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[50%] shrink-0 bg-background/50">
            {/* Main slide */}
            <div className="relative w-full max-w-[320px]">
              <img
                src={activeSlide.publicUrl}
                alt={`Slide ${activeSlide.slideNumber}`}
                className="w-full rounded-xl border border-border"
              />

              {/* Nav arrows */}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                    disabled={activeIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((p) => Math.min(slides.length - 1, p + 1))}
                    disabled={activeIndex === slides.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Slide strip */}
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
                  <img
                    src={slide.publicUrl}
                    alt={`Slide ${slide.slideNumber}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow-md">
                    {slide.slideNumber}
                  </span>
                </button>
              ))}
            </div>

            {/* Slide counter */}
            <p className="text-[11px] text-muted-foreground mt-2">
              {activeIndex + 1} / {slides.length}
            </p>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col gap-5 p-6 lg:w-[50%] overflow-y-auto">
            {/* Header */}
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

            {/* Slide text */}
            {activeSlide.text && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Slide Text</label>
                <p className="text-sm text-muted-foreground bg-background border border-border rounded-lg px-3 py-2 leading-relaxed">
                  {activeSlide.text}
                </p>
              </div>
            )}

            {/* Aspect ratio toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Aspect Ratio</label>
              <div className="flex gap-2">
                {(['9:16', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleResize(ratio)}
                    disabled={resizing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      aspectRatio === ratio
                        ? 'bg-primary-interactive text-white'
                        : 'border border-border text-muted-foreground hover:text-foreground'
                    } disabled:opacity-50`}
                  >
                    {resizing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <div
                        className={`border border-current rounded-sm ${
                          ratio === '9:16' ? 'w-2.5 h-4' : 'w-3.5 h-3.5'
                        }`}
                      />
                    )}
                    {ratio === '9:16' ? 'Portrait' : 'Square'}
                  </button>
                ))}
              </div>
            </div>

            {/* Style editor */}
            <CarouselStyleEditor
              kitId={contentKitId}
              currentDesignPreset={designPreset}
              uploadId={uploadId}
              onRestyleComplete={handleRestyleComplete}
            />

            {/* Download actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadSlide(activeSlide)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Download Slide
              </button>
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloading}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileArchive className="h-4 w-4" />
                )}
                All ({slides.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
