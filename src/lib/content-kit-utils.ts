/**
 * Content Kit Utilities
 * Transform and normalize data from different sources into unified format
 */

import type {
  GenerationRequest,
  UnifiedContentItem,
  ContentKitType,
  ContentKitStats,
  Platform,
} from '@/types';
import type { VideoUpload, ContentKit } from './api-client';

/**
 * Determine content type based on what's available
 */
export function determineContentType(
  clipCount: number,
  platformCount: number,
  carouselCount: number
): ContentKitType {
  const hasVideo = clipCount > 0;
  const hasWritten = platformCount > 0;
  const hasCarousel = carouselCount > 0;

  if (hasVideo && hasWritten) return 'mixed';
  if (hasVideo) return 'video';
  if (hasCarousel) return 'carousel';
  return 'text';
}

/**
 * Generate a clean title from input text or filename
 */
export function generateTitle(text?: string, filename?: string): string {
  if (filename) {
    // Remove file extension and clean up
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .trim();
  }

  if (text) {
    // Clean up transcript-based titles
    if (text.startsWith('Create content based on this video transcript:')) {
      return 'Video Content Kit';
    }
    // Truncate long text
    return text.length > 60 ? text.slice(0, 57) + '...' : text;
  }

  return 'Untitled Content';
}

/**
 * Count platforms with content in a ContentKit
 */
export function countPlatformContent(kit?: ContentKit | null): number {
  if (!kit) return 0;
  let count = 0;
  if (kit.contentLinkedin) count++;
  if (kit.contentTwitter) count++;
  if (kit.contentInstagram) count++;
  if (kit.contentTiktok) count++;
  if (kit.contentBlog) count++;
  if (kit.contentEmail) count++;
  if (kit.contentYoutube) count++;
  if (kit.contentVideoScript) count++;
  return count;
}

/**
 * Get platforms that have content
 */
export function getPlatformsFromContentKit(kit?: ContentKit | null): Platform[] {
  if (!kit) return [];
  const platforms: Platform[] = [];
  if (kit.contentLinkedin) platforms.push('linkedin');
  if (kit.contentTwitter) platforms.push('twitter');
  if (kit.contentInstagram) platforms.push('instagram');
  if (kit.contentTiktok) platforms.push('tiktok');
  if (kit.contentBlog) platforms.push('blog');
  if (kit.contentEmail) platforms.push('email');
  if (kit.contentYoutube) platforms.push('youtube');
  if (kit.contentVideoScript) platforms.push('video-script');
  return platforms;
}

/**
 * Transform a GenerationRequest into UnifiedContentItem
 */
export function transformGenerationRequest(
  req: GenerationRequest
): UnifiedContentItem {
  const platforms = req.platforms || [];

  return {
    id: req.id,
    type: determineContentType(0, platforms.length, 0),
    title: generateTitle(req.inputText),
    sourceType: 'generation',
    generationRequestId: req.id,
    clipCount: 0,
    platformCount: platforms.length,
    carouselSlideCount: 0,
    platforms,
    voiceScore: req.voiceScore,
    qualityScore: req.qualityScore,
    status: req.status,
    createdAt: typeof req.createdAt === 'string' ? req.createdAt : req.createdAt.toISOString(),
    inputType: req.inputType,
    previewText: req.inputText?.slice(0, 150),
  };
}

/**
 * Transform a VideoUpload into UnifiedContentItem
 */
export function transformVideoUpload(
  upload: VideoUpload,
  contentKit?: ContentKit | null,
  clipCount: number = 0
): UnifiedContentItem {
  const platformCount = countPlatformContent(contentKit);
  const platforms = getPlatformsFromContentKit(contentKit);

  return {
    id: upload.id,
    type: determineContentType(clipCount, platformCount, 0),
    title: contentKit?.title || generateTitle(undefined, upload.originalFilename),
    description: contentKit?.description,
    sourceType: 'clip-finder',
    videoUploadId: upload.id,
    generationRequestId: contentKit?.generationRequestId,
    clipCount,
    platformCount,
    carouselSlideCount: 0,
    thumbnailUrl: upload.thumbnailUrl,
    platforms,
    status: upload.status as UnifiedContentItem['status'],
    progressPercent: upload.progressPercent,
    statusMessage: upload.statusMessage,
    createdAt: upload.createdAt,
    inputType: 'video',
    previewText: contentKit?.contentLinkedin?.slice(0, 150) ||
                 contentKit?.contentTwitter?.slice(0, 150),
  };
}

/**
 * Calculate stats from unified items
 */
export function calculateStats(items: UnifiedContentItem[]): ContentKitStats {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    total: items.length,
    videos: items.filter(i => i.type === 'video' || i.type === 'mixed').length,
    written: items.filter(i => i.type === 'text').length,
    carousels: items.filter(i => i.carouselSlideCount > 0).length,
    processing: items.filter(i => i.status === 'processing' || i.status === 'pending').length,
    thisWeek: items.filter(i => new Date(i.createdAt) >= weekAgo).length,
    failed: items.filter(i => i.status === 'failed').length,
  };
}

/**
 * Sort unified items
 */
export function sortItems(
  items: UnifiedContentItem[],
  sortBy: 'recent' | 'voice-score' | 'status'
): UnifiedContentItem[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'voice-score':
        return (b.voiceScore || 0) - (a.voiceScore || 0);
      case 'status':
        // Processing first, then completed, then failed
        const statusOrder = { processing: 0, pending: 1, completed: 2, failed: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

/**
 * Filter unified items
 */
export function filterItems(
  items: UnifiedContentItem[],
  filter: 'all' | 'videos' | 'written' | 'carousels'
): UnifiedContentItem[] {
  switch (filter) {
    case 'videos':
      return items.filter(i => i.clipCount > 0 || i.type === 'video' || i.type === 'mixed');
    case 'written':
      return items.filter(i => i.platformCount > 0 && i.clipCount === 0);
    case 'carousels':
      return items.filter(i => i.carouselSlideCount > 0);
    case 'all':
    default:
      return items;
  }
}

/**
 * Format duration in mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get platform display config
 */
export const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'bg-blue-500/10 text-blue-600' },
  twitter: { label: 'Twitter/X', icon: '𝕏', color: 'bg-slate-500/10 text-slate-700' },
  instagram: { label: 'Instagram', icon: '📸', color: 'bg-pink-500/10 text-pink-600' },
  tiktok: { label: 'TikTok', icon: '🎵', color: 'bg-slate-800/10 text-slate-800' },
  blog: { label: 'Blog Post', icon: '📝', color: 'bg-emerald-500/10 text-emerald-600' },
  email: { label: 'Newsletter', icon: '✉️', color: 'bg-amber-500/10 text-amber-600' },
  youtube: { label: 'YouTube', icon: '📺', color: 'bg-red-500/10 text-red-600' },
  'video-script': { label: 'Video Script', icon: '🎬', color: 'bg-purple-500/10 text-purple-600' },
};

/**
 * Get content type badge config
 */
export const CONTENT_TYPE_CONFIG: Record<ContentKitType, { label: string; icon: string; color: string }> = {
  video: { label: 'Video', icon: '🎬', color: 'bg-cyan-500/10 text-cyan-600' },
  text: { label: 'Written', icon: '📝', color: 'bg-violet-500/10 text-violet-600' },
  carousel: { label: 'Carousel', icon: '📸', color: 'bg-pink-500/10 text-pink-600' },
  mixed: { label: 'Full Kit', icon: '📦', color: 'bg-accent/10 text-accent' },
};
