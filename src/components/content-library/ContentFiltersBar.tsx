'use client';

/**
 * ContentFiltersBar Component
 *
 * Search, filtering, sorting, and view toggle controls for the Content Library.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ContentFiltersBarProps,
  ViewMode,
  GroupBy,
  SortBy,
  FilterPreset,
  FILTER_PRESET_CONFIG,
  GROUP_BY_CONFIG,
  SORT_BY_CONFIG,
} from './types';

// Config moved to component for tree shaking
const FILTER_PRESETS: Record<FilterPreset, { label: string; icon?: string }> = {
  all: { label: 'All' },
  videos: { label: 'Videos', icon: '🎬' },
  written: { label: 'Written', icon: '📝' },
  carousels: { label: 'Carousels', icon: '📸' },
  processing: { label: 'Processing', icon: '⏳' },
  failed: { label: 'Failed', icon: '❌' },
};

const GROUP_OPTIONS: Record<GroupBy, { label: string }> = {
  none: { label: 'None' },
  date: { label: 'Date' },
  platform: { label: 'Platform' },
  status: { label: 'Status' },
  type: { label: 'Type' },
};

const SORT_OPTIONS: Record<SortBy, { label: string }> = {
  recent: { label: 'Most Recent' },
  oldest: { label: 'Oldest First' },
  'voice-score': { label: 'Voice Score' },
  status: { label: 'Status' },
};

export function ContentFiltersBar({
  viewMode,
  groupBy,
  sortBy,
  searchQuery,
  activeFilters,
  onViewModeChange,
  onGroupByChange,
  onSortByChange,
  onSearchChange,
  onFilterChange,
}: ContentFiltersBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localSearch, onSearchChange]);

  const handleFilterClick = (filter: FilterPreset) => {
    if (filter === 'all') {
      onFilterChange(['all']);
      return;
    }

    const newFilters = [...activeFilters].filter(f => f !== 'all');

    if (newFilters.includes(filter)) {
      const updated = newFilters.filter(f => f !== filter);
      onFilterChange(updated.length ? updated : ['all']);
    } else {
      onFilterChange([...newFilters, filter]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Row: Search, Group, Sort, View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search content..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            🔍
          </span>
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              ✕
            </button>
          )}
        </div>

        {/* Group By Dropdown */}
        <Dropdown
          label="Group"
          value={groupBy}
          options={GROUP_OPTIONS}
          onChange={onGroupByChange}
        />

        {/* Sort By Dropdown */}
        <Dropdown
          label="Sort"
          value={sortBy}
          options={SORT_OPTIONS}
          onChange={onSortByChange}
        />

        {/* View Toggle */}
        <div className="flex bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-2.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
            title="List View"
          >
            <ListIcon />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-2.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
            }`}
            title="Grid View"
          >
            <GridIcon />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_PRESETS) as FilterPreset[]).map((filter) => {
          const config = FILTER_PRESETS[filter];
          const isActive = activeFilters.includes(filter);

          return (
            <button
              key={filter}
              onClick={() => handleFilterClick(filter)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border'
              }`}
            >
              {config.icon && <span className="mr-1">{config.icon}</span>}
              {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// DROPDOWN COMPONENT
// ============================================

interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options: Record<T, { label: string }>;
  onChange: (value: T) => void;
}

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-tertiary transition-colors min-w-[140px]"
      >
        <span className="text-text-tertiary text-sm">{label}:</span>
        <span className="flex-1 text-left">{options[value].label}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-bg-secondary border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {(Object.keys(options) as T[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                onChange(key);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left hover:bg-bg-tertiary transition-colors ${
                key === value ? 'bg-accent/10 text-accent' : 'text-text-primary'
              }`}
            >
              {options[key].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// ICONS
// ============================================

function ListIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default ContentFiltersBar;
