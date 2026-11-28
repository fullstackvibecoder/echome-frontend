import { describe, expect, it } from 'vitest';
import { readSSE } from './sse';

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe('readSSE', () => {
  it('yields frames split across chunks', async () => {
    const body = streamOf([
      'data: {"type":"text","content":"he',
      'llo"}\n\ndata: {"type":"conv',
      'ersation","id":"c1"}\n\n',
    ]);
    expect(await collect(readSSE(body))).toEqual([
      { type: 'text', content: 'hello' },
      { type: 'conversation', id: 'c1' },
    ]);
  });

  it('skips a malformed frame and keeps going', async () => {
    const body = streamOf([
      'data: {"type":"text","content":"a"}\n\ndata: {not json\n\ndata: {"type":"text","content":"b"}\n\n',
    ]);
    expect(await collect(readSSE(body))).toEqual([
      { type: 'text', content: 'a' },
      { type: 'text', content: 'b' },
    ]);
  });

  it('stops after a done frame', async () => {
    const body = streamOf([
      'data: {"type":"text","content":"a"}\n\ndata: {"type":"done"}\n\ndata: {"type":"text","content":"late"}\n\n',
    ]);
    expect(await collect(readSSE(body))).toEqual([
      { type: 'text', content: 'a' },
      { type: 'done' },
    ]);
  });
});
