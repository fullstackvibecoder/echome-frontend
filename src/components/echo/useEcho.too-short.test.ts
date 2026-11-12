/**
 * FUL-57: a video known to be under 10s is rejected in the browser, before any
 * upload call. Unknown duration and long videos proceed.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';
import { checkVideoTooShort, tooShortMessage } from '@/lib/video-duration';

vi.mock('@/lib/api-client', () => ({
  api: {
    clips: { uploadViaR2: vi.fn(), get: vi.fn() },
    telemetry: { event: vi.fn() },
  },
}));
vi.mock('@/lib/echo-client', () => ({ classifyEchoInput: vi.fn() }));
vi.mock('@/lib/video-duration', async (orig) => ({
  ...(await orig<typeof import('@/lib/video-duration')>()),
  checkVideoTooShort: vi.fn(),
}));

const file = new File(['x'], 'short.mp4', { type: 'video/mp4' });

beforeEach(() => {
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined);
  vi.mocked(api.clips.uploadViaR2).mockResolvedValue({ success: true, data: { upload: { id: 'u1' } } } as never);
  vi.mocked(api.clips.get).mockResolvedValue({ data: { upload: { statusMessage: 'Saved to your library.' } } } as never);
});

async function attach() {
  const navigate = vi.fn();
  const hook = renderHook(() => useEcho(navigate));
  act(() => {
    hook.result.current.open();
    hook.result.current.setAttachment(file);
  });
  await waitFor(() => expect(hook.result.current.state.videoFileTarget).not.toBeNull());
  return { hook, navigate };
}

describe('useEcho chooseFileDestination duration guard', () => {
  it('blocks a short video with no upload and no navigation', async () => {
    vi.mocked(checkVideoTooShort).mockResolvedValue(tooShortMessage(6));
    const { hook, navigate } = await attach();
    await act(async () => {
      await hook.result.current.chooseFileDestination('stockpile');
    });
    expect(api.clips.uploadViaR2).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(hook.result.current.state.error).toContain('6 seconds long');
    expect(hook.result.current.state.phase).toBe('confirming');
    expect(hook.result.current.state.videoFileTarget).not.toBeNull();
  });

  it('lets a long enough video upload', async () => {
    vi.mocked(checkVideoTooShort).mockResolvedValue(null);
    const { hook } = await attach();
    await act(async () => {
      await hook.result.current.chooseFileDestination('stockpile');
    });
    expect(api.clips.uploadViaR2).toHaveBeenCalledTimes(1);
  });

  it('lets an unreadable-duration video through to the server (check resolves null)', async () => {
    vi.mocked(checkVideoTooShort).mockResolvedValue(null);
    const { hook, navigate } = await attach();
    await act(async () => {
      await hook.result.current.chooseFileDestination('create');
    });
    expect(navigate).toHaveBeenCalledWith('/app?echoFile=1');
  });
});
