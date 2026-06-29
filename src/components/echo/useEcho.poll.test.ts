/**
 * useEcho.poll.test.ts
 * Tests for the stockpile poll loop in chooseFileDestination:
 *   1. Terminal "Saved to your library." -> ingestPhase 'success'
 *   2. "library-ingest-failed: ..." -> ingestPhase 'failed'
 *   3. Never reaches terminal within MAX_ATTEMPTS -> timeout 'failed'
 *   4. Abort guard: reset() invalidates the first loop without clobbering new state
 *
 * Pattern: startStockpile() wraps its own act() calls, so it must be called
 * OUTSIDE any enclosing await act() block to avoid nested-act issues.
 * Timer advancement is done in a separate await act(async () => { ... }) block.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    clips: {
      uploadViaR2: vi.fn(),
      get: vi.fn(),
    },
    telemetry: { event: vi.fn() },
  },
}));

vi.mock('@/lib/echo-client', () => ({
  classifyEchoInput: vi.fn(),
}));

vi.mock('./file-handoff', () => ({
  stashEchoHandoff: vi.fn(),
}));

const POLL_MS = 3000;
// Small fake-timer delay on uploadViaR2 so vi.runAllTimersAsync() picks up the
// poll timers in the same pass (without this the poll loop hasn't started yet
// when runAllTimersAsync begins scanning).
const UPLOAD_DELAY_MS = 50;

function makeVideoFile(name = 'clip.mp4') {
  return new File(['video-data'], name, { type: 'video/mp4' });
}

beforeEach(() => {
  // Only fake setTimeout/clearTimeout so that vi.advanceTimersByTimeAsync can
  // use the real setImmediate/queueMicrotask to yield between timer callbacks.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined as any);

  vi.mocked(api.clips.uploadViaR2).mockImplementation(
    async (_file: File, _opts: unknown, onProgress?: (p: number) => void) => {
      await new Promise<void>((resolve) => setTimeout(resolve, UPLOAD_DELAY_MS));
      onProgress?.(100);
      return { success: true, data: { upload: { id: 'upload-123' } } } as any;
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

/**
 * Attaches a video file and starts a stockpile upload/poll.
 * Uses its own synchronous act() calls internally, so callers must NOT invoke
 * this function from inside an enclosing await act(async () => {...}) block.
 */
function startStockpile(
  result: ReturnType<typeof renderHook<ReturnType<typeof useEcho>, Parameters<typeof useEcho>>>['result'],
  file = makeVideoFile(),
): Promise<void> {
  act(() => {
    result.current.setAttachment(file);
  });
  let pollDone!: Promise<void>;
  act(() => {
    pollDone = result.current.chooseFileDestination('stockpile');
  });
  return pollDone;
}

describe('useEcho stockpile poll loop', () => {
  it('sets ingestPhase to "success" when terminal "Saved to your library." is received', async () => {
    let callCount = 0;
    vi.mocked(api.clips.get).mockImplementation(async () => {
      callCount += 1;
      if (callCount < 3) {
        return { success: true, data: { upload: { statusMessage: 'Processing...' } } } as any;
      }
      return { success: true, data: { upload: { statusMessage: 'Saved to your library.' } } } as any;
    });

    const { result } = renderHook(() => useEcho(vi.fn()));

    // Start outside act -- startStockpile wraps its own act() calls
    startStockpile(result);

    // Run all fake timers: upload delay -> poll timers until terminal on 3rd call
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.ingestPhase).toBe('success');
    expect(result.current.state.confirmation?.title).toContain('added to your voice');
    expect(result.current.state.videoFileTarget).toBeNull();
    expect(callCount).toBe(3);
  });

  it('sets ingestPhase to "failed" when library-ingest-failed: status is received', async () => {
    vi.mocked(api.clips.get).mockResolvedValue({
      success: true,
      data: { upload: { statusMessage: 'library-ingest-failed: extraction error' } },
    } as any);

    const { result } = renderHook(() => useEcho(vi.fn()));

    startStockpile(result);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.ingestPhase).toBe('failed');
    // No success confirmation should appear on failure
    expect(result.current.state.confirmation).toBeNull();
  });

  it('sets ingestPhase to "failed" after MAX_ATTEMPTS without a terminal status (timeout)', async () => {
    vi.mocked(api.clips.get).mockResolvedValue({
      success: true,
      data: { upload: { statusMessage: 'Still processing...' } },
    } as any);

    const { result } = renderHook(() => useEcho(vi.fn()));

    startStockpile(result);

    // Run all 40 poll timers to exhaustion -- no terminal status reached
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.ingestPhase).toBe('failed');
  });

  it('aborts the first poll loop when reset() is called and does not overwrite the second run state', async () => {
    // First loop: always returns non-terminal status so it stays active
    vi.mocked(api.clips.get).mockResolvedValue({
      success: true,
      data: { upload: { statusMessage: 'Processing...' } },
    } as any);

    const { result } = renderHook(() => useEcho(vi.fn()));

    // Start the first stockpile and advance through upload + 2 poll iterations
    const firstPollDone = startStockpile(result);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UPLOAD_DELAY_MS + POLL_MS * 2);
    });
    expect(result.current.state.ingestPhase).toBe('importing');

    // Reset invalidates the first loop's run id
    act(() => {
      result.current.reset();
    });

    // Arm a single success response for the second loop's first poll
    vi.mocked(api.clips.get).mockResolvedValueOnce({
      success: true,
      data: { upload: { statusMessage: 'Saved to your library.' } },
    } as any);

    // Start the second stockpile and drive it to its first (terminal) poll.
    // Advancing by (upload delay + 1 poll) also fires the first loop's 3rd
    // timer, which hits the abort guard and exits without touching state.
    const secondPollDone = startStockpile(result, makeVideoFile('clip2.mp4'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UPLOAD_DELAY_MS + POLL_MS);
    });

    // Second loop should have landed on success
    expect(result.current.state.ingestPhase).toBe('success');

    // Drain any residual timers. The first loop's abort guard exits the loop
    // before scheduling further timers, so this is effectively a no-op.
    await act(async () => {
      await vi.runAllTimersAsync();
      await firstPollDone;
      await secondPollDone;
    });

    // The first loop must NOT have overwritten the second loop's 'success' state
    expect(result.current.state.ingestPhase).toBe('success');
  });
});
