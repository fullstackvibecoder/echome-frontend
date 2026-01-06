/**
 * Grouping Utilities
 *
 * Functions for grouping, sorting, and filtering content items
 * in the Content Library.
 */

import type { NormalizedContent, ContentType, DisplayStatus } from './content-normalizer';
import type {
  GroupBy,
  SortBy,
  FilterPreset,
  ContentGroup,
  DateGroupId,
} from '@/components/content-library/types';
import type { Platform } from '@/types';

// ============================================
// DATE GROUPING
// ============================================

const DATE_GROUP_ORDER: DateGroupId[] = ['today', 'yesterday', 'this-week', 'this-month', 'older'];

const DATE_GROUP_LABELS: Record<DateGroupId, string> = {
  'today': 'Today',
  'yesterday': 'Yesterday',
  'this-week': 'This Week',
  'this-month': 'This Month',
  'older': 'Older',
};

function getDateGroupId(date: Date): DateGroupId {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - startOfToday.getDay() * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOfWeek) return 'this-week';
  if (date >= startOfMonth) return 'this-month';
  return 'older';
}

export function groupByDate(items: NormalizedContent[]): ContentGroup[] {
  const groups: Map<DateGroupId, NormalizedContent[]> = new Map();

  // Initialize all groups
  DATE_GROUP_ORDER.forEach(id => groups.set(id, []));

  // Distribute items into groups
  items.forEach(item => {
    const groupId = getDateGroupId(item.createdAt);
    groups.get(groupId)!.push(item);
  });

  // Build result, filtering out empty groups
  return DATE_GROUP_ORDER
    .filter(id => groups.get(id)!.length > 0)
    .map(id => ({
      id,
      title: DATE_GROUP_LABELS[id],
      items: groups.get(id)!,
      collapsed: false,
    }));
}

// ============================================
// STATUS GROUPING
// ============================================

const STATUS_ORDER: DisplayStatus[] = ['processing', 'pending', 'completed', 'failed'];

const STATUS_LABELS: Record<DisplayStatus, string> = {
  processing: 'Processing',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
};

export function groupByStatus(items: NormalizedContent[]): ContentGroup[] {
  const groups: Map<DisplayStatus, NormalizedContent[]> = new Map();

  // Initialize all groups
  STATUS_ORDER.forEach(status => groups.set(status, []));

  // Distribute items into groups
  items.forEach(item => {
    groups.get(item.status)!.push(item);
  });

  // Build result, filtering out empty groups
  return STATUS_ORDER
    .filter(status => groups.get(status)!.length > 0)
    .map(status => ({
      id: status,
      title: STATUS_LABELS[status],
      items: groups.get(status)!,
      collapsed: false,
    }));
}

// ============================================
// TYPE GROUPING
// ============================================

const TYPE_ORDER: ContentType[] = ['clip', 'video-upload', 'generated', 'carousel', 'kit'];

const TYPE_LABELS: Record<ContentType, string> = {
  clip: 'Video Clips',
  'video-upload': 'Video Uploads',
  generated: 'Generated Content',
  carousel: 'Carousels',
  kit: 'Content Kits',
};

export function groupByType(items: NormalizedContent[]): ContentGroup[] {
  const groups: Map<ContentType, NormalizedContent[]> = new Map();

  // Initialize all groups
  TYPE_ORDER.forEach(type => groups.set(type, []));

  // Distribute items into groups
  items.forEach(item => {
    groups.get(item.type)!.push(item);
  });

  // Build result, filtering out empty groups
  return TYPE_ORDER
    .filter(type => groups.get(type)!.length > 0)
    .map(type => ({
      id: type,
      title: TYPE_LABELS[type],
      items: groups.get(type)!,
      collapsed: false,
    }));
}

// ============================================
// PLATFORM GROUPING
// ============================================

const PLATFORM_ORDER: Platform[] = ['linkedin', 'twitter', 'instagram', 'tiktok', 'youtube', 'blog', 'email', 'video-script'];

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  blog: 'Blog Posts',
  email: 'Newsletters',
  'video-script': 'Video Scripts',
};

