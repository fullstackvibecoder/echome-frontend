/**
 * useEcho.fork.test.ts
 * Tests that chooseDestination routes correctly to the right API calls and
 * stores the resulting state for Task 7.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';
import { classifyEchoInput } from '@/lib/echo-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    kbContent: {
      startSocialImport: vi.fn(),
      startChannelStockpile: vi.fn(),
    },
    clips: {
      upload: vi.fn(),
      process: vi.fn(),
    },
    telemetry: { event: vi.fn() },
  },
}));

vi.mock('@/lib/echo-client', () => ({
  classifyEchoInput: vi.fn(),
}));

beforeEach(() => {
  // Re-initialize implementations after each test (vitest 4.x clearAllMocks also clears impls)
  vi.mocked(api.kbContent.startSocialImport).mockResolvedValue({ success: true } as any);
  vi.mocked(api.kbContent.startChannelStockpile).mockResolvedValue({
    success: true, savedCount: 2, skippedCount: 0,
    videos: [
      { uploadId: 'u1', sourceUrl: 'https://youtube.com/watch?v=a', title: 'A' },
      { uploadId: 'u2', sourceUrl: 'https://youtube.com/watch?v=b', title: 'B' },
    ],
  } as any);
  vi.mocked(api.clips.upload).mockResolvedValue({ success: true, data: { upload: { id: 'up-1' }, message: '' } } as any);
  vi.mocked(api.clips.process).mockResolvedValue({ success: true } as any);
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined);
  vi.mocked(classifyEchoInput).mockResolvedValue({ intent: 'ingest', confidence: 0.9, source: 'heuristic', args: {}, latencyMs: 0 });
});

describe('useEcho chooseDestination', () => {
  it('routes a channel URL stockpile choice to startChannelStockpile and stores savedVideos', async () => {
    const { result } = renderHook(() => useEcho(vi.fn()));
    act(() => { result.current.open(); result.current.setInputText('https://youtube.com/@handle'); });
    await act(async () => { await result.current.submit(); });
    await waitFor(() => expect(result.current.state.videoUrlTarget).toEqual({ platform: 'youtube', kind: 'channel' }));
    await act(async () => { await result.current.chooseDestination('stockpile'); });
    expect(api.kbContent.startChannelStockpile).toHaveBeenCalledWith({ url: 'https://youtube.com/@handle' });
    expect(result.current.state.savedCount).toBe(2);
    expect(result.current.state.savedVideos).toHaveLength(2);
  });

  it('routes a single-video create choice to clips.upload + clips.process', async () => {
    const { result } = renderHook(() => useEcho(vi.fn()));
    act(() => { result.current.open(); result.current.setInputText('https://youtube.com/watch?v=abc'); });
    await act(async () => { await result.current.submit(); });
    await waitFor(() => expect(result.current.state.videoUrlTarget).toEqual({ platform: 'youtube', kind: 'single' }));
    await act(async () => { await result.current.chooseDestination('create'); });
    expect(api.clips.upload).toHaveBeenCalledWith({ sourceType: 'youtube', sourceUrl: 'https://youtube.com/watch?v=abc' });
    expect(api.clips.process).toHaveBeenCalledWith('up-1', { generateContent: true });
  });
});

describe('useEcho clipSavedVideo', () => {
  it('calls api.clips.process and removes the clipped video from savedVideos', async () => {
    const { result } = renderHook(() => useEcho(vi.fn()));
    // Drive through stockpile to seed savedVideos
    act(() => { result.current.open(); result.current.setInputText('https://youtube.com/@handle'); });
    await act(async () => { await result.current.submit(); });
    await waitFor(() => expect(result.current.state.videoUrlTarget).toEqual({ platform: 'youtube', kind: 'channel' }));
    await act(async () => { await result.current.chooseDestination('stockpile'); });
    await waitFor(() => expect(result.current.state.savedVideos).toHaveLength(2));

    // Now clip the first saved video
    await act(async () => { await result.current.clipSavedVideo('u1'); });
    expect(api.clips.process).toHaveBeenCalledWith('u1', { generateContent: true });
    // u1 should be removed from savedVideos, u2 should remain
    expect(result.current.state.savedVideos).toHaveLength(1);
    expect(result.current.state.savedVideos?.[0].uploadId).toBe('u2');
    expect(result.current.state.phase).toBe('done');
  });
});
