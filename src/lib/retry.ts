/**
 * Retry wrapper for async operations.
 *
 * Auto-retries on 5xx and timeout errors, skips 4xx (client errors).
 *
 * Usage:
 *   const data = await withRetry(() => api.kb.list(), { maxRetries: 2 });
 */

import { AxiosError } from 'axios';

interface RetryOptions {
  /** Maximum number of retry attempts (default: 1) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  delayMs?: number;
  /** Backoff multiplier applied after each retry (default: 2) */
  backoff?: number;
}

/**
 * Returns true if the error is retryable (server error or network/timeout).
 * Client errors (4xx) are never retried.
 */
function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;

  const axiosErr = err as AxiosError;
  if (axiosErr.isAxiosError) {
    // No response = network error or timeout → retryable
    if (!axiosErr.response) return true;
    // 5xx = server error → retryable
    return axiosErr.response.status >= 500;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 1, delayMs = 1000, backoff = 2 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry client errors or if we've exhausted retries
      if (!isRetryable(err) || attempt === maxRetries) {
        throw err;
      }

      const delay = delayMs * Math.pow(backoff, attempt);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}
