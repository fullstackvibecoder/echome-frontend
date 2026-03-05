'use client';

import { ContentSourceType, CONTENT_SOURCE_CONFIG } from '@/types';

const SOURCE_ICONS: Record<string, string> = {
  file_upload: '📄',
  paste_text: '✍️',
  paste_social: '📱',
  paste_email: '📧',
  voice_recording: '🎤',
  mbox_import: '📥',
  youtube_import: '🎬',
  instagram_import: '📸',
  blog_import: '🌐',
  generation: '✨',
  'clip-finder': '🎥',
};

interface KBSourceFilterChipsProps {
  availableTypes: { type: ContentSourceType; count: number }[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  totalCount: number;
}

export function KBSourceFilterChips({
  availableTypes,
  activeFilter,
  onFilterChange,
  totalCount,
}: KBSourceFilterChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {/* All chip */}
      <button
        onClick={() => onFilterChange('all')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
          whitespace-nowrap transition-all shrink-0
          ${activeFilter === 'all'
            ? 'bg-accent text-white shadow-md'
            : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
          }
        `}
      >
        All
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
          activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-text-secondary'
        }`}>
          {totalCount}
        </span>
      </button>

      {availableTypes.map(({ type, count }) => {
        const config = CONTENT_SOURCE_CONFIG[type];
        const icon = SOURCE_ICONS[type] || '📄';
        const isActive = activeFilter === type;

        return (
          <button
            key={type}
            onClick={() => onFilterChange(type)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              whitespace-nowrap transition-all shrink-0
              ${isActive
                ? 'bg-accent text-white shadow-md'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }
            `}
          >
            <span className="text-xs">{icon}</span>
            <span>{config?.label || type}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              isActive ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-text-secondary'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
