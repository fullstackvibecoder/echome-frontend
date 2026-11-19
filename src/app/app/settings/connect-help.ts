/**
 * When a social connect has not come back. Meta and the other networks show
 * their errors (or a feed) on their own page and never redirect on failure,
 * so the only signal we get is "no new account appeared".
 */

export interface ConnectAccountLike {
  platform: string;
  connectedAt: string;
  status?: 'connected' | 'needs_reauth';
}

/** Clock-skew allowance between the browser and the server's connected_at. */
const SKEW_MS = 30_000;

/** True once an account for `platform` was (re)connected after `startedAt`. */
export function didConnect(accounts: ConnectAccountLike[], platform: string, startedAt: number): boolean {
  return accounts.some(
    (a) =>
      a.platform === platform &&
      a.status !== 'needs_reauth' &&
      new Date(a.connectedAt).getTime() >= startedAt - SKEW_MS,
  );
}

/** Seconds to wait before "you came back without connecting" counts. */
export const RETURN_GRACE_MS = 15_000;

/** Platform-specific checks shown under "Still stuck?". */
export const STUCK_TIPS: Record<string, string[]> = {
  instagram: [
    'Your Instagram must be a Business or Creator account. In the Instagram app: Settings, Account type and tools, Switch to professional account. It is free and takes a minute.',
    'When Instagram asks which account, pick the one you want EchoMe to post to.',
  ],
  threads: [
    'Threads needs an Instagram Business or Creator account linked to it.',
  ],
  facebook: [
    'Facebook only allows posting to a Facebook Page, not a personal profile. Pick your Page when asked.',
  ],
};

export function supportMailto(platformName: string, startedAt: number): string {
  const subject = `${platformName} didn't finish connecting`;
  const body = [
    `I tried to connect ${platformName} at ${new Date(startedAt).toISOString()} and it didn't finish.`,
    '',
    'What I saw (a screenshot helps):',
    '',
  ].join('\n');
  return `mailto:support@tryechome.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
