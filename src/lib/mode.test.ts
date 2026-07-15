import { describe, it, expect, beforeEach } from 'vitest';
import {
  platformsForMode,
  isModeActive,
  captureModeFromParams,
  persistMode,
  readMode,
  clearMode,
} from './mode';

describe('platformsForMode', () => {
  it('article resolves to blog + newsletter', () => {
    expect(platformsForMode('article')).toEqual(['blog', 'email']);
  });
  it('full_kit resolves to the full platform set', () => {
    expect(platformsForMode('full_kit')).toEqual([
      'instagram', 'linkedin', 'blog', 'email', 'tiktok', 'video-script',
    ]);
  });
  it('clips resolves to an empty platform set (clip pipeline, no /generate text)', () => {
    expect(platformsForMode('clips')).toEqual([]);
  });
});

describe('isModeActive', () => {
  it('is false for null and full_kit', () => {
    expect(isModeActive(null)).toBe(false);
    expect(isModeActive('full_kit')).toBe(false);
  });
  it('is true for clips and article', () => {
    expect(isModeActive('clips')).toBe(true);
    expect(isModeActive('article')).toBe(true);
  });
});

describe('captureModeFromParams', () => {
  it('reads an explicit ?mode= as source=utm', () => {
    const p = new URLSearchParams('mode=article&utm_content=v3');
    expect(captureModeFromParams(p)).toEqual({ mode: 'article', source: 'utm' });
  });
  it('ignores unknown modes', () => {
    expect(captureModeFromParams(new URLSearchParams('mode=banana'))).toBeNull();
  });
  it('returns null when no mode param is present', () => {
    expect(captureModeFromParams(new URLSearchParams('utm_source=x'))).toBeNull();
  });
});

describe('persist / read / clear', () => {
  beforeEach(() => { localStorage.clear(); });
  it('round-trips a persisted mode', () => {
    persistMode('clips', 'utm');
    expect(readMode()).toEqual({ mode: 'clips', source: 'utm' });
  });
  it('returns null when nothing is stored', () => {
    expect(readMode()).toBeNull();
  });
  it('clearMode removes the stored value', () => {
    persistMode('article', 'utm');
    clearMode();
    expect(readMode()).toBeNull();
  });
});
