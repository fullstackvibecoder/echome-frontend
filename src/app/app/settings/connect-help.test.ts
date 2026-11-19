import { describe, it, expect } from 'vitest';
import { didConnect, supportMailto } from './connect-help';

const T = Date.parse('2026-11-19T16:23:35Z');

describe('didConnect', () => {
  it('sees a new account connected after the start', () => {
    expect(didConnect([{ platform: 'instagram', connectedAt: '2026-11-19T16:24:34Z', status: 'connected' }], 'instagram', T)).toBe(true);
  });

  it('sees a reconnect even though the account count did not change', () => {
    expect(didConnect([{ platform: 'instagram', connectedAt: '2026-11-19T16:24:34Z' }], 'instagram', T)).toBe(true);
  });

  it('ignores an older account, another platform, and one still needing reconnect', () => {
    expect(didConnect([
      { platform: 'instagram', connectedAt: '2026-11-01T10:00:00Z', status: 'connected' },
      { platform: 'facebook', connectedAt: '2026-11-19T16:24:00Z', status: 'connected' },
      { platform: 'instagram', connectedAt: '2026-11-19T16:24:00Z', status: 'needs_reauth' },
    ], 'instagram', T)).toBe(false);
  });
});

describe('supportMailto', () => {
  it('addresses support with the platform and attempt time', () => {
    const href = supportMailto('Instagram', T);
    expect(href.startsWith('mailto:support@tryechome.com?subject=')).toBe(true);
    expect(decodeURIComponent(href)).toContain("Instagram didn't finish connecting");
    expect(decodeURIComponent(href)).toContain('2026-11-19T16:23:35.000Z');
  });
});
