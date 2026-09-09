export interface UploadPart { partNumber: number; url: string; }
export interface CompletedPart { partNumber: number; etag: string; }

export interface UploadOptions {
  concurrency?: number;
  onProgress?: (uploadedBytes: number) => void;
  maxRetriesPerPart?: number;
  /** Ceiling for ONE attempt of ONE part, in ms (XHR total time, not
   *  inactivity). Default 15 min, which is ~28 KB/s for a 25MB part. A
   *  stalled socket otherwise hangs the whole upload with no error. */
  timeoutMs?: number;
  /** External cancel. When it fires every in-flight PUT is aborted and the
   *  returned promise rejects with the signal's reason. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export class UploadAbortedError extends Error {
  constructor(message = 'Upload aborted') {
    super(message);
    this.name = 'UploadAbortedError';
  }
}

/**
 * Upload a File to R2 in parallel multipart parts using presigned PUT URLs.
 * Each part is a byte-range slice; returns the {partNumber, etag} list for the
 * backend's completeMultipartUpload. Retries a failed part up to N times with
 * exponential backoff, times out a stalled attempt, and cancels every sibling
 * part as soon as one part is beyond recovery (or the caller's signal fires).
 *
 * partUrls must be ordered by partNumber: slice offsets are computed from the
 * array index.
 */
export async function uploadFileInParts(
  file: File,
  partUrls: UploadPart[],
  partSize: number,
  opts: UploadOptions = {},
): Promise<CompletedPart[]> {
  const concurrency = opts.concurrency ?? 4;
  const maxRetries = opts.maxRetriesPerPart ?? 5;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: CompletedPart[] = new Array(partUrls.length);
  const perPartLoaded: number[] = new Array(partUrls.length).fill(0);

  // One internal controller fans out to every live XHR. It fires when the
  // caller's signal fires OR when any part exhausts its retries, so sibling
  // parts stop pushing bytes for an upload that can no longer complete.
  const controller = new AbortController();
  let abortReason: unknown;
  const abortAll = (reason: unknown) => {
    if (controller.signal.aborted) return;
    abortReason = reason;
    controller.abort();
  };
  const reasonOrDefault = () => abortReason ?? new UploadAbortedError();

  if (opts.signal) {
    if (opts.signal.aborted) throw opts.signal.reason ?? new UploadAbortedError();
    opts.signal.addEventListener(
      'abort',
      () => abortAll(opts.signal?.reason ?? new UploadAbortedError()),
      { once: true },
    );
  }

  const reportProgress = () => {
    if (opts.onProgress) opts.onProgress(perPartLoaded.reduce((a, b) => a + b, 0));
  };

  // Backoff sleep that returns early when the upload is cancelled, so a
  // cancelled part does not sit in a timer before noticing.
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        controller.signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      controller.signal.addEventListener('abort', done, { once: true });
    });

  const uploadOne = (idx: number): Promise<void> => {
    const { partNumber, url } = partUrls[idx];
    const start = idx * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    const attempt = (tryNum: number): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        if (controller.signal.aborted) { reject(reasonOrDefault()); return; }

        const xhr = new XMLHttpRequest();
        let settled = false;
        const onAbort = () => { if (!settled) xhr.abort(); };
        controller.signal.addEventListener('abort', onAbort, { once: true });
        const finish = (fn: () => void) => {
          settled = true;
          controller.signal.removeEventListener('abort', onAbort);
          fn();
        };

        xhr.open('PUT', url);
        xhr.timeout = timeoutMs;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) { perPartLoaded[idx] = e.loaded; reportProgress(); }
        };
        xhr.onload = () => finish(() => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = (xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '').replace(/"/g, '');
            if (!etag) { reject(new Error('Missing ETag on uploaded part')); return; }
            perPartLoaded[idx] = chunk.size; reportProgress();
            results[idx] = { partNumber, etag };
            resolve();
          } else {
            reject(new Error(`Part ${partNumber} failed: HTTP ${xhr.status}`));
          }
        });
        xhr.onerror = () => finish(() => reject(new Error(`Part ${partNumber} network error`)));
        xhr.ontimeout = () => finish(() =>
          reject(new Error(`Part ${partNumber} timed out after ${Math.round(timeoutMs / 1000)}s`)));
        xhr.onabort = () => finish(() => reject(reasonOrDefault()));
        xhr.send(chunk);
      }).catch((err) => {
        // Never retry once the whole upload has been cancelled.
        if (controller.signal.aborted) throw reasonOrDefault();
        if (tryNum < maxRetries) {
          // Exponential backoff (capped at 8s) before retrying, so a
          // transient blip or brief congestion can clear instead of burning
          // all retries instantly.
          perPartLoaded[idx] = 0;
          const backoffMs = Math.min(500 * 2 ** (tryNum - 1), 8000);
          return sleep(backoffMs).then(() => attempt(tryNum + 1));
        }
        // This part is beyond recovery: stop the siblings too.
        abortAll(err);
        throw err;
      });

    return attempt(1);
  };

  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < partUrls.length && !controller.signal.aborted) {
      const idx = next++;
      await uploadOne(idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, partUrls.length) }, worker));
  return results;
}
