import { describe, it, expect } from 'vitest';
import { formatTxt, formatSrt, formatVtt, type TranscriptSegment } from './transcript-format';

const segs: TranscriptSegment[] = [
  { start: 0, dur: 1.5, text: 'Hello world' },
  { start: 61.25, dur: 2, text: 'Second line' },
];

describe('transcript-format', () => {
  it('formatTxt returns plainText verbatim (works when segments empty)', () => {
    expect(formatTxt([], 'just text')).toBe('just text');
    expect(formatTxt(segs, 'Hello world Second line')).toBe('Hello world Second line');
  });

  it('formatSrt is 1-indexed with comma millisecond separators', () => {
    expect(formatSrt(segs)).toBe(
      '1\n00:00:00,000 --> 00:00:01,500\nHello world\n' +
      '\n' +
      '2\n00:01:01,250 --> 00:01:03,250\nSecond line\n',
    );
  });

  it('formatVtt has WEBVTT header and dot millisecond separators', () => {
    expect(formatVtt(segs)).toBe(
      'WEBVTT\n\n' +
      '00:00:00.000 --> 00:00:01.500\nHello world\n\n' +
      '00:01:01.250 --> 00:01:03.250\nSecond line\n',
    );
  });

  it('rolls a sub-millisecond fraction up into the next second, never ms=1000', () => {
    // start rounds to 2.000s, end (start+dur) rounds to 3.000s
    const boundary: TranscriptSegment[] = [{ start: 1.9996, dur: 1, text: 'x' }];
    expect(formatSrt(boundary)).toBe('1\n00:00:02,000 --> 00:00:03,000\nx\n');
  });
});
