/**
 * Regression tests — scheduling API client error handling
 *
 * scheduling.create() and scheduling.update() had no try/catch, so raw
 * AxiosError objects propagated to Sentry when the backend returned 4xx/5xx.
 * On /app/content-kit/:id the handleQuickSchedule callback also lacked a
 * try/catch, so any scheduling failure caused an unhandled promise rejection.
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/114703956
 */

import axios, { type AxiosInstance } from 'axios';

jest.mock('axios');

// ── Fake axios instance ────────────────────────────────────────────────────────
const mockPost  = jest.fn();
const mockPatch = jest.fn();
const mockGet   = jest.fn();

const fakeInstance = {
  post:         mockPost,
  patch:        mockPatch,
  get:          mockGet,
  delete:       jest.fn().mockResolvedValue({ data: { success: true } }),
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
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: body },
    isAxiosError: true,
  });
}

const CREATE_DATA = {
  contentKitId: 'kit-1',
  scheduledFor: new Date(Date.now() + 86400000).toISOString(),
  platforms: ['instagram'],
};

const UPDATE_DATA = {
  scheduledFor: new Date(Date.now() + 172800000).toISOString(),
  platforms: ['linkedin'],
};

// ─────────────────────────────────────────────────────────────────────────────
// scheduling.create
// ─────────────────────────────────────────────────────────────────────────────
describe('api.scheduling.create error handling', () => {
  beforeEach(() => { mockPost.mockClear(); });

  test('success returns post object', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          post: {
            id: 'sched-1',
            content_kit_id: 'kit-1',
            scheduled_for: CREATE_DATA.scheduledFor,
            platforms: ['instagram'],
            status: 'scheduled',
          },
        },
        timestamp: new Date().toISOString(),
      },
    });

    const r = await api.scheduling.create(CREATE_DATA);
    expect(r.success).toBe(true);
    expect(r.data.post?.id).toBe('sched-1');
    expect(r.data.post?.scheduledFor).toBe(CREATE_DATA.scheduledFor);
  });

  test('400 with backend message surfaces that message', async () => {
    mockPost.mockRejectedValue(
      axiosError(400, { error: 'scheduledFor is required' }),
    );
    await expect(api.scheduling.create(CREATE_DATA)).rejects.toThrow('scheduledFor is required');
  });

  test('401 throws session-expired message', async () => {
    mockPost.mockRejectedValue(axiosError(401));
    await expect(api.scheduling.create(CREATE_DATA)).rejects.toThrow(/log in again/i);
  });

  test('403 throws permission message', async () => {
    mockPost.mockRejectedValue(axiosError(403));
    await expect(api.scheduling.create(CREATE_DATA)).rejects.toThrow(/permission/i);
  });

  test('500 with backend message surfaces it (not raw AxiosError)', async () => {
    mockPost.mockRejectedValue(
      axiosError(500, { error: 'column "scheduled_for" of relation "scheduled_posts" does not exist' }),
    );
    await expect(api.scheduling.create(CREATE_DATA)).rejects.toThrow(
      'column "scheduled_for" of relation "scheduled_posts" does not exist',
    );
  });

  test('500 without backend message returns actionable fallback', async () => {
    mockPost.mockRejectedValue(axiosError(500));
    await expect(api.scheduling.create(CREATE_DATA)).rejects.toThrow(
      /Failed to save the scheduled post/i,
    );
  });

  test('500 error is a plain Error, not an AxiosError', async () => {
    mockPost.mockRejectedValue(axiosError(500, { error: 'db constraint' }));
    const err = await api.scheduling.create(CREATE_DATA).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
  });

  test('network error (no response) is re-thrown as-is', async () => {
    const networkErr = new Error('Network Error');
    mockPost.mockRejectedValue(networkErr);
    await expect(api.scheduling.create(CREATE_DATA)).rejects.toThrow('Network Error');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scheduling.update
// ─────────────────────────────────────────────────────────────────────────────
describe('api.scheduling.update error handling', () => {
  beforeEach(() => { mockPatch.mockClear(); });

  test('success returns updated post', async () => {
    mockPatch.mockResolvedValue({
      data: {
        success: true,
        data: {
          post: {
            id: 'sched-1',
            content_kit_id: 'kit-1',
            scheduled_for: UPDATE_DATA.scheduledFor,
            platforms: ['linkedin'],
            status: 'scheduled',
          },
        },
        timestamp: new Date().toISOString(),
      },
    });

    const r = await api.scheduling.update('sched-1', UPDATE_DATA);
    expect(r.success).toBe(true);
    expect(r.data.post?.scheduledFor).toBe(UPDATE_DATA.scheduledFor);
  });

  test('404 throws not-found message', async () => {
    mockPatch.mockRejectedValue(axiosError(404));
    await expect(api.scheduling.update('gone', UPDATE_DATA)).rejects.toThrow(
      /not found/i,
    );
  });

  test('403 throws permission message', async () => {
    mockPatch.mockRejectedValue(axiosError(403));
    await expect(api.scheduling.update('sched-1', UPDATE_DATA)).rejects.toThrow(
      /permission/i,
    );
  });

  test('500 with backend message surfaces it', async () => {
    mockPatch.mockRejectedValue(
      axiosError(500, { error: 'Internal server error updating scheduled post' }),
    );
    await expect(api.scheduling.update('sched-1', UPDATE_DATA)).rejects.toThrow(
      'Internal server error updating scheduled post',
    );
  });

  test('500 without backend message returns actionable fallback', async () => {
    mockPatch.mockRejectedValue(axiosError(500));
    await expect(api.scheduling.update('sched-1', UPDATE_DATA)).rejects.toThrow(
      /Failed to update the scheduled post/i,
    );
  });

  test('update error is a plain Error, not an AxiosError', async () => {
    mockPatch.mockRejectedValue(axiosError(500));
    const err = await api.scheduling.update('sched-1', UPDATE_DATA).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
  });
});
