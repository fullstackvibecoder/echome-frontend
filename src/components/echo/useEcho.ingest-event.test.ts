/**
 * useEcho.ingest-event.test.ts
 * Asserts the plain-note ingest path dispatches the window
 * 'echo:ingest-complete' event so surfaces that did not mount this hook
 * instance (e.g. the Create-page hero when ingest happens via the global
 * pill) can refresh too.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';
import { classifyEchoInput } from '@/lib/echo-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    kbContent: {
      paste: vi.fn(),
    },
    telemetry: { event: vi.fn() },
  },
}));

vi.mock('@/lib/echo-client', () => ({
  classifyEchoInput: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(api.kbContent.paste).mockResolvedValue({ success: true } as any);
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined);
  vi.mocked(classifyEchoInput).mockResolvedValue({
    intent: 'ingest',
    confidence: 0.9,
    source: 'heuristic',
    args: {},
    latencyMs: 0,
  });
});

describe('useEcho ingest-complete window event', () => {
  it('dispatches echo:ingest-complete after a successful text-note ingest', async () => {
    const listener = vi.fn();
    window.addEventListener('echo:ingest-complete', listener);

    const { result } = renderHook(() => useEcho(vi.fn()));
    act(() => {
      result.current.open();
      result.current.setInputText('Just a plain note, no link here.');
    });
    await act(async () => {
      await result.current.submit();
    });
    await waitFor(() => expect(result.current.state.phase).toBe('confirming'));

    await act(async () => {
      await result.current.confirm();
    });

    await waitFor(() => expect(result.current.state.phase).toBe('done'));
    expect(api.kbContent.paste).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('echo:ingest-complete', listener);
  });
});
