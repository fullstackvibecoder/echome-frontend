'use client';

/**
 * Media Pool Component
 *
 * Displays uploaded media items with drag-to-reorder functionality.
 * Shows thumbnails, allows preview, and supports motion effect selection for images.
 */

import { useState, useCallback } from 'react';
import type { MotionEffect } from '@/types';
import type { MediaItem } from './MediaUploader';

interface MediaPoolProps {
  items: MediaItem[];
  onReorder: (items: MediaItem[]) => void;
  onRemove: (id: string) => void;
  onMotionEffectChange?: (id: string, effect: MotionEffect) => void;
  showMotionEffects?: boolean;
  className?: string;
}

const MOTION_EFFECTS: { value: MotionEffect; label: string; icon: string }[] = [
  { value: 'ken_burns', label: 'Ken Burns', icon: '↗' },
  { value: 'zoom_in', label: 'Zoom In', icon: '⊕' },
  { value: 'zoom_out', label: 'Zoom Out', icon: '⊖' },
  { value: 'pan', label: 'Pan', icon: '↔' },
  { value: 'pulse', label: 'Pulse', icon: '◉' },
  { value: 'static', label: 'Static', icon: '■' },
];

export function MediaPool({
  items,
  onReorder,
  onRemove,
  onMotionEffectChange,
  showMotionEffects = true,
  className = '',
}: MediaPoolProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = items.findIndex(i => i.id === draggedId);
    const targetIndex = items.findIndex(i => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    onReorder(newItems);
  }, [draggedId, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-text-primary">
          Your Media ({items.length})
        </h4>
        <p className="text-xs text-text-secondary">
          Drag to reorder
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragEnd={handleDragEnd}
            className={`
              relative aspect-[9/16] rounded-lg overflow-hidden cursor-grab
              transition-all group
              ${draggedId === item.id ? 'opacity-50 scale-95' : ''}
              ${item.status === 'error' ? 'ring-2 ring-red-500' : 'ring-1 ring-border hover:ring-accent'}
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
                <span className="text-3xl">
                  {item.type === 'video' ? '🎬' : '🖼'}
                </span>
              </div>
            )}

            {/* Order badge */}
            <div className="absolute top-2 left-2 bg-black/80 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg">
              {index + 1}
            </div>

            {/* Type & duration badges */}
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                item.type === 'video' ? 'bg-blue-500' : 'bg-green-500'
              } text-white shadow`}>
                {item.type === 'video' ? 'VID' : 'IMG'}
              </span>
              {item.type === 'video' && item.durationMs && (
                <span className="bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
                  {formatDuration(item.durationMs)}
                </span>
              )}
            </div>

            {/* Motion effect for images */}
            {item.type === 'image' && showMotionEffects && onMotionEffectChange && (
              <div className="absolute bottom-2 left-2 right-2">
                <select
                  value={item.motionEffect || 'ken_burns'}
                  onChange={(e) => onMotionEffectChange(item.id, e.target.value as MotionEffect)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-black/80 text-white text-[10px] px-2 py-1 rounded border-0 focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  {MOTION_EFFECTS.map(effect => (
                    <option key={effect.value} value={effect.value}>
                      {effect.icon} {effect.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setPreviewItem(item)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="bg-red-500/80 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Drag handle indicator */}
            <div className="absolute bottom-2 right-2 text-white/50 group-hover:text-white/80 transition-colors pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-2xl max-h-[80vh] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {previewItem.type === 'video' && previewItem.file ? (
              <video
                src={URL.createObjectURL(previewItem.file)}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-xl"
              />
            ) : previewItem.thumbnailUrl ? (
              <img
                src={previewItem.thumbnailUrl}
                alt="Preview"
                className="max-w-full max-h-[80vh] rounded-xl"
              />
            ) : null}

            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
