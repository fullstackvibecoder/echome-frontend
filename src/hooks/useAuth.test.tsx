import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getCurrentUser = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  api: { auth: { getCurrentUser: (...args: unknown[]) => getCurrentUser(...args) } },
}));

vi.mock('@/lib/meta-pixel', () => ({ trackSignup: vi.fn() }));

import { useAuth, AUTH_RETRY_DELAYS_MS } from './useAuth';

const USER = { id: 'u1', email: 'a@b.co' };
const http = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const networkError = () => Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });

describe('useAuth session handling (R-48)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getCurrentUser.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    localStorage.setItem('authToken', 'tok');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('401 clears the token and ends loading with no user (guard redirects to login)', async () => {
    getCurrentUser.mockRejectedValue(http(401));
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.reconnecting).toBe(false);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('500 keeps the token and retries', async () => {
    getCurrentUser.mockRejectedValue(http(500));
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(localStorage.getItem('authToken')).toBe('tok');
    expect(result.current.reconnecting).toBe(true);
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_RETRY_DELAYS_MS[0]);
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('authToken')).toBe('tok');
  });

  it('network error keeps the token and retries', async () => {
    getCurrentUser.mockRejectedValue(networkError());
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(localStorage.getItem('authToken')).toBe('tok');
    expect(result.current.reconnecting).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_RETRY_DELAYS_MS[0]);
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it('success after a retry keeps the user logged in', async () => {
    getCurrentUser.mockRejectedValueOnce(http(503)).mockResolvedValue({ success: true, data: USER });
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(result.current.reconnecting).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_RETRY_DELAYS_MS[0]);
    });
    expect(result.current.user).toEqual(USER);
    expect(result.current.reconnecting).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.connectionFailed).toBe(false);
    expect(localStorage.getItem('authToken')).toBe('tok');
  });

  it('keeps the session and offers a retry when every attempt fails', async () => {
    getCurrentUser.mockRejectedValue(http(502));
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    for (const d of AUTH_RETRY_DELAYS_MS) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(d);
      });
    }
    expect(getCurrentUser).toHaveBeenCalledTimes(AUTH_RETRY_DELAYS_MS.length + 1);
    expect(localStorage.getItem('authToken')).toBe('tok');
    expect(result.current.connectionFailed).toBe(true);
    expect(result.current.reconnecting).toBe(false);
    expect(result.current.loading).toBe(false);

    getCurrentUser.mockResolvedValue({ success: true, data: USER });
    await act(async () => {
      result.current.retry();
    });
    expect(result.current.user).toEqual(USER);
    expect(result.current.connectionFailed).toBe(false);
  });

  it('a user already on screen stays signed in through a failed refresh, with no reconnect screen', async () => {
    getCurrentUser.mockResolvedValueOnce({ success: true, data: USER });
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    expect(result.current.user).toEqual(USER);

    getCurrentUser.mockRejectedValue(http(503));
    const total = AUTH_RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
    await act(async () => {
      const p = result.current.refreshUser();
      await vi.advanceTimersByTimeAsync(total);
      await p;
    });
    expect(result.current.user).toEqual(USER);
    expect(result.current.reconnecting).toBe(false);
    expect(result.current.connectionFailed).toBe(false);
    expect(localStorage.getItem('authToken')).toBe('tok');
  });

  it('a second retry while one is running does not start another fetch loop', async () => {
    getCurrentUser.mockRejectedValue(http(500));
    const { result } = renderHook(() => useAuth());
    await act(async () => {});
    const callsBefore = getCurrentUser.mock.calls.length;
    await act(async () => {
      result.current.retry();
      result.current.retry();
    });
    expect(getCurrentUser.mock.calls.length).toBe(callsBefore);
  });
});
