import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HomeData } from '@/lib/just-echo-client';

vi.mock('@/lib/just-echo-client', () => ({ getHome: vi.fn() }));

import { getHome } from '@/lib/just-echo-client';
import { useHomeData } from './useHomeData';

const home: HomeData = {
  justEcho: true,
  week: null,
  nextUp: null,
  ready: null,
  knowledge: null,
  suggestions: [],
};

describe('useHomeData', () => {
  beforeEach(() => {
    vi.mocked(getHome).mockReset();
  });

  it('passes the browser time zone', async () => {
    vi.mocked(getHome).mockResolvedValue(home);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.data).toEqual(home));
    expect(getHome).toHaveBeenCalledWith(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('error is true and data null when the call fails', async () => {
    vi.mocked(getHome).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refresh refetches', async () => {
    vi.mocked(getHome).mockResolvedValue(home);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await act(async () => {
      await result.current.refresh();
    });
    expect(getHome).toHaveBeenCalledTimes(2);
  });

  it('a failed refresh keeps the last good data', async () => {
    vi.mocked(getHome).mockResolvedValueOnce(home);
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.data).toEqual(home));
    vi.mocked(getHome).mockRejectedValueOnce(new Error('flaky'));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual(home);
    expect(result.current.error).toBe(true);
    expect(result.current.loading).toBe(false);
  });
});
