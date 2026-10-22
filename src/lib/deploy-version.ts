/**
 * Pure staleness logic for the stale-bundle heartbeat. Kept free of React
 * and the DOM so it can be unit-tested directly; the hook in
 * use-deploy-version.ts owns the timers and fetching.
 */

/** Background poll cadence for /api/version. */
export const POLL_INTERVAL_MS = 5 * 60 * 1000;

/** Minimum gap between checks triggered by the tab becoming visible. */
export const VISIBILITY_MIN_INTERVAL_MS = 60 * 1000;

/**
 * Stale when the server reports a different SHA than the one baked into the
 * running bundle. "dev" or a missing value on either side means we cannot
 * compare, so never stale.
 */
export function isBundleStale(bundleSha: unknown, serverSha: unknown): boolean {
  if (typeof bundleSha !== 'string' || typeof serverSha !== 'string') return false;
  if (!bundleSha || !serverSha) return false;
  if (bundleSha === 'dev' || serverSha === 'dev') return false;
  return bundleSha !== serverSha;
}

/** Throttle: has enough time passed since the last check? 0 means never checked. */
export function shouldCheckNow(lastCheckAt: number, now: number, minIntervalMs: number): boolean {
  if (lastCheckAt <= 0) return true;
  return now - lastCheckAt >= minIntervalMs;
}

/*
 * Work that a reload would destroy (a video upload in flight). The banner
 * never reloads automatically while anything is registered here, and the
 * Refresh button asks the user to wait.
 */
let busyCount = 0;

/** Mark the page busy. Call the returned function when the work finishes. */
export function markBusy(): () => void {
  busyCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    busyCount = Math.max(0, busyCount - 1);
  };
}

export function isBusy(): boolean {
  return busyCount > 0;
}
