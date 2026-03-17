'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import type { CuratedAsset } from '@/types';

interface CuratedBRollPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function CuratedBRollPicker({ selectedIds, onSelectionChange }: CuratedBRollPickerProps) {
  const [clips, setClips] = useState<CuratedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const fetchClips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.curatedAssets.list({ type: 'b_roll', limit: 50 });
      if (response.success && response.data) {
        setClips(response.data);
      }
    } catch {
      // Empty state shown on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const categories = ['all', ...Array.from(new Set(clips.map((c) => c.category).filter(Boolean)))];

  const filteredClips = activeCategory === 'all'
    ? clips
    : clips.filter((c) => c.category === activeCategory);

  const handleSelect = (id: string) => {
    // Single selection — toggle or replace
    const next = selectedIds.includes(id) ? [] : [id];
    onSelectionChange(next);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="aspect-[9/16] bg-bg-secondary animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
        <p className="text-text-primary font-medium mb-1">No curated clips available</p>
        <p className="text-text-secondary text-sm max-w-xs">
          Check back soon — new B-roll is added monthly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      {categories.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-accent text-white'
                  : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Clip grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredClips.map((clip) => {
          const isSelected = selectedIds.includes(clip.id);
          const selIdx = selectedIds.indexOf(clip.id);

          return (
            <div
              key={clip.id}
              onClick={() => handleSelect(clip.id)}
              className={`
                bg-card rounded-xl border overflow-hidden cursor-pointer transition-all
                ${isSelected ? 'ring-2 ring-accent border-accent' : 'border-border hover:border-text-tertiary'}
              `}
            >
              <div className="aspect-[9/16] bg-bg-secondary relative">
                {clip.thumbnailUrl ? (
                  <img
                    src={clip.thumbnailUrl}
                    alt={clip.title}
                    className="w-full h-full object-cover"
                  />
                ) : clip.mediaUrl ? (
                  <video
                    src={clip.mediaUrl}
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Curated badge */}
                <span className="absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded font-medium bg-emerald-500/20 text-emerald-400">
                  Curated
                </span>

                {/* Selection badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-accent text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg">
                    {selIdx + 1}
                  </div>
                )}

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                  <p className="text-white text-xs font-medium truncate">{clip.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
