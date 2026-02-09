'use client';

/**
 * Media Uploader Component
 *
 * Universal drag-drop uploader that accepts both images and videos.
 * Supports multi-file upload and displays progress.
 */

import { useState, useRef, useCallback } from 'react';
import type { ReelMediaType, MotionEffect } from '@/types';

export interface MediaItem {
  id: string;
  file?: File;
  url?: string;
  type: ReelMediaType;
  thumbnailUrl?: string;
  durationMs?: number;
  motionEffect?: MotionEffect;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  progress?: number;
  error?: string;
}

interface MediaUploaderProps {
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  maxItems?: number;
  minItems?: number;
  acceptImages?: boolean;
  acceptVideos?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB

export function MediaUploader({
  items,
  onItemsChange,
  maxItems = 12,
  minItems = 1,
  acceptImages = true,
  acceptVideos = true,
  label = 'Add your clips & images',
  description,
  className = '',
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    ...(acceptVideos ? ACCEPTED_VIDEO_TYPES : []),
    ...(acceptImages ? ACCEPTED_IMAGE_TYPES : []),
  ];

  const generateId = () => `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getMediaType = (file: File): ReelMediaType => {
    return file.type.startsWith('video/') ? 'video' : 'image';
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${maxSize / 1024 / 1024}MB)`;
    }
    return null;
  };

  const createThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        // Video thumbnail from first frame
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.src = URL.createObjectURL(file);
        video.onloadeddata = () => {
          video.currentTime = 0.1;
        };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => {
          resolve('');
          URL.revokeObjectURL(video.src);
        };
      }
    });
  };

  const getVideoDuration = async (file: File): Promise<number | undefined> => {
    if (!file.type.startsWith('video/')) return undefined;
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration * 1000));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        resolve(undefined);
        URL.revokeObjectURL(video.src);
      };
    });
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const newItems: MediaItem[] = [];
    const remainingSlots = maxItems - items.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      const error = validateFile(file);

      if (error) {
        newItems.push({
          id: generateId(),
          file,
          type: getMediaType(file),
          status: 'error',
          error,
        });
        continue;
      }

      const thumbnail = await createThumbnail(file);
      const duration = await getVideoDuration(file);

      newItems.push({
        id: generateId(),
        file,
        type: getMediaType(file),
        thumbnailUrl: thumbnail,
        durationMs: duration,
        motionEffect: getMediaType(file) === 'image' ? 'ken_burns' : undefined,
        status: 'ready',
      });
    }

    onItemsChange([...items, ...newItems]);
  }, [items, maxItems, onItemsChange]);

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const removeItem = useCallback((id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  }, [items, onItemsChange]);

  const canAddMore = items.length < maxItems;
  const acceptString = acceptedTypes.join(',');

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-text-primary">{label}</h3>
          {description && (
            <p className="text-xs text-text-secondary mt-0.5">{description}</p>
          )}
        </div>
        <div className="text-xs text-text-secondary">
          {items.length}/{maxItems} items
          {minItems > 1 && items.length < minItems && (
            <span className="text-amber-500 ml-2">
              (min {minItems})
            </span>
          )}
        </div>
      </div>

      {/* Uploaded items grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`
                relative aspect-square rounded-lg overflow-hidden group
                ${item.status === 'error' ? 'ring-2 ring-red-500' : 'ring-1 ring-border'}
              `}
            >
              {/* Thumbnail */}
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-secondary flex items-center justify-center">
                  {item.type === 'video' ? (
                    <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              )}

              {/* Order badge */}
              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {index + 1}
              </div>

              {/* Type badge */}
              <div className={`absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded ${
                item.type === 'video' ? 'bg-blue-500/80' : 'bg-green-500/80'
              } text-white`}>
                {item.type === 'video' ? 'VID' : 'IMG'}
              </div>

              {/* Duration for videos */}
              {item.type === 'video' && item.durationMs && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {formatDuration(item.durationMs)}
                </div>
              )}

              {/* Error state */}
              {item.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center p-2">
                  <span className="text-white text-[10px] text-center">{item.error}</span>
                </div>
              )}

              {/* Delete button */}
              <button
                onClick={() => removeItem(item.id)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="bg-red-500 text-white rounded-full p-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-6
            flex flex-col items-center justify-center gap-3
            transition-all cursor-pointer
            ${isDragging
              ? 'border-accent bg-accent/10 scale-[1.02]'
              : 'border-border hover:border-accent/50 hover:bg-surface-secondary'
            }
            ${items.length === 0 ? 'min-h-[200px]' : 'min-h-[100px]'}
          `}
        >
          <div className={`
            rounded-full p-3
            ${isDragging ? 'bg-accent/20' : 'bg-surface-secondary'}
          `}>
            <svg
              className={`w-6 h-6 ${isDragging ? 'text-accent' : 'text-text-secondary'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-sm text-text-primary">
              {items.length === 0 ? 'Drop files or ' : 'Add more: '}
              <span className="text-accent">browse</span>
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {acceptVideos && acceptImages && 'Videos (MP4, MOV) and images (JPG, PNG, WebP)'}
              {acceptVideos && !acceptImages && 'Videos: MP4, MOV, WebM'}
              {!acceptVideos && acceptImages && 'Images: JPG, PNG, WebP'}
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
