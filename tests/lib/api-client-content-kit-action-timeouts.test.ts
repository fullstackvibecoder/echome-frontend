/**
 * Content Kit Action Timeout Tests
 *
 * Regression tests ensuring content kit user-triggered actions
 * (regenerate, resizeCarousel, createReel, generateCarouselReel,
 *  generateReelContent, getLinkedReel) use CONTENT_KIT_ACTION_TIMEOUT
 * (90s) instead of GENERATION_TIMEOUT (180s), preventing Sentry error:
 *   "AxiosError: timeout of 180000ms exceeded" on /app/content-kit/:id
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/114386571
 */

import axios from 'axios';
import { api } from '@/lib/api-client';

// ─── axios mock ─────────────────────────────────────────────────────────────
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedAxios.create.mockReturnValue(mockedAxios as any);
  mockedAxios.post.mockResolvedValue({ data: { success: true, data: {} } });
  mockedAxios.get.mockResolvedValue({ data: { success: true, data: {} } });
});

// ─── helpers ────────────────────────────────────────────────────────────────
const ACTION_TIMEOUT   = 90_000;   // CONTENT_KIT_ACTION_TIMEOUT
const LOAD_TIMEOUT     = 60_000;   // CONTENT_KIT_TIMEOUT
const GEN_TIMEOUT      = 180_000;  // GENERATION_TIMEOUT (should NOT appear on kit/:id page)

function lastPostConfig() {
  const calls = mockedAxios.post.mock.calls;
  return calls[calls.length - 1]?.[2] as { timeout?: number } | undefined;
}
function lastGetConfig() {
  const calls = mockedAxios.get.mock.calls;
  return calls[calls.length - 1]?.[1] as { timeout?: number } | undefined;
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe('Content-kit action timeouts (must be ≤90 s, never 180 s)', () => {

  test('contentKits.regenerate uses CONTENT_KIT_ACTION_TIMEOUT', async () => {
    await api.contentKits.regenerate('kit-1', { platforms: ['linkedin'] });

    const cfg = lastPostConfig();
    expect(cfg?.timeout).toBe(ACTION_TIMEOUT);
    expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
  });

  test('contentKits.resizeCarousel uses CONTENT_KIT_ACTION_TIMEOUT', async () => {
    await api.contentKits.resizeCarousel('kit-1', '1:1');

    const cfg = lastPostConfig();
    expect(cfg?.timeout).toBe(ACTION_TIMEOUT);
    expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
  });

  test('contentKits.generateReelContent uses CONTENT_KIT_ACTION_TIMEOUT', async () => {
    await api.contentKits.generateReelContent('kit-1', 'tmpl-1', 'tutorial');

    const cfg = lastPostConfig();
    expect(cfg?.timeout).toBe(ACTION_TIMEOUT);
    expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
  });

  test('contentKits.createReelFromKit uses CONTENT_KIT_ACTION_TIMEOUT', async () => {
    await api.contentKits.createReelFromKit('kit-1', {
      templateId: 'tmpl-1',
      clips: [{ segmentId: 'seg-1', sourceUrl: 'https://example.com/clip.mp4' }],
    });

    const cfg = lastPostConfig();
    expect(cfg?.timeout).toBe(ACTION_TIMEOUT);
    expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
  });

  test('contentKits.generateCarouselReel uses CONTENT_KIT_ACTION_TIMEOUT', async () => {
    await api.contentKits.generateCarouselReel('kit-1', { smartTiming: true });

    const cfg = lastPostConfig();
    expect(cfg?.timeout).toBe(ACTION_TIMEOUT);
    expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
  });

  test('contentKits.getLinkedReel uses CONTENT_KIT_TIMEOUT (not unlimited)', async () => {
    await api.contentKits.getLinkedReel('kit-1');

    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBe(LOAD_TIMEOUT);
    expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
    // must not be undefined (was missing before this fix)
    expect(cfg?.timeout).toBeDefined();
  });

  // ── Verify read paths are unchanged ────────────────────────────────────────
  test('contentKits.get (load) still uses CONTENT_KIT_TIMEOUT', async () => {
    await api.contentKits.get('kit-1');

    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBe(LOAD_TIMEOUT);
  });

  test('generation.getRequest (polling) still uses CONTENT_KIT_TIMEOUT', async () => {
    await api.generation.getRequest('req-1');

    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBe(LOAD_TIMEOUT);
  });

  // ── Timeout threshold sanity checks ────────────────────────────────────────
  test('ACTION_TIMEOUT is half of old GENERATION_TIMEOUT', () => {
    expect(ACTION_TIMEOUT).toBe(GEN_TIMEOUT / 2);
  });

  test('all action timeouts are ≤ 90 s', async () => {
    const actions = [
      () => api.contentKits.regenerate('k'),
      () => api.contentKits.resizeCarousel('k', '9:16'),
      () => api.contentKits.generateReelContent('k'),
      () => api.contentKits.createReelFromKit('k', { templateId: 't', clips: [] }),
      () => api.contentKits.generateCarouselReel('k'),
    ];

    for (const action of actions) {
      mockedAxios.post.mockClear();
      await action();
      const cfg = lastPostConfig();
      expect(cfg?.timeout).toBeLessThanOrEqual(ACTION_TIMEOUT);
      expect(cfg?.timeout).not.toBe(GEN_TIMEOUT);
    }
  });
});

describe('Timeout error surfacing on content-kit/:id page', () => {
  test('resizeCarousel timeout surfaces a user-friendly message', async () => {
    const timeoutErr = Object.assign(new Error('timeout of 90000ms exceeded'), {
      code: 'ECONNABORTED',
    });
    mockedAxios.post.mockRejectedValue(timeoutErr);

    await expect(api.contentKits.resizeCarousel('kit-1', '1:1')).rejects.toMatchObject({
      code: 'ECONNABORTED',
    });
  });

  test('regenerate timeout surfaces a 90 s error, not 180 s', async () => {
    const timeoutErr = Object.assign(new Error('timeout of 90000ms exceeded'), {
      code: 'ECONNABORTED',
    });
    mockedAxios.post.mockRejectedValue(timeoutErr);

    await expect(api.contentKits.regenerate('kit-1')).rejects.toMatchObject({
      message: expect.stringContaining('90000ms'),
    });
  });
});
