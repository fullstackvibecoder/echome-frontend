/**
 * Regression tests — /app dashboard page timeout fixes
 *
 * Root cause (Sentry #116396435):
 * LIST_TIMEOUT was 10 000 ms.  On cold-start or under load the backend's DB
 * queries for /reels/templates and /reels/music took 10-12 s, causing the
 * axios request to time out and surface as a Sentry alert.  These calls fire
 * on the /app dashboard home page via GenerationForm.loadReelOptions().
 *
 * Additional gaps:
 *   - generation.listRequests had no explicit timeout (axios 15 s default)
 *   - stripe.getUsageLimits had no explicit timeout
 *   - stripe.getSubscription had no explicit timeout
 *   - creators.getPendingRepurpose had no explicit timeout
 *
 * Fix:
 *   - LIST_TIMEOUT increased from 10 000 ms → 20 000 ms
 *   - Explicit LIST_TIMEOUT applied to all four methods above
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/116396435
 */

import axios, { type AxiosInstance } from 'axios';

jest.mock('axios');

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

const NEW_LIST_TIMEOUT = 20_000;

function lastGetConfig() {
  return mockGet.mock.calls.at(-1)?.[1] as { timeout?: number; params?: unknown } | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify that all dashboard-load calls use LIST_TIMEOUT = 20 s (not 10 s)
// ─────────────────────────────────────────────────────────────────────────────
describe('Dashboard page — timeout configuration', () => {
  beforeEach(() => { mockGet.mockClear(); mockPost.mockClear(); });

  // ── reels.listTemplates ───────────────────────────────────────────────────
  test('reels.listTemplates uses LIST_TIMEOUT (20 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.reels.listTemplates();
    expect(lastGetConfig()?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  test('reels.listTemplates timeout is NOT the old 10 s', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.reels.listTemplates();
    expect(lastGetConfig()?.timeout).not.toBe(10_000);
  });

  // ── reels.listMusic ───────────────────────────────────────────────────────
  test('reels.listMusic uses LIST_TIMEOUT (20 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.reels.listMusic({ limit: 20 });
    expect(lastGetConfig()?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  // ── generation.listRequests ───────────────────────────────────────────────
  test('generation.listRequests now has an explicit LIST_TIMEOUT (20 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.generation.listRequests({ limit: 3 });
    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBeDefined();
    expect(cfg?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  test('generation.listRequests passes params alongside timeout', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.generation.listRequests({ limit: 5, offset: 10 });
    const cfg = lastGetConfig() as any;
    expect(cfg?.timeout).toBe(NEW_LIST_TIMEOUT);
    expect(cfg?.params?.limit).toBe(5);
    expect(cfg?.params?.offset).toBe(10);
  });

  // ── stripe.getUsageLimits ─────────────────────────────────────────────────
  test('stripe.getUsageLimits now has explicit LIST_TIMEOUT (20 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {} } });
    await api.stripe.getUsageLimits();
    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBeDefined();
    expect(cfg?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  // ── stripe.getSubscription ────────────────────────────────────────────────
  test('stripe.getSubscription now has explicit LIST_TIMEOUT (20 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {} } });
    await api.stripe.getSubscription();
    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBeDefined();
    expect(cfg?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  test('stripe.getSubscription with justPaid=true also uses LIST_TIMEOUT', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: {} } });
    await api.stripe.getSubscription(true);
    expect(lastGetConfig()?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  // ── creators.getPendingRepurpose ──────────────────────────────────────────
  test('creators.getPendingRepurpose now has explicit LIST_TIMEOUT (20 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, content: [] } });
    await api.creators.getPendingRepurpose(10);
    const cfg = lastGetConfig();
    expect(cfg?.timeout).toBeDefined();
    expect(cfg?.timeout).toBe(NEW_LIST_TIMEOUT);
  });

  // ── Sanity: timeout > 10 s on all dashboard calls ─────────────────────────
  test('all dashboard-load calls use timeout > 10 s (prevents the original Sentry error)', async () => {
    const calls = [
      async () => { await api.reels.listTemplates(); },
      async () => { await api.reels.listMusic(); },
      async () => { await api.generation.listRequests(); },
      async () => { await api.stripe.getUsageLimits(); },
      async () => { await api.stripe.getSubscription(); },
      async () => { await api.creators.getPendingRepurpose(); },
    ];

    mockGet.mockResolvedValue({ data: { success: true, data: [] } });

    for (const call of calls) {
      mockGet.mockClear();
      await call();
      const timeout = lastGetConfig()?.timeout;
      expect(timeout).toBeDefined();
      // Must be strictly greater than the old 10 s that was causing timeouts
      expect(timeout).toBeGreaterThan(10_000);
    }
  });
});
