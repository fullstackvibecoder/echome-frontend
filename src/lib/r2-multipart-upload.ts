export interface UploadPart { partNumber: number; url: string; }
export interface CompletedPart { partNumber: number; etag: string; }

export interface UploadOptions {
  concurrency?: number;
  onProgress?: (uploadedBytes: number) => void;
  maxRetriesPerPart?: number;
}

/**
 * Upload a File to R2 in parallel multipart parts using presigned PUT URLs.
 * Each part is a byte-range slice; returns the {partNumber, etag} list for the
 * backend's completeMultipartUpload. Retries a failed part up to N times.
 */
export async function uploadFileInParts(
  file: File,
  partUrls: UploadPart[],
  partSize: number,
  opts: UploadOptions = {},
): Promise<CompletedPart[]> {
  const concurrency = opts.concurrency ?? 4;
  const maxRetries = opts.maxRetriesPerPart ?? 3;
  const results: CompletedPart[] = new Array(partUrls.length);
  const perPartLoaded: number[] = new Array(partUrls.length).fill(0);

  const reportProgress = () => {
    if (opts.onProgress) opts.onProgress(perPartLoaded.reduce((a, b) => a + b, 0));
  };

  const uploadOne = (idx: number): Promise<void> => {
    const { partNumber, url } = partUrls[idx];
    const start = idx * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    const attempt = (tryNum: number): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) { perPartLoaded[idx] = e.loaded; reportProgress(); }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = (xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || '').replace(/"/g, '');
            if (!etag) { reject(new Error('Missing ETag on uploaded part')); return; }
            perPartLoaded[idx] = chunk.size; reportProgress();
            results[idx] = { partNumber, etag };
            resolve();
          } else {
            reject(new Error(`Part ${partNumber} failed: HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error(`Part ${partNumber} network error`));
        xhr.send(chunk);
      }).catch((err) => {
        if (tryNum < maxRetries) { perPartLoaded[idx] = 0; return attempt(tryNum + 1); }
        throw err;
      });

    return attempt(1);
  };

  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < partUrls.length) {
      const idx = next++;
      await uploadOne(idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, partUrls.length) }, worker));
  return results;
}
