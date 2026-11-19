import { describe, it, expect } from 'vitest';
import { normalizePlatform, platformLabel, postTextFor } from './single-post';

describe('single post helpers', () => {
  it('maps backend keys to web keys', () => {
    expect(normalizePlatform('video_script')).toBe('video-script');
    expect(normalizePlatform(' LinkedIn ')).toBe('linkedin');
    expect(normalizePlatform(null)).toBe('');
    expect(platformLabel('instagram')).toBe('Instagram caption');
    expect(platformLabel('nope')).toBe('Post');
  });

  it('reads the kit field first, then generated content', () => {
    const detail = {
      contentKit: { contentLinkedin: 'From kit', contentBlog: '' },
      content: [{ platform: 'blog', content: 'Late blog' }, { platform: 'linkedin', content: 'Old row' }],
    };
    expect(postTextFor(detail, 'linkedin')).toBe('From kit');
    expect(postTextFor(detail, 'blog')).toBe('Late blog');
    expect(postTextFor(detail, 'twitter')).toBe('');
    expect(postTextFor(null, 'linkedin')).toBe('');
  });
});
