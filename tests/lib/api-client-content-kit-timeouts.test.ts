/**
 * Regression tests — content-kit page API timeouts
 *
 * Every API method called from /app/content-kit/:id must use a timeout
 * strictly less than GENERATION_TIMEOUT (180 000 ms).  The Sentry error
 * "AxiosError: timeout of 180000ms exceeded" fires when these methods
 * inherit that value, holding the request open for 3 minutes before the
 * user sees any feedback.
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/114650205
 */

import axios, { type AxiosInstance } from 'axios';

jest.mock('axios');

// ── Build a minimal fake axios instance ─────────────────────────────────────
const mockGet  = jest.fn().mockResolvedValue({ data: { success: true, data: {} } });
const mockPost = jest.fn().mockResolvedValue({ data: { success: true, data: {} } });

const fakeInstance = {
  get:          mockGet,
  post:         mockPost,
  delete:       jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  patch:        jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  interceptors: {
    request:  { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: { baseURL: '', headers: { common: {} } },
} as unknown as AxiosInstance;

(axios.create as jest.Mock).mockReturnValue(fakeInstance);

// Import AFTER axios is mocked so the module picks up our fake instance
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require('@/lib/api-client') as typeof import('@/lib/api-client');

// ── Constants we're enforcing ────────────────────────────────────────────────
const GENERATION_TIMEOUT      = 180_000; // MUST NOT appear on the kit/:id page
const CONTENT_KIT_LOAD_TIMEOUT   = 60_000;
const CONTENT_KIT_ACTION_TIMEOUT = 90_000;

// ── Helpers ──────────────────────────────────────────────────────────────────
function lastGetTimeout()  { return (mockGet.mock.calls.at(-1)?.[1]  as any)?.timeout as number | undefined; }
function lastPostTimeout() { return (mockPost.mock.calls.at(-1)?.[2] as any)?.timeout as number | undefined; }

// ── Tests ────────────────────────────────────────────────────────────────────

describe('content-kit page — read paths must use CONTENT_KIT_LOAD_TIMEOUT (60 s)', () => {
  beforeEach(() => { mockGet.mockClear(); mockPost.mockClear(); });

  test('generation.getRequest uses 60 s (was: no timeout → axios default 15 s)', async () => {
    await api.generation.getRequest('req-1');
    const t = lastGetTimeout();
    expect(t).toBeDefined();
    expect(t).toBe(CONTENT_KIT_LOAD_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });

  test('contentKits.getLinkedReel uses 60 s (was: no timeout → axios default 15 s)', async () => {
    await api.contentKits.getLinkedReel('kit-1');
    const t = lastGetTimeout();
    expect(t).toBeDefined();
    expect(t).toBe(CONTENT_KIT_LOAD_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });
});

describe('content-kit page — mutation paths must use CONTENT_KIT_ACTION_TIMEOUT (90 s)', () => {
  beforeEach(() => { mockGet.mockClear(); mockPost.mockClear(); });

  test('contentKits.regenerate uses 90 s (was: 180 s)', async () => {
    await api.contentKits.regenerate('kit-1', { platforms: ['linkedin'] });
    const t = lastPostTimeout();
    expect(t).toBe(CONTENT_KIT_ACTION_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });

  test('contentKits.regenerateCarousel uses 90 s (new method, was: 180 s)', async () => {
    await api.contentKits.regenerateCarousel('kit-1', {});
    const t = lastPostTimeout();
    expect(t).toBe(CONTENT_KIT_ACTION_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });

  test('contentKits.resizeCarousel uses 90 s (was: 180 s)', async () => {
    await api.contentKits.resizeCarousel('kit-1', '1:1');
    const t = lastPostTimeout();
    expect(t).toBe(CONTENT_KIT_ACTION_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });

  test('contentKits.generateReelContent uses 90 s (was: 180 s)', async () => {
    await api.contentKits.generateReelContent('kit-1', undefined, 'tutorial');
    const t = lastPostTimeout();
    expect(t).toBe(CONTENT_KIT_ACTION_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });

  test('contentKits.createReelFromKit uses 90 s (was: 180 s)', async () => {
    await api.contentKits.createReelFromKit('kit-1', { templateId: 't', clips: [] });
    const t = lastPostTimeout();
    expect(t).toBe(CONTENT_KIT_ACTION_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });

  test('contentKits.generateCarouselReel uses 90 s (was: 180 s)', async () => {
    await api.contentKits.generateCarouselReel('kit-1', { smartTiming: true });
    const t = lastPostTimeout();
    expect(t).toBe(CONTENT_KIT_ACTION_TIMEOUT);
    expect(t).not.toBe(GENERATION_TIMEOUT);
  });
});

describe('timeout hierarchy sanity', () => {
  test('ACTION_TIMEOUT < GENERATION_TIMEOUT', () => {
    expect(CONTENT_KIT_ACTION_TIMEOUT).toBeLessThan(GENERATION_TIMEOUT);
  });

  test('LOAD_TIMEOUT < ACTION_TIMEOUT', () => {
    expect(CONTENT_KIT_LOAD_TIMEOUT).toBeLessThan(CONTENT_KIT_ACTION_TIMEOUT);
  });

  test('all content-kit timeouts are < 120 s for acceptable UX', () => {
    expect(CONTENT_KIT_LOAD_TIMEOUT).toBeLessThan(120_000);
    expect(CONTENT_KIT_ACTION_TIMEOUT).toBeLessThan(120_000);
  });
});
