/**
 * Carousel Preview Components
 * Display and preview Instagram carousel images with lightbox functionality
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Maximize2,
} from 'lucide-react';
import { downloadImage, downloadCarouselImages } from '@/lib/download';

export interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  storagePath: string;
}

export interface CarouselPreviewProps {
  slides: CarouselSlide[];
  contentId: string;
  onDelete?: () => void;
  className?: string;
}

/**
 * Grid preview of carousel slides with download options
 */
export function CarouselPreview({
  slides,
  contentId,
  onDelete,
  className = '',
}: CarouselPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      await downloadCarouselImages(slides, contentId);
    } catch (error) {
      console.error('Failed to download carousel:', error);
    } finally {
      setDownloading(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with download options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Instagram Carousel ({slides.length} slides)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-sm rounded-lg transition-colors"
          >
            <FileArchive size={16} />
            {downloading ? 'Downloading...' : 'Download All'}
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors"
            >
              <X size={16} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Slide grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {slides.map((slide, index) => (
          <div
            key={slide.slideNumber}
            className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-800 cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            <img
              src={slide.publicUrl}
              alt={`Slide ${slide.slideNumber}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openLightbox(index);
                }}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <Maximize2 size={18} className="text-white" />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await downloadImage(
                    slide.publicUrl,
                    `carousel-slide-${slide.slideNumber}.png`
                  );
                }}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <Download size={18} className="text-white" />
              </button>
            </div>

            {/* Slide number badge */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
              {slide.slideNumber}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <CarouselLightbox
          slides={slides}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Lightbox props
 */
interface CarouselLightboxProps {
  slides: CarouselSlide[];
  initialIndex: number;
  onClose: () => void;
}

/**
 * Full-screen lightbox for viewing carousel slides
 */
export function CarouselLightbox({
  slides,
  initialIndex,
  onClose,
}: CarouselLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const currentSlide = slides[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <X size={32} />
      </button>

      {/* Download button */}
      <button
        onClick={() =>
          downloadImage(
            currentSlide.publicUrl,
            `carousel-slide-${currentSlide.slideNumber}.png`
          )
        }
        className="absolute top-4 left-4 p-2 text-white/70 hover:text-white transition-colors z-10 flex items-center gap-2"
      >
        <Download size={24} />
        <span className="text-sm">Download</span>
      </button>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Main image */}
      <div className="max-w-4xl max-h-[80vh] p-8">
        <img
          src={currentSlide.publicUrl}
          alt={`Slide ${currentSlide.slideNumber}`}
          className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Slide counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        {currentIndex + 1} / {slides.length}
      </div>

      {/* Thumbnail navigation */}
      {slides.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] p-2">
          {slides.map((slide, index) => (
            <button
              key={slide.slideNumber}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex
                  ? 'border-purple-500'
                  : 'border-transparent hover:border-white/30'
              }`}
            >
              <img
                src={slide.publicUrl}
                alt={`Thumbnail ${slide.slideNumber}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CarouselPreview;
