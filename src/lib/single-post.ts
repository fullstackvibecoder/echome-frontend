/**
 * One written piece of a kit, for /app/post/[kitId]?platform=X: the light page
 * EchoMe in Claude links to instead of the whole kit (founder 2026-11-19).
 */

/** Backend kit keys use underscores (video_script); the web uses dashes. */
export function normalizePlatform(raw: string | null | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/_/g, '-');
}

const LABELS: Record<string, string> = {
  linkedin: 'LinkedIn post',
  twitter: 'X post',
  instagram: 'Instagram caption',
  tiktok: 'TikTok caption',
  youtube: 'YouTube description',
  blog: 'Blog post',
  email: 'Newsletter',
  'video-script': 'Video script',
  reels: 'Reel script',
};

export function platformLabel(platform: string): string {
  return LABELS[platform] ?? 'Post';
}

/** Platforms the inline editor handles (edit, copy, schedule). */
export const INLINE_EDITABLE = new Set(['linkedin', 'twitter', 'email', 'tiktok', 'youtube', 'video-script']);

/** Need an image or video before they can be scheduled. */
export const NEEDS_MEDIA = new Set(['instagram', 'tiktok', 'youtube', 'reels']);

const KIT_FIELDS: Record<string, string> = {
  linkedin: 'contentLinkedin',
  twitter: 'contentTwitter',
  instagram: 'contentInstagram',
  tiktok: 'contentTiktok',
  blog: 'contentBlog',
  email: 'contentEmail',
  youtube: 'contentYoutube',
  'video-script': 'contentVideoScript',
};

interface DetailLike {
  contentKit?: Record<string, unknown> | null;
  content?: Array<{ platform?: string; content?: string }> | null;
}

/** The text for one platform: the kit's own field first, then generated_content. */
export function postTextFor(detail: DetailLike | null | undefined, platform: string): string {
  const field = KIT_FIELDS[platform];
  const fromKit = field ? detail?.contentKit?.[field] : undefined;
  if (typeof fromKit === 'string' && fromKit.trim()) return fromKit;
  const row = detail?.content?.find((c) => normalizePlatform(c.platform) === platform && c.content?.trim());
  return row?.content ?? '';
}
