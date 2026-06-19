import { describe, it, expect } from 'vitest';
import { selectClipVideoSrc } from './clip-video-src';
import type { VideoClip } from '@/lib/api-client';

// Minimal builder — only the fields selectClipVideoSrc reads.
function makeClip(overrides: Partial<VideoClip> = {}): VideoClip {
  return {
    exports: [{ url: 'https://cdn/original.mp4' }],
    ...overrides,
  } as VideoClip;
}

describe('selectClipVideoSrc', () => {
  it('returns the cleaned URL by default when auto-clean was applied', () => {
    const clip = makeClip({ autoCleanApplied: true, cleanedUrl: 'https://cdn/cleaned.mp4' });
    expect(selectClipVideoSrc(clip, 'single', false)).toBe('https://cdn/cleaned.mp4');
  });

  it('returns the original URL when the user is comparing (showOriginal=true)', () => {
    const clip = makeClip({ autoCleanApplied: true, cleanedUrl: 'https://cdn/cleaned.mp4' });
    expect(selectClipVideoSrc(clip, 'single', true)).toBe('https://cdn/original.mp4');
  });

  it('returns the original URL when auto-clean was not applied', () => {
    const clip = makeClip({ autoCleanApplied: false });
    expect(selectClipVideoSrc(clip, 'single', false)).toBe('https://cdn/original.mp4');
  });

  it('returns the split-screen URL in split view', () => {
    const clip = makeClip({ autoCleanApplied: true, cleanedUrl: 'https://cdn/cleaned.mp4' });
    (clip as unknown as Record<string, unknown>).splitScreenUrl = 'https://cdn/split.mp4';
    expect(selectClipVideoSrc(clip, 'split', false)).toBe('https://cdn/split.mp4');
  });

  it('falls back to empty string when there are no exports', () => {
    const clip = makeClip({ exports: [] });
    expect(selectClipVideoSrc(clip, 'single', false)).toBe('');
  });
});
