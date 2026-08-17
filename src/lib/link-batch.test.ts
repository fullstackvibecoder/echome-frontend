/**
 * link-batch.test.ts
 *
 * extractBulkLinks decides when a paste is a bulk link batch: two or more
 * URLs and nothing else. Mixed prose plus URLs is NOT a batch (that stays a
 * plain-text paste), and a single URL keeps the existing single-import flow.
 */

import { describe, it, expect } from 'vitest';
import { extractBulkLinks } from './link-batch';

describe('extractBulkLinks', () => {
  it('returns null for empty input', () => {
    expect(extractBulkLinks('')).toBeNull();
    expect(extractBulkLinks('   \n  ')).toBeNull();
  });

  it('returns null for a single URL (single-import flow owns it)', () => {
    expect(extractBulkLinks('https://youtu.be/abc123')).toBeNull();
  });

  it('returns null for plain text', () => {
    expect(extractBulkLinks('here is my best writing sample')).toBeNull();
  });

  it('returns null when text mixes prose and URLs', () => {
    expect(
      extractBulkLinks('check this out https://youtu.be/abc and https://youtu.be/def'),
    ).toBeNull();
  });

  it('returns the URLs when two are pasted on separate lines', () => {
    expect(
      extractBulkLinks('https://youtu.be/abc\nhttps://example.com/post'),
    ).toEqual(['https://youtu.be/abc', 'https://example.com/post']);
  });

  it('returns the URLs when separated by spaces or blank lines', () => {
    expect(
      extractBulkLinks('https://a.com/1   https://b.com/2\n\n https://c.com/3 '),
    ).toEqual(['https://a.com/1', 'https://b.com/2', 'https://c.com/3']);
  });

  it('includes URL-shaped tokens with other schemes so the backend can reject them with a reason', () => {
    expect(
      extractBulkLinks('https://a.com/1\nftp://nope\nhttps://b.com/2'),
    ).toEqual(['https://a.com/1', 'ftp://nope', 'https://b.com/2']);
  });

  it('normalizes bare www. links to https', () => {
    expect(
      extractBulkLinks('www.example.com/post\nhttps://youtu.be/abc'),
    ).toEqual(['https://www.example.com/post', 'https://youtu.be/abc']);
  });
});
