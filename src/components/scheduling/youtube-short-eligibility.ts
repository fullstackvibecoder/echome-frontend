/**
 * Mirror of backend src/services/social-posting/youtube-short.ts classifyShort.
 * Frontend gates on the aspect string the editor already has ('9:16' | '1:1' | '16:9'),
 * not raw pixel dimensions. Keep the rule identical: <=180s AND vertical/square.
 */
export const SHORT_MAX_SECONDS = 180;

export function youtubeShortBlockReason(
  durationSeconds: number,
  aspect: '9:16' | '1:1' | '16:9' | string,
): string | null {
  if (durationSeconds > SHORT_MAX_SECONDS) {
    return 'This clip is longer than 3 minutes, so it can’t post as a YouTube Short. Long-form YouTube posting is coming soon.';
  }
  if (aspect === '16:9') {
    return 'This clip isn’t vertical, so it can’t post as a YouTube Short. Long-form YouTube posting is coming soon.';
  }
  return null;
}
