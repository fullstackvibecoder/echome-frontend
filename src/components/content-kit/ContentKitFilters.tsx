'use client';

/**
 * ContentKitFilters Component
 *
 * Tab-based filtering for content types.
 */

import { ContentKitFilter, ContentKitStats } from '@/types';

interface FilterTab {
  id: ContentKitFilter;
  label: string;
  icon: string;
  countKey: keyof ContentKitStats;
}

const FILTER_TABS: FilterTab[] = [
  { id: 'all', label: 'All Content', icon: '📦', countKey: 'total' },
  { id: 'videos', label: 'Videos', icon: '🎬', countKey: 'videos' },
  { id: 'written', label: 'Written', icon: '📝', countKey: 'written' },
  { id: 'carousels', label: 'Carousels', icon: '📸', countKey: 'carousels' },
];

interface ContentKitFiltersProps {
  activeFilter: ContentKitFilter;
  onFilterChange: (filter: ContentKitFilter) => void;
  stats: ContentKitStats;
}

export function ContentKitFilters({
  activeFilter,
  onFilterChange,
  stats,
}: ContentKitFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {FILTER_TABS.map((tab) => {
        const count = stats[tab.countKey];
        const isActive = activeFilter === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
              whitespace-nowrap transition-all
              ${isActive
                ? 'bg-accent text-white shadow-md'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {count > 0 && (
              <span
                className={`
                  px-1.5 py-0.5 rounded-full text-xs
                  ${isActive ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-text-secondary'}
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ContentKitFilters;
