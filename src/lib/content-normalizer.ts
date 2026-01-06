/**
 * Content Normalizer
 *
 * Creates a unified NormalizedContent interface from different content types:
 * - Video clips (from clip finder)
 * - Generated content (from AI generation)
 * - Carousels (image slides)
 * - Content kits (bundled platform content)
 *
 * This normalizer handles the schema alignment layer for the Content Library.
 */

import type {
  GenerationRequest,
  GeneratedContentItem,
  VideoClipDetail,
  ContentKitDetail,
  GeneratedCarouselDetail,
  GenerationRequestDetail,
  Platform,
} from '@/types';
import type { VideoUpload, ContentKit, VideoClip } from './api-client';
import {
  generateTitle,
  generatePreviewText,
  getPlatformsFromContentKit,
  countPlatformContent,
} from './content-kit-utils';

// ============================================
// TYPES
// ============================================

export type ContentType = 'clip' | 'generated' | 'carousel' | 'kit' | 'video-upload';
export type DisplayStatus = 'completed' | 'processing' | 'failed' | 'pending';

export interface NormalizedContent {
  id: string;
  type: ContentType;
  title: string;
  description?: string;
  status: DisplayStatus;
  platforms: Platform[];
  score?: number; // voiceScore, viralityScore, or qualityScore
  thumbnailUrl?: string;
  createdAt: Date;

  // For navigation and detail views
  sourceId: string; // Original ID for the source type
  generationRequestId?: string;
  videoUploadId?: string;

  // Preview data
  previewText?: string;
  previewImageUrl?: string;

  // Counts for display
  clipCount?: number;
  platformCount?: number;
  slideCount?: number;

  // Duration for video clips
  duration?: number;

  // Platform content for kits (for expandable cards)
  platformContent?: {
    platform: Platform;
    content: string;
  }[];

  // Preserve raw data for detail navigation
  raw: VideoClipDetail | VideoClip | GeneratedContentItem | ContentKitDetail | ContentKit | GeneratedCarouselDetail | VideoUpload | GenerationRequest;
}

// ============================================
// NORMALIZER FUNCTIONS
// ============================================

/**
 * Normalize a video clip from clip finder
 * Video clips have processing states (pending → processing → completed/failed)
 */
export function normalizeClip(clip: VideoClipDetail | VideoClip): NormalizedContent {
  return {
    id: `clip-${clip.id}`,
    type: 'clip',
    title: clip.title || `Clip ${clip.startTime?.toFixed(0) || 0}s - ${clip.endTime?.toFixed(0) || 0}s`,
    description: clip.transcriptText?.slice(0, 150),
    status: mapClipStatus(clip.status),
    platforms: [], // Clips can be used for any platform
    score: clip.viralityScore || clip.qualityScore,
    thumbnailUrl: clip.thumbnailUrl,
    createdAt: new Date(clip.createdAt),
    sourceId: clip.id,
    videoUploadId: clip.videoUploadId,
    previewText: clip.suggestedCaption || clip.transcriptText?.slice(0, 200),
    duration: clip.duration,
    raw: clip,
  };
}

/**
 * Normalize generated content item
 * Generated content is always 'completed' (instant generation)
 */
export function normalizeGenerated(content: GeneratedContentItem, requestId?: string): NormalizedContent {
  return {
    id: `gen-${content.id}`,
    type: 'generated',
    title: `${platformLabel(content.platform)} Post`,
    description: content.content.slice(0, 150),
    status: 'completed', // Generated content is always completed
    platforms: [content.platform as Platform],
    score: content.voiceScore || content.qualityScore,
    createdAt: content.createdAt ? new Date(content.createdAt) : new Date(),
    sourceId: content.id,
    generationRequestId: requestId,
    previewText: content.content.slice(0, 200),
    raw: content,
  };
}

/**
 * Normalize a carousel
 * Carousels are always 'completed' (generated with content)
 */
export function normalizeCarousel(carousel: GeneratedCarouselDetail): NormalizedContent {
  const firstSlide = carousel.slides?.[0];
  return {
    id: `carousel-${carousel.id}`,
    type: 'carousel',
    title: 'Image Carousel',
    description: firstSlide?.text?.slice(0, 150),
    status: 'completed', // Carousels are always completed
    platforms: ['instagram', 'linkedin'] as Platform[], // Typical carousel platforms
    score: carousel.qualityScore,
    thumbnailUrl: firstSlide?.publicUrl,
    createdAt: new Date(carousel.createdAt),
    sourceId: carousel.id,
    generationRequestId: carousel.generationRequestId,
    previewImageUrl: firstSlide?.publicUrl,
    slideCount: carousel.slideCount,
    raw: carousel,
  };
}

/**
 * Normalize a content kit (bundled platform content)
 * Status derived from contentGenerated flag
 */
