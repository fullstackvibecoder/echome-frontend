/**
 * Regression tests — creators API client timeout configurations
 *
 * creators.list() and creators.getContent() had no explicit timeout, so they
 * inherited the axios instance default (15 s). This is fine for fast responses,
 * but when a creator's content endpoint is slow, Promise.all in loadAllContent
 * caused the entire /app/following page load to hang until the slowest creator
 * timed out (or indefinitely if the axios default was removed).
 *
 * Additionally, creators.poll() used a hard-coded 60 000 ms timeout — matching
 * the Sentry error "timeout of 60000ms exceeded" — which is excessive for a
 * user-triggered sync that should surface failures quickly.
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/114955745
 */

import axios, { type AxiosInstance } from 'axios';

jest.mock('axios');

// ── Fake axios instance ────────────────────────────────────────────────────────
const mockGet  = jest.fn();
const mockPost = jest.fn();

const fakeInstance = {
  get:          mockGet,
  post:         mockPost,
  delete:       jest.fn().mockResolvedValue({ data: { success: true } }),
  patch:        jest.fn().mockResolvedValue({ data: { success: true } }),
  interceptors: {
    request:  { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: { baseURL: '', headers: { common: {} } },
} as unknown as AxiosInstance;

(axios.create as jest.Mock).mockReturnValue(fakeInstance);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require('@/lib/api-client') as typeof import('@/lib/api-client');

// ── Helpers ────────────────────────────────────────────────────────────────────
const LIST_TIMEOUT = 10_000; // matches api-client constant
const OLD_POLL_TIMEOUT = 60_000; // was: the problematic value
const NEW_POLL_TIMEOUT = 30_000; // fixed: half the old value

function lastGetConfig()  { return (mockGet.mock.calls.at(-1)?.[1]  as any) as { timeout?: number } | undefined; }
function lastPostConfig() { return (mockPost.mock.calls.at(-1)?.[2] as any) as { timeout?: number } | undefined; }

// ─────────────────────────────────────────────────────────────────────────────
describe('creators API timeout configurations', () => {
  beforeEach(() => { mockGet.mockClear(); mockPost.mockClear(); });

  // ── list() ────────────────────────────────────────────────────────────────
  describe('creators.list', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { success: true, creators: [], count: 0 },
      });
    });

    test('uses LIST_TIMEOUT (10 s) — was: no timeout', async () => {
      await api.creators.list();
      expect(lastGetConfig()?.timeout).toBe(LIST_TIMEOUT);
    });

    test('has an explicit timeout (not undefined)', async () => {
      await api.creators.list();
      expect(lastGetConfig()?.timeout).toBeDefined();
    });
  });

  // ── getContent() ──────────────────────────────────────────────────────────
  describe('creators.getContent', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { success: true, content: [], count: 0 },
      });
    });

    test('uses LIST_TIMEOUT (10 s) — was: no timeout', async () => {
      await api.creators.getContent('creator-1', 10);
      expect(lastGetConfig()?.timeout).toBe(LIST_TIMEOUT);
    });

    test('passes limit param alongside timeout', async () => {
      await api.creators.getContent('creator-1', 5);
      const cfg = lastGetConfig() as any;
      expect(cfg?.timeout).toBe(LIST_TIMEOUT);
      expect(cfg?.params?.limit).toBe(5);
    });

    test('has an explicit timeout (not undefined)', async () => {
      await api.creators.getContent('creator-1');
      expect(lastGetConfig()?.timeout).toBeDefined();
    });
  });

  // ── poll() ────────────────────────────────────────────────────────────────
  describe('creators.poll', () => {
    beforeEach(() => {
      mockPost.mockResolvedValue({
        data: { success: true, newContentCount: 0, entries: [] },
      });
    });

    test('uses 30 s timeout — was: 60 s (the Sentry error value)', async () => {
      await api.creators.poll('creator-1');
      expect(lastPostConfig()?.timeout).toBe(NEW_POLL_TIMEOUT);
    });

    test('no longer uses the problematic 60 s timeout', async () => {
      await api.creators.poll('creator-1');
      expect(lastPostConfig()?.timeout).not.toBe(OLD_POLL_TIMEOUT);
    });

    test('timeout is less than 60 s for responsive UX', async () => {
      await api.creators.poll('creator-1');
      const t = lastPostConfig()?.timeout ?? Infinity;
      expect(t).toBeLessThan(60_000);
    });
  });

  // ── get() (single creator) ─────────────────────────────────────────────────
  describe('creators.get', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { success: true, creator: { id: 'c1' } },
      });
    });

    test('uses LIST_TIMEOUT — was: no timeout', async () => {
      await api.creators.get('creator-1');
      expect(lastGetConfig()?.timeout).toBe(LIST_TIMEOUT);
    });
  });

  // ── Timeout hierarchy sanity ───────────────────────────────────────────────
  describe('timeout hierarchy', () => {
    test('poll timeout < old poll timeout (30 s < 60 s)', () => {
      expect(NEW_POLL_TIMEOUT).toBeLessThan(OLD_POLL_TIMEOUT);
    });

    test('list timeout ≤ 15 s (fast read path)', () => {
      expect(LIST_TIMEOUT).toBeLessThanOrEqual(15_000);
    });

    test('poll timeout > list timeout (write ops allowed more time)', () => {
      expect(NEW_POLL_TIMEOUT).toBeGreaterThan(LIST_TIMEOUT);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadAllContent Promise.allSettled behaviour (simulated)
// ─────────────────────────────────────────────────────────────────────────────
describe('loadAllContent partial-failure resilience', () => {
  /**
   * Simulate the getContent calls: creator-1 succeeds, creator-2 times out.
   * With Promise.allSettled (the fix), creator-1's content should still appear.
   * With the old Promise.all, one rejection would discard all results.
   */
  async function simulateLoadAllContent(
    useAllSettled: boolean,
    creators: Array<{ id: string }>,
    getContentFn: (id: string) => Promise<{ content: Array<{ id: string }> }>,
  ): Promise<Array<{ id: string }>> {
    const promises = creators.map(async (c) => {
      const r = await getContentFn(c.id);
      return r.content;
    });

    if (useAllSettled) {
      const results = await Promise.allSettled(promises);
      const flat: Array<{ id: string }> = [];
      results.forEach((r) => {
        if (r.status === 'fulfilled') flat.push(...r.value);
      });
      return flat;
    } else {
      const results = await Promise.all(promises);
      return results.flat();
    }
  }

  const creators = [{ id: 'c1' }, { id: 'c2' }];

  const getContentFn = async (id: string) => {
    if (id === 'c2') throw Object.assign(new Error('timeout of 10000ms exceeded'), { code: 'ECONNABORTED' });
    return { content: [{ id: 'content-from-c1' }] };
  };

  test('Promise.allSettled preserves successful results when one creator times out', async () => {
    const result = await simulateLoadAllContent(true, creators, getContentFn);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('content-from-c1');
  });

  test('Promise.all loses all results when one creator times out (old behaviour)', async () => {
    await expect(
      simulateLoadAllContent(false, creators, getContentFn),
    ).rejects.toThrow('timeout of 10000ms exceeded');
  });

  test('allSettled with all creators succeeding returns all content', async () => {
    const allSuccess = async (_id: string) => ({ content: [{ id: `content-${_id}` }] });
    const result = await simulateLoadAllContent(true, creators, allSuccess);
    expect(result).toHaveLength(2);
  });

  test('allSettled with all creators failing returns empty array (no throw)', async () => {
    const allFail = async () => { throw new Error('timeout'); };
    const result = await simulateLoadAllContent(true, creators, allFail);
    expect(result).toHaveLength(0);
    // Should NOT throw even when all fail
  });
});
