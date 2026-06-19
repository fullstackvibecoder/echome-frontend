import { describe, it, expect } from 'vitest';
import { extractFirstUrl, detectIngestUrlKind, detectVideoUrlTarget } from './url-platform';

describe('extractFirstUrl', () => {
  it('returns null when there is no URL', () => {
    expect(extractFirstUrl('just some notes about my week')).toBeNull();
  });

  it('pulls the first URL out of surrounding text', () => {
    expect(extractFirstUrl('check this https://example.com/post and more')).toBe(
      'https://example.com/post',
    );
  });

  it('trims trailing sentence punctuation', () => {
    expect(extractFirstUrl('see https://example.com/post.')).toBe('https://example.com/post');
    expect(extractFirstUrl('(https://example.com/post)')).toBe('https://example.com/post');
  });
});

describe('detectIngestUrlKind', () => {
  it('classifies YouTube links (both hosts)', () => {
    expect(detectIngestUrlKind('https://www.youtube.com/watch?v=abc')).toBe('youtube');
    expect(detectIngestUrlKind('https://youtu.be/abc')).toBe('youtube');
  });

  it('classifies Instagram links', () => {
    expect(detectIngestUrlKind('https://www.instagram.com/p/abc/')).toBe('instagram');
  });

  it('classifies Zoom/Loom/Vimeo recordings as "recording" (no KB importer)', () => {
    expect(detectIngestUrlKind('https://us02web.zoom.us/rec/share/abc')).toBe('recording');
    expect(detectIngestUrlKind('https://www.loom.com/share/abc')).toBe('recording');
    expect(detectIngestUrlKind('https://vimeo.com/123456')).toBe('recording');
  });

  it('falls back to "blog" for a generic page', () => {
    expect(detectIngestUrlKind('https://someblog.example.com/2026/my-post')).toBe('blog');
  });
});

describe('detectVideoUrlTarget', () => {
  it('youtube watch is single', () => {
    expect(detectVideoUrlTarget('https://youtube.com/watch?v=abc123')).toEqual({ platform: 'youtube', kind: 'single' });
  });
  it('youtu.be is single', () => {
    expect(detectVideoUrlTarget('https://youtu.be/abc123')).toEqual({ platform: 'youtube', kind: 'single' });
  });
  it('youtube shorts is single', () => {
    expect(detectVideoUrlTarget('https://youtube.com/shorts/abc')).toEqual({ platform: 'youtube', kind: 'single' });
  });
  it('youtube @handle is channel', () => {
    expect(detectVideoUrlTarget('https://youtube.com/@somehandle')).toEqual({ platform: 'youtube', kind: 'channel' });
  });
  it('youtube /channel/ is channel', () => {
    expect(detectVideoUrlTarget('https://youtube.com/channel/UC123')).toEqual({ platform: 'youtube', kind: 'channel' });
  });
  it('bare youtube root is channel (uncertain, ask anyway)', () => {
    expect(detectVideoUrlTarget('https://youtube.com')).toEqual({ platform: 'youtube', kind: 'channel' });
  });
  it('instagram reel is single', () => {
    expect(detectVideoUrlTarget('https://instagram.com/reel/xyz')).toEqual({ platform: 'instagram', kind: 'single' });
  });
  it('instagram /p/ is single', () => {
    expect(detectVideoUrlTarget('https://instagram.com/p/xyz')).toEqual({ platform: 'instagram', kind: 'single' });
  });
  it('instagram profile is channel', () => {
    expect(detectVideoUrlTarget('https://instagram.com/someuser')).toEqual({ platform: 'instagram', kind: 'channel' });
  });
  it('loom returns null (not forkable here)', () => {
    expect(detectVideoUrlTarget('https://loom.com/share/abc')).toBeNull();
  });
  it('plain blog url returns null', () => {
    expect(detectVideoUrlTarget('https://example.com/post')).toBeNull();
  });
});
