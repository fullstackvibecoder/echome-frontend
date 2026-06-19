import type { VideoClip } from '@/lib/api-client';

/**
 * Decide which URL the clip player/exporter should use.
 *
 * Split view wins when a split-screen render exists. Otherwise the cleaned
 * render is the default once auto-clean has been applied, unless the user is
 * comparing against the original (showOriginal). Falls back to the first
 * export URL, then to an empty string.
 */
export function selectClipVideoSrc(
  clip: VideoClip,
  viewMode: 'single' | 'split',
  showOriginal: boolean,
): string {
  const splitScreenUrl = (clip as unknown as Record<string, unknown>).splitScreenUrl as string | undefined;
  if (viewMode === 'split' && splitScreenUrl) return splitScreenUrl;

  const baseSrc = clip.exports?.[0]?.url || '';
  const cleanedAvailable = !!clip.autoCleanApplied && !!clip.cleanedUrl;
  if (cleanedAvailable && !showOriginal) return clip.cleanedUrl as string;
  return baseSrc;
}
