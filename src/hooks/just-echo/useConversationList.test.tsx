import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConversationSummary } from '@/lib/just-echo-client';

vi.mock('@/lib/just-echo-client', () => ({ listConversations: vi.fn() }));

import { listConversations } from '@/lib/just-echo-client';
import { useConversationList } from './useConversationList';

const row = (id: string, jobRunning = false): ConversationSummary => ({
  id,
  title: `T ${id}`,
  updatedAt: '2026-11-27T00:00:00Z',
  thumbnailUrl: null,
  jobRunning,
});

describe('useConversationList', () => {
  beforeEach(() => {
    vi.mocked(listConversations).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads conversations and polls every 30 seconds only while one has jobRunning', async () => {
    vi.useFakeTimers();
    vi.mocked(listConversations)
      .mockResolvedValueOnce([row('a', true)])
      .mockResolvedValue([row('a', false)]);
    const { result } = renderHook(() => useConversationList());
    await act(async () => {});
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    expect(listConversations).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29_000);
    });
    expect(listConversations).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(listConversations).toHaveBeenCalledTimes(2);
    expect(result.current.conversations[0].jobRunning).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(listConversations).toHaveBeenCalledTimes(2);
  });

  it('sets error when the load fails', async () => {
    vi.mocked(listConversations).mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useConversationList());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.conversations).toEqual([]);
  });

  it('setTitle updates one row in place', async () => {
    vi.mocked(listConversations).mockResolvedValue([row('a'), row('b')]);
    const { result } = renderHook(() => useConversationList());
    await waitFor(() => expect(result.current.conversations).toHaveLength(2));
    act(() => result.current.setTitle('b', 'New title'));
    expect(result.current.conversations.map((c) => c.title)).toEqual(['T a', 'New title']);
  });

  it('refresh refetches', async () => {
    vi.mocked(listConversations).mockResolvedValueOnce([row('a')]).mockResolvedValue([row('a'), row('b')]);
    const { result } = renderHook(() => useConversationList());
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.conversations).toHaveLength(2);
  });
});
