/**
 * Regression tests — /app/content-kit page 500 error handling
 *
 * Several API methods called on or near the /app/content-kit page had no
 * error handling, so raw AxiosErrors bubbled to Sentry on 500 responses.
 *
 * Methods fixed:
 *  - api.contentKits.list()      — primary content-kit list call (10 s timeout)
 *  - api.socialPosting.getCalendar() — used by useScheduledKitCounts (10 s timeout)
 *  - api.teamVoices.list()       — called by VoiceProvider (app layout)
 *  - api.teamVoices.getLimits()  — called by VoiceProvider
 *  - api.teamVoices.createDefault() — called by VoiceProvider fallback
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/114958019
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
const LIST_TIMEOUT = 10_000;

function axiosError(status: number, body: Record<string, unknown> = {}) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: body },
    isAxiosError: true,
  });
}

function timeoutError() {
  return Object.assign(new Error('timeout of 10000ms exceeded'), {
    code: 'ECONNABORTED',
    isAxiosError: true,
  });
}

function lastGetConfig() {
  return mockGet.mock.calls.at(-1)?.[1] as { timeout?: number; params?: unknown } | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// contentKits.list
// ─────────────────────────────────────────────────────────────────────────────
describe('api.contentKits.list error handling', () => {
  beforeEach(() => { mockGet.mockClear(); });

  const kitRow = {
    id: 'kit-1', user_id: 'u-1', title: 'Test', created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  test('success returns transformed kits', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { kits: [kitRow] } } });
    const r = await api.contentKits.list(20, 0);
    expect(r.success).toBe(true);
    expect(r.data.kits).toHaveLength(1);
    expect(r.data.kits[0].id).toBe('kit-1');
  });

  test('uses LIST_TIMEOUT (10 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { kits: [] } } });
    await api.contentKits.list(20, 0);
    expect(lastGetConfig()?.timeout).toBe(LIST_TIMEOUT);
  });

  test('401 throws login message', async () => {
    mockGet.mockRejectedValue(axiosError(401));
    await expect(api.contentKits.list()).rejects.toThrow(/log in/i);
  });

  test('403 throws permission message', async () => {
    mockGet.mockRejectedValue(axiosError(403));
    await expect(api.contentKits.list()).rejects.toThrow(/permission/i);
  });

  test('500 with backend message surfaces it', async () => {
    mockGet.mockRejectedValue(axiosError(500, { error: 'relation "content_kits" does not exist' }));
    await expect(api.contentKits.list()).rejects.toThrow('relation "content_kits" does not exist');
  });

  test('500 without backend message returns actionable fallback', async () => {
    mockGet.mockRejectedValue(axiosError(500));
    await expect(api.contentKits.list()).rejects.toThrow(/Server error loading your content/i);
  });

  test('timeout returns user-friendly message', async () => {
    mockGet.mockRejectedValue(timeoutError());
    await expect(api.contentKits.list()).rejects.toThrow(/took too long/i);
  });

  test('500 error is a plain Error, not AxiosError', async () => {
    mockGet.mockRejectedValue(axiosError(500));
    const err = await api.contentKits.list().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// socialPosting.getCalendar (used by useScheduledKitCounts on /app/content-kit)
// ─────────────────────────────────────────────────────────────────────────────
describe('api.socialPosting.getCalendar timeout', () => {
  beforeEach(() => { mockGet.mockClear(); });

  const calendarResp = {
    data: {
      success: true,
      data: { events: [], this_week: { scheduled: 0, posted: 0, failed: 0 } },
    },
  };

  test('uses LIST_TIMEOUT (10 s) — was: no timeout', async () => {
    mockGet.mockResolvedValue(calendarResp);
    await api.socialPosting.getCalendar();
    expect(lastGetConfig()?.timeout).toBe(LIST_TIMEOUT);
  });

  test('has an explicit timeout (not undefined)', async () => {
    mockGet.mockResolvedValue(calendarResp);
    await api.socialPosting.getCalendar();
    expect(lastGetConfig()?.timeout).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// teamVoices.list
// ─────────────────────────────────────────────────────────────────────────────
describe('api.teamVoices.list error handling', () => {
  beforeEach(() => { mockGet.mockClear(); });

  test('success returns transformed voices', async () => {
    mockGet.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 'v-1', user_id: 'u-1', name: 'Voice 1', is_default: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      },
    });
    const r = await api.teamVoices.list();
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(1);
  });

  test('uses LIST_TIMEOUT (10 s)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.teamVoices.list();
    expect(lastGetConfig()?.timeout).toBe(LIST_TIMEOUT);
  });

  test('404 returns empty voice list (feature not deployed yet)', async () => {
    mockGet.mockRejectedValue(axiosError(404));
    const r = await api.teamVoices.list();
    expect(r.success).toBe(true);
    expect(r.data).toEqual([]);
  });

  test('500 throws plain Error with user-friendly message', async () => {
    mockGet.mockRejectedValue(axiosError(500, { error: 'database error' }));
    const err = await api.teamVoices.list().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
    expect(err.message).toMatch(/database error/i);
  });

  test('500 without message returns fallback', async () => {
    mockGet.mockRejectedValue(axiosError(500));
    await expect(api.teamVoices.list()).rejects.toThrow(/Failed to load team voices/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// teamVoices.getLimits
// ─────────────────────────────────────────────────────────────────────────────
describe('api.teamVoices.getLimits error handling', () => {
  beforeEach(() => { mockGet.mockClear(); });

  test('404 returns unsuccessful response (caller has tier-based fallback)', async () => {
    mockGet.mockRejectedValue(axiosError(404));
    const r = await api.teamVoices.getLimits();
    expect(r.success).toBe(false);
  });

  test('501 returns unsuccessful response', async () => {
    mockGet.mockRejectedValue(axiosError(501));
    const r = await api.teamVoices.getLimits();
    expect(r.success).toBe(false);
  });

  test('500 throws plain Error', async () => {
    mockGet.mockRejectedValue(axiosError(500));
    const err = await api.teamVoices.getLimits().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// teamVoices.createDefault
// ─────────────────────────────────────────────────────────────────────────────
describe('api.teamVoices.createDefault error handling', () => {
  beforeEach(() => { mockPost.mockClear(); });

  test('404 throws "not available yet" message', async () => {
    mockPost.mockRejectedValue(axiosError(404));
    await expect(api.teamVoices.createDefault()).rejects.toThrow(/not available yet/i);
  });

  test('500 with backend message surfaces it', async () => {
    mockPost.mockRejectedValue(axiosError(500, { error: 'KB not found' }));
    await expect(api.teamVoices.createDefault()).rejects.toThrow('KB not found');
  });

  test('500 without message returns fallback', async () => {
    mockPost.mockRejectedValue(axiosError(500));
    await expect(api.teamVoices.createDefault()).rejects.toThrow(/Failed to create default voice/i);
  });

  test('500 error is plain Error (not AxiosError)', async () => {
    mockPost.mockRejectedValue(axiosError(500));
    const err = await api.teamVoices.createDefault().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
  });
});
