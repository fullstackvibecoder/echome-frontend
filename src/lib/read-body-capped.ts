/**
 * Read a request body as text, giving up once it exceeds `maxBytes`.
 *
 * `request.text()` buffers the whole body before any size check, and a
 * chunked request has no content-length to check up front, so an
 * unauthenticated endpoint (the CSP collector) needs a streaming cap.
 * Returns null when the cap is exceeded; the stream is cancelled so the
 * rest is never read.
 */
export async function readBodyCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string | null> {
  if (!body) return '';
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(out);
}