export function groupByPlatform(items: NormalizedContent[]): ContentGroup[] {
  const groups: Map<Platform | 'none', NormalizedContent[]> = new Map();
  groups.set('none', []); // For items with no platform

  // Initialize platform groups
  PLATFORM_ORDER.forEach(platform => groups.set(platform, []));

  // Distribute items into groups by primary platform
  items.forEach(item => {
    const primaryPlatform = item.platforms[0];
    if (primaryPlatform && groups.has(primaryPlatform)) {
      groups.get(primaryPlatform)!.push(item);
    } else {
      groups.get('none')!.push(item);
    }
  });

  // Build result, filtering out empty groups
  const result: ContentGroup[] = PLATFORM_ORDER
    .filter(platform => groups.get(platform)!.length > 0)
    .map(platform => ({
      id: platform,
      title: PLATFORM_LABELS[platform],
      items: groups.get(platform)!,
      collapsed: false,
    }));

  // Add "No Platform" group if non-empty
  if (groups.get('none')!.length > 0) {
    result.push({
      id: 'none',
      title: 'No Platform',
      items: groups.get('none')!,
      collapsed: false,
    });
  }

  return result;
}

// ============================================
// MAIN GROUPING FUNCTION
// ============================================

export function groupItems(items: NormalizedContent[], groupBy: GroupBy): ContentGroup[] {
  switch (groupBy) {
    case 'date':
      return groupByDate(items);
    case 'status':
      return groupByStatus(items);
    case 'type':
      return groupByType(items);
    case 'platform':
      return groupByPlatform(items);
    case 'none':
    default:
      return [{
        id: 'all',
        title: 'All Content',
        items,
        collapsed: false,
      }];
  }
}

// ============================================
// SORTING
// ============================================

export function sortItems(items: NormalizedContent[], sortBy: SortBy): NormalizedContent[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'recent':
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    case 'oldest':
      sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case 'voice-score':
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      break;
    case 'status':
      const statusOrder: Record<DisplayStatus, number> = {
        processing: 0,
        pending: 1,
        completed: 2,
        failed: 3,
      };
      sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      break;
  }

  return sorted;
}

// ============================================
// FILTERING
// ============================================

export function filterItems(
  items: NormalizedContent[],
  filters: FilterPreset[],
  searchQuery: string
): NormalizedContent[] {
  let filtered = items;

  // If 'all' is selected or no filters, skip type filtering
  const hasTypeFilter = filters.length > 0 && !filters.includes('all');

  if (hasTypeFilter) {
    filtered = filtered.filter(item => {
      // Check each filter
      for (const filter of filters) {
        switch (filter) {
          case 'videos':
            if (item.type === 'clip' || item.type === 'video-upload') return true;
            break;
          case 'written':
            if (item.type === 'generated' || item.type === 'kit') return true;
            break;
          case 'carousels':
            if (item.type === 'carousel') return true;
            break;
          case 'processing':
            if (item.status === 'processing' || item.status === 'pending') return true;
            break;
        }
      }
      return false;
    });
  }

  // Apply search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(item => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.previewText?.toLowerCase().includes(query) ||
        item.platforms.some(p => p.toLowerCase().includes(query))
      );
    });
  }

  return filtered;
}

// ============================================
// COMBINED PROCESSING
// ============================================

/**
 * Apply filtering, sorting, and grouping to items
 */
export function processItems(
  items: NormalizedContent[],
  filters: FilterPreset[],
  searchQuery: string,
  sortBy: SortBy,
  groupBy: GroupBy
): { items: NormalizedContent[]; groups: ContentGroup[] } {
  // 1. Filter
  let processed = filterItems(items, filters, searchQuery);

  // 2. Sort
  processed = sortItems(processed, sortBy);

  // 3. Group
  const groups = groupItems(processed, groupBy);

  return { items: processed, groups };
}

// ============================================
// STATS CALCULATION
// ============================================

export function calculateStats(items: NormalizedContent[]) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    total: items.length,
    videos: items.filter(i => i.type === 'clip' || i.type === 'video-upload').length,
    written: items.filter(i => i.type === 'generated' || i.type === 'kit').length,
    carousels: items.filter(i => i.type === 'carousel').length,
    processing: items.filter(i => i.status === 'processing' || i.status === 'pending').length,
    failed: items.filter(i => i.status === 'failed').length,
    thisWeek: items.filter(i => i.createdAt >= weekAgo).length,
  };
}
