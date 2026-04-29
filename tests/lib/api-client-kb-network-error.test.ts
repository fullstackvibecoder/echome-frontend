/**
 * Regression tests — KB API network error handling
 *
 * Root cause (Sentry #116348104):
 * api.kb.list(), api.kb.getContent(), and api.kb.create() had no try/catch,
 * so "Network Error" from transient offline/connectivity failures on /app/knowledge
 * propagated as raw AxiosErrors and were reported to Sentry — flooding the
 * error tracker with noise instead of real application bugs.
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/116348104
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

// ── Helpers ────────────────────────────────────────────────────────────────────
const networkErr = () => Object.assign(new Error('Network Error'), {
  message: 'Network Error', code: 'ERR_NETWORK', isAxiosError: true,
});
const axiosErr = (status: number, body: Record<string, unknown> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: body }, isAxiosError: true,
  });
const timeoutErr = () => Object.assign(new Error('timeout of 10000ms exceeded'), {
  code: 'ECONNABORTED', isAxiosError: true,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('api.kb.list — network error handling', () => {
  beforeEach(() => mockGet.mockClear());

  test('success returns KB list', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [{ id: 'kb-1', name: 'My KB' }] } });
    const r = await api.kb.list();
    expect(r.success).toBe(true);
  });

  test('Network Error → user-friendly message, not raw AxiosError', async () => {
    mockGet.mockRejectedValue(networkErr());
    const err = await api.kb.list().catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
    expect(err.message).toMatch(/internet connection/i);
  });

  test('timeout → "Loading timed out" message', async () => {
    mockGet.mockRejectedValue(timeoutErr());
    await expect(api.kb.list()).rejects.toThrow(/timed out/i);
  });

  test('500 with backend message surfaces it', async () => {
    mockGet.mockRejectedValue(axiosErr(500, { error: 'KB table migration pending' }));
    await expect(api.kb.list()).rejects.toThrow('KB table migration pending');
  });

  test('500 without message returns actionable fallback', async () => {
    mockGet.mockRejectedValue(axiosErr(500));
    await expect(api.kb.list()).rejects.toThrow(/Server error loading knowledge bases/i);
  });

  test('Network Error is plain Error (not AxiosError) — prevents Sentry noise', async () => {
    mockGet.mockRejectedValue(networkErr());
    const err = await api.kb.list().catch(e => e);
    expect((err as any).isAxiosError).toBeUndefined();
    expect((err as any).response).toBeUndefined();
  });

  test('uses LIST_TIMEOUT explicitly', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: [] } });
    await api.kb.list();
    const cfg = mockGet.mock.calls.at(-1)?.[1] as { timeout?: number };
    expect(cfg?.timeout).toBeDefined();
    expect(cfg?.timeout).toBe(10_000); // LIST_TIMEOUT
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('api.kb.getContent — network error handling', () => {
  beforeEach(() => mockGet.mockClear());

  test('success returns content', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: { items: [], stats: { totalItems: 0, totalChunks: 0, totalSize: 0, bySourceType: {} } } },
    });
    const r = await api.kb.getContent('kb-1');
    expect(r.success).toBe(true);
  });

  test('Network Error → user-friendly, not raw AxiosError', async () => {
    mockGet.mockRejectedValue(networkErr());
    const err = await api.kb.getContent('kb-1').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
    expect(err.message).toMatch(/internet connection/i);
  });

  test('timeout → "Loading timed out" message', async () => {
    mockGet.mockRejectedValue(timeoutErr());
    await expect(api.kb.getContent('kb-1')).rejects.toThrow(/timed out/i);
  });

  test('404 → "Knowledge base not found"', async () => {
    mockGet.mockRejectedValue(axiosErr(404));
    await expect(api.kb.getContent('kb-1')).rejects.toThrow(/not found/i);
  });

  test('500 with backend message surfaces it', async () => {
    mockGet.mockRejectedValue(axiosErr(500, { error: 'Supabase timeout' }));
    await expect(api.kb.getContent('kb-1')).rejects.toThrow('Supabase timeout');
  });

  test('500 without message returns actionable fallback', async () => {
    mockGet.mockRejectedValue(axiosErr(500));
    await expect(api.kb.getContent('kb-1')).rejects.toThrow(/Server error loading content/i);
  });

  test('uses LIST_TIMEOUT', async () => {
    mockGet.mockResolvedValue({ data: { success: true, data: { items: [], stats: {} } } });
    await api.kb.getContent('kb-1');
    const cfg = mockGet.mock.calls.at(-1)?.[1] as { timeout?: number };
    expect(cfg?.timeout).toBe(10_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('api.kb.create — network error handling', () => {
  beforeEach(() => mockPost.mockClear());

  test('success returns created KB', async () => {
    mockPost.mockResolvedValue({ data: { success: true, data: { id: 'kb-new', name: 'My KB' } } });
    const r = await api.kb.create('My KB', true);
    expect(r.success).toBe(true);
  });

  test('Network Error → user-friendly, not raw AxiosError', async () => {
    mockPost.mockRejectedValue(networkErr());
    const err = await api.kb.create('My KB').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
    expect(err.message).toMatch(/internet connection/i);
  });

  test('500 with backend message surfaces it', async () => {
    mockPost.mockRejectedValue(axiosErr(500, { error: 'Max KBs reached' }));
    await expect(api.kb.create('Extra')).rejects.toThrow('Max KBs reached');
  });

  test('500 without message returns actionable fallback', async () => {
    mockPost.mockRejectedValue(axiosErr(500));
    await expect(api.kb.create('Test')).rejects.toThrow(/Server error creating knowledge base/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('api.kb.get — network error handling', () => {
  beforeEach(() => mockGet.mockClear());

  test('Network Error → user-friendly message', async () => {
    mockGet.mockRejectedValue(networkErr());
    const err = await api.kb.get('kb-1').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as any).isAxiosError).toBeUndefined();
    expect(err.message).toMatch(/internet connection/i);
  });

  test('404 → "Knowledge base not found"', async () => {
    mockGet.mockRejectedValue(axiosErr(404));
    await expect(api.kb.get('kb-1')).rejects.toThrow(/not found/i);
  });
});