export function normalizeKit(kit: ContentKitDetail | ContentKit): NormalizedContent {
  const platforms = getPlatformsFromContentKit(kit as ContentKit);
  const platformCount = countPlatformContent(kit as ContentKit);

  // Build platform content array for expandable cards
  const platformContent: NormalizedContent['platformContent'] = [];
  if ((kit as ContentKit).contentLinkedin) platformContent.push({ platform: 'linkedin', content: (kit as ContentKit).contentLinkedin! });
  if ((kit as ContentKit).contentTwitter) platformContent.push({ platform: 'twitter', content: (kit as ContentKit).contentTwitter! });
  if ((kit as ContentKit).contentInstagram) platformContent.push({ platform: 'instagram', content: (kit as ContentKit).contentInstagram! });
  if ((kit as ContentKit).contentTiktok) platformContent.push({ platform: 'tiktok', content: (kit as ContentKit).contentTiktok! });
  if ((kit as ContentKit).contentBlog) platformContent.push({ platform: 'blog', content: (kit as ContentKit).contentBlog! });
  if ((kit as ContentKit).contentEmail) platformContent.push({ platform: 'email', content: (kit as ContentKit).contentEmail! });

  return {
    id: `kit-${kit.id}`,
    type: 'kit',
    title: kit.title || 'Content Kit',
    status: kit.contentGenerated ? 'completed' : 'processing',
    platforms,
    createdAt: new Date(kit.createdAt),
    sourceId: kit.id,
    videoUploadId: kit.videoUploadId,
    generationRequestId: kit.generationRequestId,
    previewText: (kit as ContentKit).contentLinkedin?.slice(0, 200) ||
                 (kit as ContentKit).contentTwitter?.slice(0, 200),
    platformCount,
    clipCount: kit.clipsGenerated,
    platformContent,
    raw: kit,
  };
}

/**
 * Normalize a video upload (parent container for clips)
 * Video uploads have processing states
 */
export function normalizeVideoUpload(upload: VideoUpload, contentKit?: ContentKit | null, clipCount: number = 0): NormalizedContent {
  const platforms = contentKit ? getPlatformsFromContentKit(contentKit) : [];
  const platformCount = contentKit ? countPlatformContent(contentKit) : 0;

  return {
    id: `upload-${upload.id}`,
    type: 'video-upload',
    title: contentKit?.title || generateTitle(undefined, upload.originalFilename),
    description: contentKit?.description,
    status: mapUploadStatus(upload.status),
    platforms,
    thumbnailUrl: upload.thumbnailUrl,
    createdAt: new Date(upload.createdAt),
    sourceId: upload.id,
    videoUploadId: upload.id,
    generationRequestId: contentKit?.generationRequestId,
    previewText: contentKit?.contentLinkedin?.slice(0, 200),
    clipCount,
    platformCount,
    raw: upload,
  };
}

/**
 * Normalize a generation request
 * These are always completed or failed (instant generation)
 */
export function normalizeGenerationRequest(request: GenerationRequest): NormalizedContent {
  return {
    id: `request-${request.id}`,
    type: 'generated',
    title: generateTitle(request.inputText),
    status: mapRequestStatus(request.status),
    platforms: request.platforms || [],
    score: request.voiceScore || request.qualityScore,
    createdAt: new Date(request.createdAt),
    sourceId: request.id,
    generationRequestId: request.id,
    previewText: generatePreviewText(request.inputText),
    platformCount: request.platforms?.length || 0,
    raw: request,
  };
}

/**
 * Normalize all content from a GenerationRequestDetail response
 * Returns an array of normalized content items
 */
export function normalizeRequestDetail(detail: GenerationRequestDetail): NormalizedContent[] {
  const items: NormalizedContent[] = [];

  // Add clips
  if (detail.clips?.length) {
    items.push(...detail.clips.map(clip => normalizeClip(clip)));
  }

  // Add generated content items
  if (detail.content?.length) {
    items.push(...detail.content.map(c => normalizeGenerated(c, detail.request?.id)));
  }

  // Add carousel
  if (detail.carousel) {
    items.push(normalizeCarousel(detail.carousel));
  }

  // Add content kit if present
  if (detail.contentKit) {
    items.push(normalizeKit(detail.contentKit));
  }

  return items;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapClipStatus(status: string): DisplayStatus {
  switch (status) {
    case 'completed': return 'completed';
    case 'processing': return 'processing';
    case 'pending': return 'pending';
    case 'failed': return 'failed';
    default: return 'pending';
  }
}

function mapUploadStatus(status: string): DisplayStatus {
  switch (status) {
    case 'completed': return 'completed';
    case 'processing': return 'processing';
    case 'uploading': return 'processing';
    case 'pending': return 'pending';
    case 'failed': return 'failed';
    default: return 'pending';
  }
}

function mapRequestStatus(status: string): DisplayStatus {
  switch (status) {
    case 'completed': return 'completed';
    case 'processing': return 'processing';
    case 'pending': return 'pending';
    case 'failed': return 'failed';
    default: return 'completed'; // Default to completed for requests
  }
}

function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    linkedin: 'LinkedIn',
    twitter: 'Twitter/X',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    blog: 'Blog',
    email: 'Newsletter',
    youtube: 'YouTube',
    'video-script': 'Video Script',
  };
  return labels[platform] || platform;
}

// ============================================
// DISPLAY HELPERS
// ============================================

export const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; bgColor: string }> = {
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-50' },
  processing: { label: 'Processing', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  pending: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-50' },
};

export const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string; color: string }> = {
  clip: { label: 'Video Clip', icon: '🎬', color: 'bg-cyan-100 text-cyan-700' },
  generated: { label: 'Generated', icon: '✨', color: 'bg-violet-100 text-violet-700' },
  carousel: { label: 'Carousel', icon: '📸', color: 'bg-pink-100 text-pink-700' },
  kit: { label: 'Content Kit', icon: '📦', color: 'bg-amber-100 text-amber-700' },
  'video-upload': { label: 'Video', icon: '🎥', color: 'bg-blue-100 text-blue-700' },
};
