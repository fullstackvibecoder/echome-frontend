'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Loader2,
  RefreshCw,
  AlignVerticalDistributeStart,
  AlignVerticalDistributeCenter,
  AlignVerticalDistributeEnd,
} from 'lucide-react';
import { downloadImage, downloadCarouselImages } from '@/lib/download';
import { showErrorToast } from '@/lib/toast';
import { CarouselStyleEditor } from './CarouselStyleEditor';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

type TextPosition = 'top' | 'center' | 'bottom';

interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  text: string;
  template?: string;
  storagePath?: string;
}

interface SlideEdit {
  text: string;
  textPosition: TextPosition;
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

const POSITION_OPTIONS: { value: TextPosition; label: string; Icon: typeof AlignVerticalDistributeStart }[] = [
  { value: 'top', label: 'Top', Icon: AlignVerticalDistributeStart },
  { value: 'center', label: 'Center', Icon: AlignVerticalDistributeCenter },
  { value: 'bottom', label: 'Bottom', Icon: AlignVerticalDistributeEnd },
];

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
  const [regenerating, setRegenerating] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const backdropRef = useRef<HTMLDivElement>(null);

  // Init edits from slides
  useEffect(() => {
    setSlides(initialSlides);
    setEdits(initialSlides.map((s) => ({ text: s.text, textPosition: 'center' as TextPosition })));
  }, [initialSlides]);

  // Escape / arrow keys
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && !isTextareaFocused()) setActiveIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight' && !isTextareaFocused()) setActiveIndex((p) => Math.min(slides.length - 1, p + 1));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, slides.length]);

  function isTextareaFocused() {
    const el = document.activeElement;
    return el?.tagName === 'TEXTAREA' || el?.tagName === 'INPUT';
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const updateEdit = (index: number, patch: Partial<SlideEdit>) => {
    setEdits((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const hasChanges = edits.some(
    (e, i) => e.text !== slides[i]?.text || e.textPosition !== 'center'
  );

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (designPreset as any) || 'auto',
        slideOverrides: edits.map((e) => ({
          text: e.text,
          textPosition: e.textPosition === 'top'
            ? { x: 50, y: 15 }
            : e.textPosition === 'bottom'
              ? { x: 50, y: 85 }
              : { x: 50, y: 50 },
        })),
      });
      if (response.success && response.data?.carousel) {
        const newSlides = response.data.carousel.slides.map((s: any) => ({
          slideNumber: s.slideNumber,
          publicUrl: s.publicUrl,
          text: s.text,
          template: s.template || s.slideType || 'content',
          storagePath: '',
        }));
        setSlides(newSlides);
        setEdits(newSlides.map((s: CarouselSlide) => ({ text: s.text, textPosition: 'center' as TextPosition })));
        onCarouselUpdate();
        toast.success('Carousel regenerated');
      }
    } catch (err) {
      showErrorToast(err, 'regenerating carousel');
    } finally {
      setRegenerating(false);
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
        setEdits(mappedSlides.map((s: CarouselSlide) => ({ text: s.text, textPosition: 'center' as TextPosition })));
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
    const newSlides = carousel.slides.map((s) => ({ ...s, storagePath: '' }));
    setSlides(newSlides);
    setEdits(newSlides.map((s) => ({ text: s.text, textPosition: 'center' as TextPosition })));
    onCarouselUpdate();
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

  const activeSlide = slides[activeIndex];
  const activeEdit = edits[activeIndex];

  if (!open || slides.length === 0 || !activeSlide || !activeEdit) return null;

  // Check if current slide text was edited (different from original)
  const textEdited = activeEdit.text !== activeSlide.text;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Slide preview with live text overlay */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[45%] shrink-0 bg-background/50">
            {/* Main slide with overlay */}
            <div className="relative w-full max-w-[300px]">
              <div className="relative rounded-xl overflow-hidden border border-border">
                {/* Slide image */}
                <img
                  src={activeSlide.publicUrl}
                  alt={`Slide ${activeSlide.slideNumber}`}
                  className={`w-full ${textEdited ? 'opacity-30' : ''} transition-opacity duration-200`}
                />

                {/* Live text overlay — shown when text has been edited */}
                {textEdited && (
                  <div
                    className={`absolute inset-0 flex px-6 ${
                      activeEdit.textPosition === 'top'
                        ? 'items-start pt-[15%]'
                        : activeEdit.textPosition === 'bottom'
                        ? 'items-end pb-[15%]'
                        : 'items-center'
                    }`}
                  >
                    <p className="text-white text-sm font-semibold leading-snug text-center w-full drop-shadow-lg">
                      {activeEdit.text}
                    </p>
                  </div>
                )}

                {/* Position indicator — subtle guide when not edited */}
                {!textEdited && activeEdit.textPosition !== 'center' && (
                  <div
                    className={`absolute inset-x-0 h-1 bg-primary-interactive/60 ${
                      activeEdit.textPosition === 'top' ? 'top-[15%]' : 'bottom-[15%]'
                    }`}
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
              {slides.map((slide, i) => {
                const edited = edits[i]?.text !== slide.text;
                return (
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
                    {edited && (
                      <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {activeIndex + 1} / {slides.length}
            </p>
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col gap-4 p-6 lg:w-[55%] overflow-y-auto">
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

            {/* Slide text editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Slide {activeSlide.slideNumber} Text
                </label>
                {textEdited && (
                  <span className="text-[10px] text-accent font-medium">Edited</span>
                )}
              </div>
              <textarea
                value={activeEdit.text}
                onChange={(e) => updateEdit(activeIndex, { text: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                rows={3}
                placeholder="Slide text..."
              />
            </div>

            {/* Text position */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Text Position</label>
              <div className="flex gap-2">
                {POSITION_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateEdit(activeIndex, { textPosition: value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeEdit.textPosition === value
                        ? 'bg-primary-interactive text-white'
                        : 'border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                          ratio === '9:16' ? 'w-2 h-3' : 'w-3 h-3'
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

            {/* Regenerate with changes */}
            {hasChanges && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Apply Changes & Regenerate
                  </>
                )}
              </button>
            )}

            {/* Download actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => downloadImage(activeSlide.publicUrl, `carousel-slide-${activeSlide.slideNumber}.png`)}
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
