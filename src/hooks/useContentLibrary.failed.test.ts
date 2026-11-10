import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useContentLibrary } from './useContentLibrary';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    contentKits: { list: vi.fn(), delete: vi.fn() },
    clips: { list: vi.fn(), process: vi.fn(), retryWithPassword: vi.fn(), delete: vi.fn() },
    generation: { deleteRequest: vi.fn() },
    images: { deleteCarousel: vi.fn() },
  },
}));

const kit = { id: 'k1', title: 'Kit', createdAt: '2026-11-01T00:00:00Z', contentGenerated: true, videoUploadId: 'covered', clipsGenerated: 2 };
const upload = (o: Record<string, unknown>) => ({
  id: 'x', sourceType: 'youtube', status: 'failed', createdAt: '2026-11-02T00:00:00Z', statusMessage: 'Nope', errorCode: 'download_failed', ...o,
});

beforeEach(() => {
  vi.mocked(api.contentKits.list).mockResolvedValue({ success: true, data: { kits: [kit] } } as never);
  vi.mocked(api.clips.list).mockResolvedValue({
    success: true,
    data: { uploads: [upload({ id: 'f1' }), upload({ id: 'covered' }), upload({ id: 'ok', status: 'completed' })] },
  } as never);
});

describe('useContentLibrary failed uploads', () => {
  it('asks for failed uploads and shows only uncovered failed ones', async () => {
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(api.clips.list).toHaveBeenCalledWith(100, 0, { includeFailed: true });
    const ids = result.current.items.map(i => i.id).sort();
    expect(ids).toEqual(['f1', 'k1']);
    expect(result.current.items.find(i => i.id === 'f1')?.status).toBe('failed');
  });

  it('keeps kit counts free of failed rows', async () => {
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.total).toBe(1);
  });

  it('still loads kits when the uploads request fails', async () => {
    vi.mocked(api.clips.list).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map(i => i.id)).toEqual(['k1']);
    expect(result.current.error).toBeNull();
  });

  it('retryUpload re-runs the same row and moves it to processing', async () => {
    vi.mocked(api.clips.process).mockResolvedValue({ success: true } as never);
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.retryUpload('f1'); });
    expect(api.clips.process).toHaveBeenCalledWith('f1', { generateContent: true });
    expect(result.current.items.find(i => i.id === 'f1')?.status).toBe('processing');
  });

  it('retryUpload surfaces the API message and keeps the row failed', async () => {
    vi.mocked(api.clips.process).mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 403',
      response: { status: 403, data: { error: { message: 'You are out of video minutes.', code: 'QUOTA' } } },
    });
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(result.current.retryUpload('f1')).rejects.toThrow('You are out of video minutes.');
    expect(result.current.items.find(i => i.id === 'f1')?.status).toBe('failed');
  });

  it('shows an in-flight upload with no kit as processing', async () => {
    vi.mocked(api.clips.list).mockResolvedValue({
      success: true, data: { uploads: [upload({ id: 'p1', status: 'transcribing' })] },
    } as never);
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.find(i => i.id === 'p1')?.status).toBe('processing');
  });

  it('pages through uploads so older failures show', async () => {
    const full = Array.from({ length: 100 }, (_, i) => upload({ id: `c${i}`, status: 'completed' }));
    vi.mocked(api.clips.list)
      .mockResolvedValueOnce({ success: true, data: { uploads: full } } as never)
      .mockResolvedValueOnce({ success: true, data: { uploads: [upload({ id: 'old' })] } } as never);
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.clips.list).toHaveBeenNthCalledWith(2, 100, 100, { includeFailed: true });
    expect(result.current.items.some(i => i.id === 'old')).toBe(true);
  });

  it('after a retry, polls and shows the new failure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(api.clips.process).mockResolvedValue({ success: true } as never);
      const { result } = renderHook(() => useContentLibrary());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      vi.mocked(api.clips.list).mockResolvedValue({
        success: true, data: { uploads: [upload({ id: 'f1', statusMessage: 'Second failure' })] },
      } as never);
      await act(async () => { await result.current.retryUpload('f1'); });
      expect(result.current.items.find(i => i.id === 'f1')?.status).toBe('processing');
      await act(async () => { await vi.advanceTimersByTimeAsync(10_500); });
      const row = result.current.items.find(i => i.id === 'f1');
      expect(row?.status).toBe('failed');
      expect((row?.raw as { statusMessage: string }).statusMessage).toBe('Second failure');
    } finally {
      vi.useRealTimers();
    }
  });

  it('deletes a failed upload through the clips API', async () => {
    vi.mocked(api.clips.delete).mockResolvedValue({} as never);
    const { result } = renderHook(() => useContentLibrary());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.deleteItem('f1'); });
    expect(api.clips.delete).toHaveBeenCalledWith('f1');
    expect(api.contentKits.delete).not.toHaveBeenCalled();
  });
});
