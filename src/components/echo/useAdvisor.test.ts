import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdvisor } from './useAdvisor';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: { kb: { advisor: vi.fn() } },
}));

const ADVISOR = {
  state: 'empty' as const,
  coverage: {},
  nudge: { headline: '', subhead: '', actions: [] },
  proposals: [],
};

describe('useAdvisor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.kb.advisor).mockResolvedValue({ success: true, data: ADVISOR } as never);
  });

  it('fetches the advisor once on mount', async () => {
    const { result } = renderHook(() => useAdvisor());
    await waitFor(() => expect(result.current.advisor).toEqual(ADVISOR));
    expect(api.kb.advisor).toHaveBeenCalledTimes(1);
  });

  it('refetch() re-hits api.kb.advisor', async () => {
    const { result } = renderHook(() => useAdvisor());
    await waitFor(() => expect(result.current.advisor).toEqual(ADVISOR));
    await act(async () => {
      await result.current.refetch();
    });
    expect(api.kb.advisor).toHaveBeenCalledTimes(2);
  });
});
