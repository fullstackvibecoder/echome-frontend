'use client';

import { useRef, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';

interface BRollClip {
  id: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  label?: string;
}

interface BRollStripProps {
  clips: BRollClip[];
  categories: string[];
  selectedClipId: string | null;
  onSelect: (clipId: string) => void;
  /** Default category tab. Defaults to 'realestate' if available, else 'All'. */
  defaultCategory?: string;
  onUpload?: (file: File) => void;
  uploading?: boolean;
}

export function BRollStrip({
  clips,
  categories,
  selectedClipId,
  onSelect,
  defaultCategory,
  onUpload,
  uploading,
}: BRollStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };
  const [activeCategory, setActiveCategory] = useState<string>(
    defaultCategory || (categories.includes('realestate') ? 'realestate' : 'All')
  );

  const filteredClips =
    activeCategory === 'All'
      ? clips
      : clips.filter((clip) => clip.category === activeCategory);

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveCategory('All')}
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            activeCategory === 'All'
              ? 'bg-primary-interactive text-white'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-primary-interactive text-white'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Clip thumbnails */}
      {filteredClips.length === 0 && !onUpload ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No clips in this category
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {onUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-primary-interactive/40 text-primary-interactive/60 transition-colors hover:border-primary-interactive hover:text-primary-interactive disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </button>
            </>
          )}
          {filteredClips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              onClick={() => onSelect(clip.id)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-opacity hover:opacity-80 ${
                selectedClipId === clip.id
                  ? 'ring-2 ring-primary-interactive'
                  : ''
              }`}
              title={clip.label ?? clip.category}
            >
              <img
                src={clip.thumbnailUrl}
                alt={clip.label ?? clip.category}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
