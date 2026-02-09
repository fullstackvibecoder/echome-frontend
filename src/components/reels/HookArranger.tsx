'use client';

/**
 * Hook Arranger Component
 *
 * Three labeled zones for attention-grabbing content:
 * Hook (grab attention) -> Main (your message) -> CTA (what's next)
 */

import { useState, useRef, useCallback } from 'react';
import type { ReelMediaType, MotionEffect } from '@/types';
import type { MediaItem } from './MediaUploader';

interface HookArrangerProps {
  hookItem: MediaItem | null;
  mainItem: MediaItem | null;
  ctaItem: MediaItem | null;
  onHookChange: (item: MediaItem | null) => void;
  onMainChange: (item: MediaItem | null) => void;
  onCtaChange: (item: MediaItem | null) => void;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ZoneConfig {
  key: 'hook' | 'main' | 'cta';
  icon: string;
  label: string;
  sublabel: string;
  duration: string;
  color: string;
  bgGradient: string;
}

const ZONES: ZoneConfig[] = [
  {
    key: 'hook',
    icon: '🎯',
    label: 'Hook',
    sublabel: 'Grab attention in the first 2 seconds',
    duration: '2s',
    color: 'text-red-400',
    bgGradient: 'from-red-500/10 to-orange-500/10',
  },
  {
    key: 'main',
    icon: '💡',
    label: 'Main Content',
    sublabel: 'Deliver your core message',
    duration: '3-4s',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    key: 'cta',
    icon: '👉',
    label: 'Call to Action',
    sublabel: 'Tell them what to do next',
    duration: '2s',
    color: 'text-green-400',
    bgGradient: 'from-green-500/10 to-emerald-500/10',
  },
];

export function HookArranger({
  hookItem,
  mainItem,
  ctaItem,
  onHookChange,
  onMainChange,
  onCtaChange,
}: HookArrangerProps) {
  const items = { hook: hookItem, main: mainItem, cta: ctaItem };
  const handlers = { hook: onHookChange, main: onMainChange, cta: onCtaChange };

  const filledCount = [hookItem, mainItem, ctaItem].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎬</div>
          <div>
            <h3 className="font-medium text-text-primary">Quick Hook Format</h3>
            <p className="text-sm text-text-secondary mt-1">
              The proven 3-part structure for attention-grabbing reels.
              Perfect for product reveals, announcements, and quick wins.
            </p>
          </div>
        </div>
      </div>

      {/* Three zones stacked */}
      <div className="space-y-4">
        {ZONES.map((zone) => (
          <SingleZone
            key={zone.key}
            config={zone}
            item={items[zone.key]}
            onChange={handlers[zone.key]}
          />
        ))}
      </div>

      {/* Timeline preview */}
      {filledCount > 0 && (
        <div className="bg-surface-secondary rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">Your reel timeline:</h4>
          <div className="flex items-center gap-2">
            {ZONES.map((zone, index) => (
              <div key={zone.key} className="flex items-center gap-2 flex-1">
                <div className={`
                  flex-1 py-3 px-4 rounded-lg text-center text-sm
                  ${items[zone.key] ? `bg-gradient-to-r ${zone.bgGradient} ${zone.color}` : 'bg-surface text-text-secondary'}
                `}>
                  <div className="font-medium">{zone.icon} {zone.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{zone.duration}</div>
                </div>
                {index < ZONES.length - 1 && (
                  <svg className="w-5 h-5 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Single zone component
interface SingleZoneProps {
  config: ZoneConfig;
  item: MediaItem | null;
  onChange: (item: MediaItem | null) => void;
}

function SingleZone({ config, item, onChange }: SingleZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFile = useCallback(async (file: File) => {
    const type = getMediaType(file);
    const thumbnail = await createThumbnail(file);

    onChange({
      id: generateId(),
      file,
      type,
      thumbnailUrl: thumbnail,
      motionEffect: type === 'image' ? 'zoom_in' : undefined, // Zoom punch for hooks
      status: 'ready',
    });
  }, [onChange]);

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
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className={`bg-gradient-to-r ${config.bgGradient} rounded-xl border border-white/10 overflow-hidden`}>
      <div className="flex items-stretch">
        {/* Label section */}
        <div className="flex-shrink-0 w-40 p-4 border-r border-white/10 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">{config.icon}</span>
            <span className={`font-semibold ${config.color}`}>{config.label}</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">{config.sublabel}</p>
          <div className="mt-2 text-xs text-text-secondary">
            Duration: <span className="text-text-primary">{config.duration}</span>
          </div>
        </div>

        {/* Upload zone */}
        <div className="flex-1 p-4">
          {item ? (
            <div className="relative aspect-video rounded-lg overflow-hidden group">
              {item.thumbnailUrl ? (
                <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-secondary flex items-center justify-center text-3xl">
                  {item.type === 'video' ? '🎬' : '🖼'}
                </div>
              )}

              {/* Type badge */}
              <div className={`absolute top-2 right-2 ${item.type === 'video' ? 'bg-blue-500' : 'bg-green-500'} text-white text-xs px-2 py-0.5 rounded`}>
                {item.type === 'video' ? 'VIDEO' : 'IMAGE'}
              </div>

              {/* Replace/Remove overlay */}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
                >
                  Replace
                </button>
                <button
                  onClick={() => onChange(null)}
                  className="bg-red-500/80 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                aspect-video border-2 border-dashed rounded-lg
                flex flex-col items-center justify-center gap-2
                transition-all cursor-pointer
                ${isDragging
                  ? 'border-accent bg-accent/10 scale-[1.02]'
                  : 'border-border hover:border-accent/50'
                }
              `}
            >
              <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-text-secondary">
                Drop or <span className="text-accent">browse</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ACCEPTED_VIDEO_TYPES, ...ACCEPTED_IMAGE_TYPES].join(',')}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}
