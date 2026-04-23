/**
 * Regression tests — socialPosting API client error handling
 *
 * Ensures that 500 (and other HTTP errors) from the social-posting backend
 * are surfaced as user-friendly Error messages rather than raw AxiosError
 * objects, which previously caused Sentry noise from /app/content-kit/:id.
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/114700865
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';

jest.mock('axios');

// ── Fake axios instance ────────────────────────────────────────────────────────
const mockPost = jest.fn();
const mockGet  = jest.fn();

const fakeInstance = {
  post:         mockPost,
  get:          mockGet,
  delete:       jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  patch:        jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  interceptors: {
    request:  { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: { baseURL: '', headers: { common: {} } },
} as unknown as AxiosInstance;

(axios.create as jest.Mock).mockReturnValue(fakeInstance);

// Import AFTER axios is mocked
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require('@/lib/api-client') as typeof import('@/lib/api-client');

// ── Helpers ────────────────────────────────────────────────────────────────────
function axiosError(status: number, body: Record<string, unknown> = {}) {
  const err = Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: body },
    isAxiosError: true,
  });
  return err;
}

const SCHEDULE_DATA = {
  platform: 'instagram',
  text: 'Hello world',
  scheduledAt: new Date(Date.now() + 86400000).toISOString(),
};

const FANOUT_DATA = {
  text: 'Hello world',
  rows: [{ platform: 'instagram', scheduled_at: new Date(Date.now() + 86400000).toISOString() }],
  created_via: 'manual_inline' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// socialPosting.schedule
// ─────────────────────────────────────────────────────────────────────────────
describe('api.socialPosting.schedule error handling', () => {
  beforeEach(() => { mockPost.mockClear(); });

  test('success returns response data', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { id: 'post-1', status: 'scheduled' } },
    });
    const r = await api.socialPosting.schedule(SCHEDULE_DATA);
    expect(r.success).toBe(true);
  });

  test('400 with backend message throws that message', async () => {
    mockPost.mockRejectedValue(
      axiosError(400, { error: 'scheduledAt must be a valid ISO datetime' }),
    );
    await expect(api.socialPosting.schedule(SCHEDULE_DATA)).rejects.toThrow(
      'scheduledAt must be a valid ISO datetime',
    );
  });

  test('402 throws subscription message', async () => {
    mockPost.mockRejectedValue(axiosError(402));
    await expect(api.socialPosting.schedule(SCHEDULE_DATA)).rejects.toThrow(
      /Studio subscription/i,
    );
  });

  test('403 throws permission message', async () => {
    mockPost.mockRejectedValue(axiosError(403));
    await expect(api.socialPosting.schedule(SCHEDULE_DATA)).rejects.toThrow(
      /permission/i,
    );
  });

  test('500 with backend message surfaces that message (not raw AxiosError)', async () => {
    mockPost.mockRejectedValue(
      axiosError(500, { error: 'OUTSTAND_API_KEY environment variable is not set' }),
    );
    await expect(api.socialPosting.schedule(SCHEDULE_DATA)).rejects.toThrow(
      'OUTSTAND_API_KEY environment variable is not set',
    );
  });

  test('500 without backend message returns fallback string', async () => {
    mockPost.mockRejectedValue(axiosError(500));
    await expect(api.socialPosting.schedule(SCHEDULE_DATA)).rejects.toThrow(
      /Unable to reach the posting service/i,
    );
  });

  test('500 error is a plain Error, not an AxiosError', async () => {
    mockPost.mockRejectedValue(axiosError(500, { error: 'oops' }));
    const err = await api.socialPosting.schedule(SCHEDULE_DATA).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// socialPosting.scheduleFanout
// ─────────────────────────────────────────────────────────────────────────────
describe('api.socialPosting.scheduleFanout error handling', () => {
  beforeEach(() => { mockPost.mockClear(); });

  test('success returns fanout_id', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { fanout_id: 'f-1', created_post_ids: ['p-1'] } },
    });
    const r = await api.socialPosting.scheduleFanout(FANOUT_DATA);
    expect(r.success).toBe(true);
  });

  test('403 throws Studio-required message', async () => {
    mockPost.mockRejectedValue(axiosError(403));
    await expect(api.socialPosting.scheduleFanout(FANOUT_DATA)).rejects.toThrow(
      /Studio plan/i,
    );
  });

  test('500 with backend message surfaces it', async () => {
    mockPost.mockRejectedValue(
      axiosError(500, { error: 'Outstand API error 503: upstream unavailable' }),
    );
    await expect(api.socialPosting.scheduleFanout(FANOUT_DATA)).rejects.toThrow(
      /Outstand API error/i,
    );
  });

  test('500 without message returns actionable fallback', async () => {
    mockPost.mockRejectedValue(axiosError(500));
    await expect(api.socialPosting.scheduleFanout(FANOUT_DATA)).rejects.toThrow(
      /Unable to reach the posting service/i,
    );
  });

  test('uses 90 s timeout (not 180 s) — checked via post call args', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: {} } });
    await api.socialPosting.scheduleFanout(FANOUT_DATA);
    const config = mockPost.mock.calls[0]?.[2] as { timeout?: number } | undefined;
    expect(config?.timeout).toBeDefined();
    expect(config!.timeout).toBe(90_000);
    expect(config!.timeout).not.toBe(180_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// socialPosting.suggestSchedule
// ─────────────────────────────────────────────────────────────────────────────
describe('api.socialPosting.suggestSchedule error handling', () => {
  beforeEach(() => { mockPost.mockClear(); });

  test('success returns rows', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { kit_id: 'k-1', rows: [], timezone: 'UTC', kit_title: 'T' } },
    });
    const r = await api.socialPosting.suggestSchedule({ kit_id: 'k-1' });
    expect(r.success).toBe(true);
  });

  test('404 throws kit-not-found message', async () => {
    mockPost.mockRejectedValue(axiosError(404));
    await expect(api.socialPosting.suggestSchedule({ kit_id: 'k-1' })).rejects.toThrow(
      /not found/i,
    );
  });

  test('500 with backend message surfaces it', async () => {
    mockPost.mockRejectedValue(
      axiosError(500, { error: 'Content kit not found' }),
    );
    await expect(api.socialPosting.suggestSchedule({ kit_id: 'k-1' })).rejects.toThrow(
      'Content kit not found',
    );
  });

  test('500 without message returns actionable fallback', async () => {
    mockPost.mockRejectedValue(axiosError(500));
    await expect(api.socialPosting.suggestSchedule({ kit_id: 'k-1' })).rejects.toThrow(
      /Could not generate schedule suggestions/i,
    );
  });

  test('uses 30 s timeout', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { rows: [] } } });
    await api.socialPosting.suggestSchedule({ kit_id: 'k-1' });
    const config = mockPost.mock.calls[0]?.[2] as { timeout?: number } | undefined;
    expect(config?.timeout).toBe(30_000);
  });
});
