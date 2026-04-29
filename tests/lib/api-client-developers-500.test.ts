/**
 * Regression tests — apiKeys and apiCredits 500 error handling
 *
 * Root cause (Sentry #116351566):
 * All apiKeys and apiCredits methods had no try/catch, so 500 responses on
 * /app/developers propagated as raw AxiosErrors to Sentry.captureException
 * via the axios response interceptor — even though the component-level catch
 * blocks would have handled them gracefully.
 *
 * Sentry: https://sentry.io/organizations/bottleneck-labs/issues/116351566
 */

import axios, { type AxiosInstance } from 'axios';

jest.mock('axios');

const mockGet    = jest.fn();
const mockPost   = jest.fn();
const mockDelete = jest.fn();

const fakeInstance = {
  get:          mockGet,
  post:         mockPost,
  delete:       mockDelete,
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
const axiosErr = (status: number, body: Record<string, unknown> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: body }, isAxiosError: true,
  });
const timeoutErr = () => Object.assign(new Error('timeout exceeded'), {
  code: 'ECONNABORTED', isAxiosError: true,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('api.apiKeys — 500 error handling', () => {
  beforeEach(() => { mockGet.mockClear(); mockPost.mockClear(); mockDelete.mockClear(); });

  describe('list', () => {
    test('success returns keys', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: [{ id: 'key-1' }] } });
      const r = await api.apiKeys.list();
      expect(r.success).toBe(true);
    });

    test('500 with backend message surfaces it', async () => {
      mockGet.mockRejectedValue(axiosErr(500, { error: 'DB connection error' }));
      await expect(api.apiKeys.list()).rejects.toThrow('DB connection error');
    });

    test('500 without message returns actionable fallback', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      await expect(api.apiKeys.list()).rejects.toThrow(/Server error loading API keys/i);
    });

    test('500 is plain Error, not AxiosError', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      const err = await api.apiKeys.list().catch(e => e);
      expect(err).toBeInstanceOf(Error);
      expect((err as any).isAxiosError).toBeUndefined();
    });

    test('timeout → actionable message', async () => {
      mockGet.mockRejectedValue(timeoutErr());
      await expect(api.apiKeys.list()).rejects.toThrow(/timed out/i);
    });

    test('uses LIST_TIMEOUT', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: [] } });
      await api.apiKeys.list();
      const cfg = mockGet.mock.calls.at(-1)?.[1] as { timeout?: number };
      expect(cfg?.timeout).toBe(10_000);
    });
  });

  describe('create', () => {
    test('500 → actionable message', async () => {
      mockPost.mockRejectedValue(axiosErr(500));
      await expect(api.apiKeys.create({ name: 'Test' })).rejects.toThrow(/Server error creating API key/i);
    });

    test('403 → permission message', async () => {
      mockPost.mockRejectedValue(axiosErr(403));
      await expect(api.apiKeys.create({ name: 'Test' })).rejects.toThrow(/permission/i);
    });

    test('500 is plain Error', async () => {
      mockPost.mockRejectedValue(axiosErr(500));
      const err = await api.apiKeys.create({ name: 'Test' }).catch(e => e);
      expect((err as any).isAxiosError).toBeUndefined();
    });
  });

  describe('revoke', () => {
    test('404 → "not found" message', async () => {
      mockDelete.mockRejectedValue(axiosErr(404));
      await expect(api.apiKeys.revoke('key-1')).rejects.toThrow(/not found|revoked/i);
    });

    test('500 → actionable message', async () => {
      mockDelete.mockRejectedValue(axiosErr(500));
      await expect(api.apiKeys.revoke('key-1')).rejects.toThrow(/Server error revoking/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('api.apiCredits — 500 error handling', () => {
  beforeEach(() => { mockGet.mockClear(); mockPost.mockClear(); });

  describe('getBalance', () => {
    test('success returns balance', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { balance: 100, lifetime_purchased: 100, lifetime_used: 0, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } },
      });
      const r = await api.apiCredits.getBalance();
      expect(r.success).toBe(true);
    });

    test('500 with message surfaces it', async () => {
      mockGet.mockRejectedValue(axiosErr(500, { error: 'credits table unavailable' }));
      await expect(api.apiCredits.getBalance()).rejects.toThrow('credits table unavailable');
    });

    test('500 without message → fallback', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.getBalance()).rejects.toThrow(/Server error loading credit balance/i);
    });

    test('500 is plain Error', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      const err = await api.apiCredits.getBalance().catch(e => e);
      expect((err as any).isAxiosError).toBeUndefined();
    });

    test('timeout → actionable message', async () => {
      mockGet.mockRejectedValue(timeoutErr());
      await expect(api.apiCredits.getBalance()).rejects.toThrow(/timed out/i);
    });

    test('uses LIST_TIMEOUT', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: {} } });
      await api.apiCredits.getBalance();
      const cfg = mockGet.mock.calls.at(-1)?.[1] as { timeout?: number };
      expect(cfg?.timeout).toBe(10_000);
    });
  });

  describe('getPacks', () => {
    test('500 → fallback', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.getPacks()).rejects.toThrow(/Server error loading credit packs/i);
    });

    test('500 is plain Error', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      const err = await api.apiCredits.getPacks().catch(e => e);
      expect((err as any).isAxiosError).toBeUndefined();
    });
  });

  describe('getTransactions', () => {
    test('500 → fallback', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.getTransactions({ limit: 20 })).rejects.toThrow(/Server error loading transactions/i);
    });

    test('500 is plain Error', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      const err = await api.apiCredits.getTransactions().catch(e => e);
      expect((err as any).isAxiosError).toBeUndefined();
    });
  });

  describe('getPaymentMethods', () => {
    test('500 → fallback', async () => {
      mockGet.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.getPaymentMethods()).rejects.toThrow(/Server error loading payment methods/i);
    });
  });

  describe('checkout', () => {
    test('402 → payment required message', async () => {
      mockPost.mockRejectedValue(axiosErr(402));
      await expect(api.apiCredits.checkout({ packId: 'p1', successUrl: '/', cancelUrl: '/' })).rejects.toThrow(/payment required|payment method/i);
    });

    test('500 → fallback', async () => {
      mockPost.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.checkout({ packId: 'p1', successUrl: '/', cancelUrl: '/' })).rejects.toThrow(/Server error processing checkout/i);
    });
  });

  describe('updateAutoReload', () => {
    test('400 with message surfaces it', async () => {
      mockPost.mockRejectedValue(axiosErr(400, { error: 'threshold must be positive' }));
      await expect(api.apiCredits.updateAutoReload({ enabled: true, threshold: -1 })).rejects.toThrow('threshold must be positive');
    });

    test('500 → fallback', async () => {
      mockPost.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.updateAutoReload({ enabled: false })).rejects.toThrow(/Server error updating auto-reload/i);
    });
  });

  describe('setupPaymentMethod', () => {
    test('500 → fallback', async () => {
      mockPost.mockRejectedValue(axiosErr(500));
      await expect(api.apiCredits.setupPaymentMethod({ returnUrl: '/' })).rejects.toThrow(/Server error setting up payment method/i);
    });
  });
});
