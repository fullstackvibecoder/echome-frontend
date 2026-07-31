import { describe, it, expect } from 'vitest';
import { captionlessPlatforms, formatPlatformList } from './caption-guard';

describe('captionlessPlatforms', () => {
  it('flags every row when there is no per-row text and no fallback', () => {
    const rows = [{ platform: 'instagram' }, { platform: 'linkedin' }];
    expect(captionlessPlatforms(rows, '')).toEqual(['instagram', 'linkedin']);
  });

  it('flags rows when the shared fallback is whitespace only', () => {
    const rows = [{ platform: 'instagram' }];
    expect(captionlessPlatforms(rows, '   ')).toEqual(['instagram']);
  });

  it('treats a non-blank shared fallback as satisfying every row', () => {
    const rows = [{ platform: 'instagram' }, { platform: 'facebook' }];
    expect(captionlessPlatforms(rows, 'shared caption')).toEqual([]);
  });

  it('lets a per-row text satisfy the guard even when the fallback is empty', () => {
    const rows = [
      { platform: 'instagram', text: 'row caption' },
      { platform: 'linkedin', text: '' },
    ];
    expect(captionlessPlatforms(rows, '')).toEqual(['linkedin']);
  });

  it('treats a whitespace-only per-row text as empty and falls back', () => {
    const rows = [{ platform: 'instagram', text: '   ' }];
    expect(captionlessPlatforms(rows, 'fallback')).toEqual([]);
    expect(captionlessPlatforms(rows, '')).toEqual(['instagram']);
  });

  it('handles null/undefined text without throwing', () => {
    const rows = [{ platform: 'instagram', text: null }, { platform: 'facebook' }];
    expect(captionlessPlatforms(rows, undefined)).toEqual(['instagram', 'facebook']);
  });

  it('returns empty for no rows', () => {
    expect(captionlessPlatforms([], '')).toEqual([]);
  });
});

describe('formatPlatformList', () => {
  it('maps known platform ids to display labels', () => {
    expect(formatPlatformList(['instagram', 'linkedin', 'x'])).toBe('Instagram, LinkedIn, Twitter/X');
  });

  it('falls back to the raw id for unknown platforms', () => {
    expect(formatPlatformList(['mastodon'])).toBe('mastodon');
  });

  it('returns empty string for an empty list', () => {
    expect(formatPlatformList([])).toBe('');
  });
});
