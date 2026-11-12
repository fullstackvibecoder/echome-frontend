import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getVideoDurationSeconds, checkVideoTooShort, tooShortMessage } from './video-duration';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: { telemetry: { event: vi.fn() } },
}));

type FakeVideo = {
  preload: string;
  muted: boolean;
  duration: number;
  src: string;
  onloadedmetadata: (() => void) | null;
  onerror: (() => void) | null;
  removeAttribute: () => void;
  load: () => void;
};

let video: FakeVideo;
let revoke: ReturnType<typeof vi.fn>;
const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });

beforeEach(() => {
  vi.useFakeTimers();
  video = {
    preload: '',
    muted: false,
    duration: NaN,
    src: '',
    onloadedmetadata: null,
    onerror: null,
    removeAttribute: vi.fn(),
    load: vi.fn(),
  };
  const realCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) =>
    tag === 'video' ? (video as unknown as HTMLVideoElement) : realCreate(tag)) as typeof document.createElement);
  revoke = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = revoke as unknown as typeof URL.revokeObjectURL;
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('getVideoDurationSeconds', () => {
  it('resolves with the duration when metadata loads and revokes the URL', async () => {
    const p = getVideoDurationSeconds(file);
    expect(video.preload).toBe('metadata');
    video.duration = 6.4;
    video.onloadedmetadata?.();
    await expect(p).resolves.toBe(6.4);
    expect(revoke).toHaveBeenCalledWith('blob:fake');
  });

  it('resolves null on error and revokes the URL', async () => {
    const p = getVideoDurationSeconds(file);
    video.onerror?.();
    await expect(p).resolves.toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:fake');
  });

  it('resolves null on timeout and revokes the URL', async () => {
    const p = getVideoDurationSeconds(file);
    vi.advanceTimersByTime(8001);
    await expect(p).resolves.toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:fake');
  });

  it('resolves null for a non-finite duration', async () => {
    const p = getVideoDurationSeconds(file);
    video.duration = Infinity;
    video.onloadedmetadata?.();
    await expect(p).resolves.toBeNull();
  });
});

describe('checkVideoTooShort', () => {
  it('returns a message and fires telemetry for a short video', async () => {
    const p = checkVideoTooShort(file);
    video.duration = 6.2;
    video.onloadedmetadata?.();
    const msg = await p;
    expect(msg).toBe(tooShortMessage(6.2));
    expect(msg).toContain('6 seconds long');
    expect(api.telemetry.event).toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'upload_rejected_too_short' }),
    );
  });

  it('returns null for a long enough video', async () => {
    const p = checkVideoTooShort(file);
    video.duration = 45;
    video.onloadedmetadata?.();
    await expect(p).resolves.toBeNull();
    expect(api.telemetry.event).not.toHaveBeenCalled();
  });

  it('returns null when the duration is unknown', async () => {
    const p = checkVideoTooShort(file);
    video.onerror?.();
    await expect(p).resolves.toBeNull();
  });
});
