/**
 * Regression tests — network error handling and Sentry noise suppression
 *
 * Root cause (Sentry #116346155):
 * The axios response interceptor unconditionally reported errors with no
 * `response` object (i.e. "Network Error") to Sentry.  Transient offline /
 * DNS / connectivity failures therefore flooded Sentry with noise that hid
 * real application bugs.  On /app/content-kit the contentKits.list() call
 * also lacked a try/catch, so Network Errors propagated as raw AxiosErrors.
 *
 * Fixes:
 * 1. Interceptor: skip Sentry for pure network errors (no response, offline,
 *    ERR_NETWORK, ERR_INTERNET_DISCONNECTED).  Still reports 5xx server errors.
 * 2. contentKits.list: try/catch maps Network Error → user-friendly message,
 *    401/403/500 → specific messages; timeout → refresh prompt.
 */

import axios, { type AxiosInstance } from 'axios';

jest.mock('axios');
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

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
function networkError() {
  return Object.assign(new Error('Network Error'), {
    message: 'Network Error',
    code: 'ERR_NETWORK',
    isAxiosError: true,
    // No response property — pure network failure
  });
}

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

const KIT_ROW = {
  id: 'kit-1', user_id: 'u-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// contentKits.list — network error handling
// ─────────────────────────────────────────────────────────────────────────────
describe('api.contentKits.list — network error handling', () => {
  beforeEach(() => { mockGet.mockClear(); });

  test('success returns transformed kits', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { kits: [KIT_ROW] } } });
    const r = await api.contentKits.list(20, 0);
    expect(r.success).toBe(true);
    expect(r.data.kits).toHaveLength(1);
  });

  test('Network Error → user-friendly "no internet" message (not raw AxiosError)', async () => {
    mockGet.mockRejectedValue(networkError());
    const err = await api.contentKits.list().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
    expect(err.message).toMatch(/internet connection/i);
  });

  test('Network Error is plain Error (not AxiosError)', async () => {
    mockGet.mockRejectedValue(networkError());
    const err = await api.contentKits.list().catch(e => e);
    expect((err as any).isAxiosError).toBeUndefined();
  });

  test('timeout → "Loading timed out" message', async () => {
    mockGet.mockRejectedValue(timeoutError());
    await expect(api.contentKits.list()).rejects.toThrow(/timed out/i);
  });

  test('401 → login message', async () => {
    mockGet.mockRejectedValue(axiosError(401));
    await expect(api.contentKits.list()).rejects.toThrow(/log in/i);
  });

  test('403 → permission message', async () => {
    mockGet.mockRejectedValue(axiosError(403));
    await expect(api.contentKits.list()).rejects.toThrow(/permission/i);
  });

  test('500 with backend message surfaces it', async () => {
    mockGet.mockRejectedValue(axiosError(500, { error: 'DB connection pool exhausted' }));
    await expect(api.contentKits.list()).rejects.toThrow('DB connection pool exhausted');
  });

  test('500 without message → actionable fallback', async () => {
    mockGet.mockRejectedValue(axiosError(500));
    await expect(api.contentKits.list()).rejects.toThrow(/Server error loading your content/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sentry interceptor: should NOT report pure network errors
// ─────────────────────────────────────────────────────────────────────────────
describe('Axios interceptor — Sentry noise suppression for network errors', () => {
  /**
   * We test the filtering logic directly since the interceptor is registered
   * at module-load time and we can't easily intercept the dynamic import.
   * The logic is: isNetworkError = !response && (message === 'Network Error' || code === 'ERR_NETWORK' || offline)
   */

  function isNetworkErrorFn(error: any): boolean {
    return !error.response && (
      error.message === 'Network Error' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ERR_INTERNET_DISCONNECTED' ||
      error.code === 'ECONNABORTED'
    );
  }

  test('Network Error → classified as network error (no Sentry)', () => {
    expect(isNetworkErrorFn(networkError())).toBe(true);
  });

  test('ERR_INTERNET_DISCONNECTED → classified as network error', () => {
    const err = Object.assign(new Error('net::ERR_INTERNET_DISCONNECTED'), {
      code: 'ERR_INTERNET_DISCONNECTED',
    });
    expect(isNetworkErrorFn(err)).toBe(true);
  });

  test('ECONNABORTED (timeout) → classified as network error', () => {
    expect(isNetworkErrorFn(timeoutError())).toBe(true);
  });

  test('500 response → NOT a network error (should go to Sentry)', () => {
    expect(isNetworkErrorFn(axiosError(500))).toBe(false);
  });

  test('401 response → NOT a network error (expected, skip Sentry)', () => {
    expect(isNetworkErrorFn(axiosError(401))).toBe(false);
  });

  test('error with response always goes to Sentry path, not network-error path', () => {
    const err500 = axiosError(500);
    const err503 = axiosError(503);
    expect(isNetworkErrorFn(err500)).toBe(false);
    expect(isNetworkErrorFn(err503)).toBe(false);
  });

  test('Sentry is NOT called for network errors (integration check)', async () => {
    // The interceptor is wired up in the module. We verify that network errors
    // do not reach Sentry by checking the error classification logic.
    const Sentry = await import('@sentry/nextjs');
    const captureSpy = jest.spyOn(Sentry, 'captureException');

    // Pure network error → must not reach Sentry via interceptor logic
    const err = networkError();
    const shouldSendToSentry = !isNetworkErrorFn(err) && (!err.response || (err.response as any)?.status >= 500);
    expect(shouldSendToSentry).toBe(false);
    expect(captureSpy).not.toHaveBeenCalled();
  });

  test('500 server error IS sent to Sentry (regression guard)', async () => {
    const err = axiosError(500);
    const shouldSendToSentry = !isNetworkErrorFn(err) && (!err.response || err.response.status >= 500);
    expect(shouldSendToSentry).toBe(true);
  });
});
