/**
 * Minimal SSE reader: yields the JSON payload of each `data: ` frame.
 * Frames are separated by a blank line. Frames that do not parse are skipped.
 * Returns after yielding a frame whose `type` is 'done'.
 */
export async function* readSSE<T>(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<T, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const parse = (seg: string): T | null => {
    const line = seg.trim();
    if (!line.startsWith('data: ')) return null;
    const payload = line.slice('data: '.length).trim();
    if (!payload) return null;
    try {
      return JSON.parse(payload) as T;
    } catch {
      return null;
    }
  };

  const isDone = (event: T): boolean =>
    typeof event === 'object' && event !== null && (event as { type?: unknown }).type === 'done';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        const trailing = parse(buffer);
        if (trailing !== null) yield trailing;
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const segments = buffer.split('\n\n');
      buffer = segments.pop() ?? '';
      for (const seg of segments) {
        const event = parse(seg);
        if (event === null) continue;
        yield event;
        if (isDone(event)) return;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
