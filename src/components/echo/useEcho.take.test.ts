/**
 * useEcho.take.test.ts
 * "Not me - write my take" on someone else's video: a single video goes to
 * Radar and the take is written in the box (never the clip pipeline); a
 * channel is followed on Radar (never stockpiled as the user's voice).
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';
import { classifyEchoInput } from '@/lib/echo-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    kbContent: { startSocialImport: vi.fn(), startChannelStockpile: vi.fn() },
    clips: { upload: vi.fn(), process: vi.fn() },
    creators: { contentFromUrl: vi.fn(), repurpose: vi.fn(), follow: vi.fn() },
    telemetry: { event: vi.fn() },
  },
}));
vi.mock('@/lib/echo-client', () => ({ classifyEchoInput: vi.fn() }));

beforeEach(() => {
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined);
  vi.mocked(classifyEchoInput).mockResolvedValue({ intent: 'create', confidence: 0.9, source: 'heuristic', args: {}, latencyMs: 0 });
  vi.mocked(api.creators.contentFromUrl).mockResolvedValue({
    success: true,
    data: { contentId: 'c-1', title: 'Housing talk', thumbnailUrl: 'https://img', durationSeconds: 2528, platform: 'youtube', reused: false },
  });
  vi.mocked(api.creators.repurpose).mockResolvedValue({ success: true, result: { requestId: 'req-1' } } as never);
  vi.mocked(api.creators.follow).mockResolvedValue({ success: true, creator: { creator_name: 'CityTalk' }, initialContentCount: 5 } as never);
});

async function pasted(url: string, navigate = vi.fn()) {
  const hook = renderHook(() => useEcho(navigate));
  act(() => { hook.result.current.open(); hook.result.current.setInputText(url); });
  await act(async () => { await hook.result.current.submit(); });
  await waitFor(() => expect(hook.result.current.state.videoUrlTarget).not.toBeNull());
  return hook;
}

describe('Not me - write my take', () => {
  it('puts a single video on Radar instead of clipping it', async () => {
    const { result } = await pasted('https://youtu.be/o9TPlkE3Wpw');
    act(() => { result.current.chooseOwnership('third_party'); });
    await waitFor(() => expect(result.current.state.takeTarget).toEqual({ contentId: 'c-1', title: 'Housing talk', thumbnailUrl: 'https://img' }));
    expect(api.creators.contentFromUrl).toHaveBeenCalledWith('https://youtu.be/o9TPlkE3Wpw');
    expect(result.current.state.phase).toBe('confirming');
    await act(async () => { await result.current.chooseDestination('create'); });
    expect(api.clips.upload).not.toHaveBeenCalled();
  });

  it('writes the take with the typed angle and opens the kit', async () => {
    const navigate = vi.fn();
    const { result } = await pasted('https://youtu.be/o9TPlkE3Wpw', navigate);
    act(() => { result.current.chooseOwnership('third_party'); });
    await waitFor(() => expect(result.current.state.takeTarget).not.toBeNull());
    act(() => { result.current.setTakeAngle('  Supply is the whole story. '); });
    await act(async () => { await result.current.writeTake(); });
    expect(api.creators.repurpose).toHaveBeenCalledWith('c-1', {
      platforms: ['instagram', 'linkedin', 'blog'],
      differentiationAngle: 'Supply is the whole story.',
    });
    expect(navigate).toHaveBeenCalledWith('/app/library/req-1');
    expect(result.current.state.takeTarget).toBeNull();
  });

  it('sends no angle when the take box is empty', async () => {
    const { result } = await pasted('https://youtu.be/o9TPlkE3Wpw');
    act(() => { result.current.chooseOwnership('third_party'); });
    await waitFor(() => expect(result.current.state.takeTarget).not.toBeNull());
    await act(async () => { await result.current.writeTake(); });
    expect(api.creators.repurpose).toHaveBeenCalledWith('c-1', { platforms: ['instagram', 'linkedin', 'blog'] });
  });

  it('shows the reason and asks again when the video cannot be read', async () => {
    vi.mocked(api.creators.contentFromUrl).mockRejectedValue(new Error('This video is private, removed or not available.'));
    const { result } = await pasted('https://youtu.be/o9TPlkE3Wpw');
    act(() => { result.current.chooseOwnership('third_party'); });
    await waitFor(() => expect(result.current.state.error).toMatch(/private/));
    expect(result.current.state.videoOwnership).toBeNull();
    expect(result.current.state.takeTarget).toBeNull();
  });

  it('follows someone else\'s channel on Radar instead of stockpiling it', async () => {
    const { result } = await pasted('https://youtube.com/@citytalk');
    act(() => { result.current.chooseOwnership('third_party'); });
    await act(async () => { await result.current.chooseDestination('stockpile'); });
    expect(api.creators.follow).toHaveBeenCalledWith({ platform: 'youtube', creatorUrl: 'https://youtube.com/@citytalk' });
    expect(api.kbContent.startChannelStockpile).not.toHaveBeenCalled();
    expect(result.current.state.confirmation?.title).toBe('Following CityTalk on Radar');
  });

  it('still clips the user\'s own video', async () => {
    vi.mocked(api.clips.upload).mockResolvedValue({ success: true, data: { upload: { id: 'up-1' }, message: '' } } as never);
    vi.mocked(api.clips.process).mockResolvedValue({ success: true } as never);
    const { result } = await pasted('https://youtu.be/o9TPlkE3Wpw');
    act(() => { result.current.chooseOwnership('self'); });
    await act(async () => { await result.current.chooseDestination('create'); });
    expect(api.creators.contentFromUrl).not.toHaveBeenCalled();
    expect(api.clips.upload).toHaveBeenCalled();
  });
});
