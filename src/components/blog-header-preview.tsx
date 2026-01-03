/**
 * Blog Header Preview Component
 * Display generated blog header images with download option
 */

'use client';

import React, { useState } from 'react';
import { Download, RefreshCw, Maximize2, X } from 'lucide-react';
import { downloadImage } from '@/lib/download';
import type { GeneratedImage } from '@/types';

export interface BlogHeaderPreviewProps {
  image: GeneratedImage;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

/**
 * Preview component for generated blog header images
 */
export function BlogHeaderPreview({
  image,
  onRegenerate,
  isRegenerating = false,
  className = '',
}: BlogHeaderPreviewProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const filename = `blog-header-${Date.now()}.png`;
      await downloadImage(image.publicUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Blog Header Image</h3>
        <div className="flex gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw
                size={16}
                className={isRegenerating ? 'animate-spin' : ''}
              />
              {isRegenerating ? 'Generating...' : 'Regenerate'}
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white text-sm rounded-lg transition-colors"
          >
            <Download size={16} />
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>

      {/* Image preview */}
      <div
        className="relative group rounded-lg overflow-hidden bg-zinc-800 cursor-pointer aspect-video"
        onClick={() => setShowFullscreen(true)}
      >
        <img
          src={image.publicUrl}
          alt="Generated blog header"
          className="w-full h-full object-cover"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="p-3 bg-white/20 rounded-full">
            <Maximize2 size={24} className="text-white" />
          </div>
        </div>

        {/* Style badge */}
        <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded capitalize">
          {image.style}
        </div>

        {/* Aspect ratio badge */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {image.aspectRatio}
        </div>
      </div>

      {/* Prompt info (collapsed by default) */}
      <details className="text-sm">
        <summary className="text-zinc-400 cursor-pointer hover:text-zinc-300">
          View AI prompt used
        </summary>
        <p className="mt-2 p-3 bg-zinc-800 rounded-lg text-zinc-300 text-xs leading-relaxed">
          {image.prompt}
        </p>
      </details>

      {/* Fullscreen modal */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="absolute top-4 left-4 p-2 text-white/70 hover:text-white transition-colors flex items-center gap-2"
          >
            <Download size={24} />
            <span className="text-sm">Download</span>
          </button>

          <img
            src={image.publicUrl}
            alt="Generated blog header (fullscreen)"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default BlogHeaderPreview;
