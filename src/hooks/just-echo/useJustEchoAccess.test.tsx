import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/just-echo-client', () => ({ getJustEchoAccess: vi.fn() }));

import { getJustEchoAccess } from '@/lib/just-echo-client';
import { useJustEchoAccess } from './useJustEchoAccess';

describe('useJustEchoAccess', () => {
  beforeEach(() => {
    vi.mocked(getJustEchoAccess).mockReset();
    localStorage.clear();
  });

  it('returns the cached value immediately and revalidates', async () => {
    localStorage.setItem('je-access:u1', '1');
    vi.mocked(getJustEchoAccess).mockResolvedValue(true);
    const { result } = renderHook(() => useJustEchoAccess('u1'));
    expect(result.current).toBe('on');
    await waitFor(() => expect(getJustEchoAccess).toHaveBeenCalledTimes(1));
    expect(result.current).toBe('on');
  });

  it('revalidates a cached on and switches to classic when the server says off', async () => {
    localStorage.setItem('je-access:u1', '1');
    vi.mocked(getJustEchoAccess).mockResolvedValue(false);
    const { result } = renderHook(() => useJustEchoAccess('u1'));
    expect(result.current).toBe('on');
    await waitFor(() => expect(result.current).toBe('off'));
    expect(localStorage.getItem('je-access:u1')).toBe('0');
  });

  it('is loading without a cache, then writes the cache from the server', async () => {
    vi.mocked(getJustEchoAccess).mockResolvedValue(true);
    const { result } = renderHook(() => useJustEchoAccess('u1'));
    expect(result.current).toBe('loading');
    await waitFor(() => expect(result.current).toBe('on'));
    expect(localStorage.getItem('je-access:u1')).toBe('1');
  });

  it('request errors fall back to the cache, else off', async () => {
    vi.mocked(getJustEchoAccess).mockRejectedValue(new Error('boom'));
    localStorage.setItem('je-access:u1', '1');
    const a = renderHook(() => useJustEchoAccess('u1'));
    await waitFor(() => expect(getJustEchoAccess).toHaveBeenCalledTimes(1));
    expect(a.result.current).toBe('on');
    const b = renderHook(() => useJustEchoAccess('u2'));
    await waitFor(() => expect(b.result.current).toBe('off'));
    expect(localStorage.getItem('je-access:u2')).toBeNull();
  });

  it('a null user is off and never calls the server', () => {
    const { result } = renderHook(() => useJustEchoAccess(null));
    expect(result.current).toBe('off');
    expect(getJustEchoAccess).not.toHaveBeenCalled();
  });

  it('blocked storage behaves as no cache', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.mocked(getJustEchoAccess).mockResolvedValue(true);
    const { result } = renderHook(() => useJustEchoAccess('u1'));
    expect(result.current).toBe('loading');
    await waitFor(() => expect(result.current).toBe('on'));
    spy.mockRestore();
    set.mockRestore();
  });

  it('revalidates once per user and re-reads the cache when the user changes', async () => {
    localStorage.setItem('je-access:u2', '0');
    vi.mocked(getJustEchoAccess).mockResolvedValue(true);
    const { result, rerender } = renderHook(({ id }) => useJustEchoAccess(id), { initialProps: { id: 'u1' as string | null } });
    await waitFor(() => expect(result.current).toBe('on'));
    rerender({ id: 'u1' });
    expect(getJustEchoAccess).toHaveBeenCalledTimes(1);
    rerender({ id: 'u2' });
    expect(result.current).toBe('off');
    await waitFor(() => expect(getJustEchoAccess).toHaveBeenCalledTimes(2));
  });
});
