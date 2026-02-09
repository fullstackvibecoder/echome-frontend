'use client';

/**
 * Clip Uploader Component
 *
 * Upload zone for a single template segment.
 */

import { useState, useRef, useCallback } from 'react';
import type { TemplateSegment, ReelProjectClip } from '@/types';

interface ClipUpload {
  segmentId: string;
  file?: File;
  sourceUrl?: string;
  trimStartMs?: number;
  trimEndMs?: number;
  preview?: string;
}

interface AvailableClip {
  id: string;
  title?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}

interface ClipUploaderProps {
  segment: TemplateSegment;
  upload?: ClipUpload;
  existingClip?: ReelProjectClip;
  availableClips?: AvailableClip[];
  onFileSelect: (file: File) => void;
  onUrlInput: (url: string) => void;
}

export function ClipUploader({
  segment,
  upload,
  existingClip,
  availableClips,
  onFileSelect,
  onUrlInput,
}: ClipUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [showClipPicker, setShowClipPicker] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasContent = !!(upload?.file || upload?.sourceUrl || existingClip?.sourceUrl);
  const previewUrl = upload?.preview || upload?.sourceUrl || existingClip?.sourceUrl;

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleUrlSubmit = useCallback(() => {
    if (urlValue.trim()) {
      onUrlInput(urlValue.trim());
      setShowUrlInput(false);
      setUrlValue('');
    }
  }, [urlValue, onUrlInput]);

  const handleClipSelect = useCallback((clip: AvailableClip) => {
    onUrlInput(clip.url);
    setShowClipPicker(false);
  }, [onUrlInput]);

  return (
    <div className="bg-surface-secondary rounded-lg p-4">
      <div className="flex items-start gap-4">
        {/* Segment info */}
        <div className="flex-shrink-0 w-24">
          <div className="text-sm font-medium text-text-primary">{segment.label}</div>
          <div className="text-xs text-text-secondary mt-1">
            {formatDuration(segment.defaultDurationMs)}
          </div>
          {segment.textOverlay && (
            <div className="text-xs text-accent mt-1">+ overlay</div>
          )}
        </div>

        {/* Upload zone or preview */}
        <div className="flex-1">
          {hasContent ? (
            // Preview
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
              <video
                ref={videoRef}
                src={previewUrl}
                className="w-full h-full object-contain"
                muted
                playsInline
                onMouseEnter={() => videoRef.current?.play()}
                onMouseLeave={() => {
                  if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = 0;
                  }
                }}
              />

              {/* Replace button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="bg-white/20 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg">
                  Replace clip
                </span>
              </button>

              {/* File name */}
              {upload?.file && (
                <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded truncate">
                  {upload.file.name}
                </div>
              )}
            </div>
          ) : (
            // Upload zone
            <div
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                aspect-video border-2 border-dashed rounded-lg
                flex flex-col items-center justify-center gap-3
                transition-colors cursor-pointer
                ${isDragging
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg
                className="w-10 h-10 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="text-center">
                <p className="text-sm text-text-primary">
                  Drop video or <span className="text-accent">browse</span>
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  MP4, MOV, WebM up to 500MB
                </p>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Options when no content */}
          {!hasContent && (
            <div className="mt-2 space-y-2">
              {/* Available clips from content kit */}
              {availableClips && availableClips.length > 0 && (
                <div>
                  {showClipPicker ? (
                    <div className="bg-surface rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-text-primary">Select from Content Kit</span>
                        <button
                          onClick={() => setShowClipPicker(false)}
                          className="text-xs text-text-secondary hover:text-text-primary"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {availableClips.map((clip) => (
                          <button
                            key={clip.id}
                            onClick={() => handleClipSelect(clip)}
                            className="relative aspect-video rounded overflow-hidden border border-border hover:border-accent group"
                          >
                            {clip.thumbnailUrl ? (
                              <img
                                src={clip.thumbnailUrl}
                                alt={clip.title || 'Clip'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-2xl">
                                🎬
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs px-2 py-1 bg-accent rounded">Use clip</span>
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 text-white text-[10px] truncate bg-black/60 px-1 rounded">
                              {clip.title || 'Untitled'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClipPicker(true)}
                      className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 transition-colors bg-accent/10 px-3 py-1.5 rounded-full"
                    >
                      <span>📦</span>
                      <span>Select from Content Kit ({availableClips.length} clips)</span>
                    </button>
                  )}
                </div>
              )}

              {/* URL input toggle */}
              {showUrlInput ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="Paste video URL..."
                    className="flex-1 px-3 py-1.5 text-sm bg-surface border border-border rounded text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlValue.trim()}
                    className="px-3 py-1.5 text-sm bg-accent text-white rounded disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowUrlInput(false)}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowUrlInput(true)}
                  className="text-xs text-text-secondary hover:text-accent transition-colors"
                >
                  Or paste a video URL
                </button>
              )}
            </div>
          )}
        </div>

        {/* Segment description */}
        {segment.description && (
          <div className="hidden lg:block flex-shrink-0 w-48">
            <p className="text-xs text-text-secondary">{segment.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
