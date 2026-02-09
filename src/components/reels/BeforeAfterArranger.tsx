'use client';

/**
 * Before/After Arranger Component
 *
 * Two drop zones for transformation-style content.
 * Each zone accepts 1-6 images OR 1 video.
 */

import { useState, useRef, useCallback } from 'react';
import type { ReelMediaType, MotionEffect } from '@/types';
import type { MediaItem } from './MediaUploader';

interface BeforeAfterArrangerProps {
  beforeItems: MediaItem[];
  afterItems: MediaItem[];
  onBeforeChange: (items: MediaItem[]) => void;
  onAfterChange: (items: MediaItem[]) => void;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function BeforeAfterArranger({
  beforeItems,
  afterItems,
  onBeforeChange,
  onAfterChange,
}: BeforeAfterArrangerProps) {
  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div>
            <h3 className="font-medium text-text-primary">Before/After Reveal</h3>
            <p className="text-sm text-text-secondary mt-1">
              Perfect for transformations, makeovers, and results.
              Add as many images as you want - they'll be distributed across the music.
            </p>
          </div>
        </div>
      </div>

      {/* Two zones side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        <DropZone
          label="BEFORE"
          sublabel="The starting point"
          items={beforeItems}
          onChange={onBeforeChange}
          accentColor="orange"
        />
        <DropZone
          label="AFTER"
          sublabel="The transformation"
          items={afterItems}
          onChange={onAfterChange}
          accentColor="green"
        />
      </div>

      {/* Preview indicator */}
      {(beforeItems.length > 0 || afterItems.length > 0) && (
        <div className="bg-surface-secondary rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">Reel preview:</h4>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`px-4 py-2 rounded-lg ${beforeItems.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-surface text-text-secondary'}`}>
                BEFORE ({beforeItems.length})
              </div>
              <span className="text-text-secondary">~3s</span>
            </div>
            <div className="flex items-center gap-2 text-accent">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <span className="text-xs">flash</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-4 py-2 rounded-lg ${afterItems.length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-surface text-text-secondary'}`}>
                AFTER ({afterItems.length})
              </div>
              <span className="text-text-secondary">~3s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Internal drop zone component
interface DropZoneProps {
  label: string;
  sublabel: string;
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  accentColor: 'orange' | 'green';
}

function DropZone({ label, sublabel, items, onChange, accentColor }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorClasses = {
    orange: {
      bg: 'from-orange-500/5 to-orange-600/10',
      border: 'border-orange-500/30',
      borderHover: 'hover:border-orange-500/50',
      borderActive: 'border-orange-500',
      text: 'text-orange-400',
      badge: 'bg-orange-500',
    },
    green: {
      bg: 'from-green-500/5 to-green-600/10',
      border: 'border-green-500/30',
      borderHover: 'hover:border-green-500/50',
      borderActive: 'border-green-500',
      text: 'text-green-400',
      badge: 'bg-green-500',
    },
  }[accentColor];

  const generateId = () => `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getMediaType = (file: File): ReelMediaType => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  const createThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = URL.createObjectURL(file);
        video.onloadeddata = () => { video.currentTime = 0.1; };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d')?.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => { resolve(''); URL.revokeObjectURL(video.src); };
      }
    });
  };

  const handleFiles = useCallback(async (files: FileList) => {
    // Check if zone already has a video
    const hasVideo = items.some(i => i.type === 'video');
    const newFiles = Array.from(files);
    const hasNewVideo = newFiles.some(f => f.type.startsWith('video/'));

    // Can mix images with a video, but only 1 video per zone
    if (hasVideo && hasNewVideo) {
      alert('Only 1 video allowed per zone. Remove the existing video first.');
      return;
    }

    // No hard limit on images - they distribute across the music duration
    const newItems: MediaItem[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const type = getMediaType(file);

      // Skip additional videos if zone already has one
      if (type === 'video' && (hasVideo || newItems.some(n => n.type === 'video'))) {
        continue;
      }

      const thumbnail = await createThumbnail(file);
      newItems.push({
        id: generateId(),
        file,
        type,
        thumbnailUrl: thumbnail,
        motionEffect: type === 'image' ? 'ken_burns' : undefined,
        status: 'ready',
      });
    }

    onChange([...items, ...newItems]);
  }, [items, onChange]);

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
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleRemove = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  // Can always add more images, or add a video if none exists
  const hasVideo = items.some(i => i.type === 'video');
  const canAddMore = !hasVideo || items.every(i => i.type === 'image');

  return (
    <div className={`bg-gradient-to-b ${colorClasses.bg} rounded-xl p-4 border ${colorClasses.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-lg font-bold ${colorClasses.text}`}>{label}</h3>
          <p className="text-xs text-text-secondary">{sublabel}</p>
        </div>
        <span className="text-xs text-text-secondary">
          {items.length > 0
            ? items.some(i => i.type === 'video')
              ? `${items.filter(i => i.type === 'video').length} video, ${items.filter(i => i.type === 'image').length} images`
              : `${items.length} images`
            : 'Add images or 1 video'
          }
        </span>
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <div className="space-y-3">
          {/* Thumbnails */}
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-lg overflow-hidden group ring-1 ring-border"
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-2xl">
                    {item.type === 'video' ? '🎬' : '🖼'}
                  </div>
                )}

                {/* Type badge */}
                <div className={`absolute top-1 right-1 ${colorClasses.badge} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                  {item.type === 'video' ? 'VID' : 'IMG'}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="bg-red-500 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </button>
              </div>
            ))}

            {/* Add more button (if images and < 3) */}
            {canAddMore && items.length > 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-square rounded-lg border-2 border-dashed ${colorClasses.border} ${colorClasses.borderHover} flex items-center justify-center transition-colors`}
              >
                <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty drop zone */
        <div
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            aspect-[4/5] border-2 border-dashed rounded-xl
            flex flex-col items-center justify-center gap-3
            transition-all cursor-pointer
            ${isDragging
              ? `${colorClasses.borderActive} bg-white/5 scale-[1.02]`
              : `${colorClasses.border} ${colorClasses.borderHover}`
            }
          `}
        >
          <div className={`w-12 h-12 rounded-full ${isDragging ? colorClasses.badge : 'bg-surface-secondary'} flex items-center justify-center`}>
            <svg className={`w-6 h-6 ${isDragging ? 'text-white' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center px-4">
            <p className={`text-sm ${isDragging ? colorClasses.text : 'text-text-primary'}`}>
              Drop {label.toLowerCase()} content
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Any number of images or 1 video
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_IMAGE_TYPES].join(',')}
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
