import { describe, expect, it } from 'vitest';
import { readBodyCapped } from './read-body-capped';

function streamOf(chunks: string[]) {
  let pulled = 0;
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled >= chunks.length) return controller.close();
      controller.enqueue(enc.encode(chunks[pulled++]));
    },
  });
  return { body, pulledCount: () => pulled };
}

describe('readBodyCapped', () => {
  it('returns the text when under the cap', async () => {
    const { body } = streamOf(['{"a":', '1}']);
    expect(await readBodyCapped(body, 16)).toBe('{"a":1}');
  });

  it('returns null and stops reading once the cap is exceeded (chunked, no content-length)', async () => {
    const big = Array.from({ length: 1000 }, () => 'x'.repeat(1024));
    const { body, pulledCount } = streamOf(big);
    expect(await readBodyCapped(body, 16 * 1024)).toBeNull();
    expect(pulledCount()).toBeLessThan(40);
  });

  it('returns empty string for a null body', async () => {
    expect(await readBodyCapped(null, 16)).toBe('');
  });
});
