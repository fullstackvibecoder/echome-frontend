'use client';

/**
 * Beat Sync Arranger Component
 *
 * For music-driven content. Upload any mix of images/videos,
 * and they get auto-distributed across beat segments.
 */

import { MediaUploader, type MediaItem } from './MediaUploader';
import { MediaPool } from './MediaPool';
import type { MotionEffect } from '@/types';

interface BeatSyncArrangerProps {
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  tempo?: number;
  beatCount?: number;
}

export function BeatSyncArranger({
  items,
  onItemsChange,
  tempo,
  beatCount,
}: BeatSyncArrangerProps) {
  const handleReorder = (newItems: MediaItem[]) => {
    onItemsChange(newItems);
  };

  const handleRemove = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handleMotionEffectChange = (id: string, effect: MotionEffect) => {
    onItemsChange(items.map(item =>
      item.id === id ? { ...item, motionEffect: effect } : item
    ));
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🎵</div>
          <div>
            <h3 className="font-medium text-text-primary">Beat Sync Mode</h3>
            <p className="text-sm text-text-secondary mt-1">
              Upload your clips and images. Each asset becomes one beat segment.
              Cuts will automatically land on the music's downbeats.
              {tempo && ` (${Math.round(tempo)} BPM)`}
            </p>
            {beatCount && items.length > 0 && (
              <p className="text-xs text-accent mt-2">
                {items.length} assets → {Math.min(items.length, beatCount)} beat segments
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <MediaUploader
        items={items}
        onItemsChange={onItemsChange}
        maxItems={50}
        minItems={1}
        acceptImages={true}
        acceptVideos={true}
        label="Add your clips & images"
        description="Mix videos and images freely. Each becomes a beat segment."
      />

      {/* Media pool with reordering */}
      {items.length > 0 && (
        <MediaPool
          items={items}
          onReorder={handleReorder}
          onRemove={handleRemove}
          onMotionEffectChange={handleMotionEffectChange}
          showMotionEffects={true}
        />
      )}

      {/* How it works */}
      {items.length > 0 && (
        <div className="bg-surface-secondary rounded-lg p-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">How your reel will flow:</h4>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium ${
                    item.type === 'video' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-[10px] text-text-secondary mt-1">
                    {item.type === 'video' ? 'VID' : 'IMG'}
                  </span>
                </div>
                {index < items.length - 1 && (
                  <div className="flex items-center gap-1 text-text-secondary">
                    <div className="w-4 h-0.5 bg-accent/50"></div>
                    <span className="text-[10px]">beat</span>
                    <div className="w-4 h-0.5 bg-accent/50"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
