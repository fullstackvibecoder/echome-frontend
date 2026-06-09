import { describe, it, expect } from 'vitest';
import { youtubeShortBlockReason } from './youtube-short-eligibility';

describe('youtubeShortBlockReason', () => {
  it('returns null for a vertical clip under the cap', () => {
    expect(youtubeShortBlockReason(38, '9:16')).toBeNull();
  });
  it('returns null for a square clip', () => {
    expect(youtubeShortBlockReason(30, '1:1')).toBeNull();
  });
  it('blocks a clip longer than 3 minutes', () => {
    expect(youtubeShortBlockReason(200, '9:16')).toMatch(/3 minutes/);
  });
  it('blocks a landscape clip', () => {
    expect(youtubeShortBlockReason(30, '16:9')).toMatch(/vertical/);
  });
});
