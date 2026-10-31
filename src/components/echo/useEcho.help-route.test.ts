/**
 * useEcho.help-route.test.ts
 * How-to questions about EchoMe (classifier args.kind === 'help') must be
 * answered from the help docs, never from the user's Voice KB, when the
 * agentic loop produces no answer (free users, or an empty stream).
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEcho } from './useEcho';
import { api } from '@/lib/api-client';
import { classifyEchoInput } from '@/lib/echo-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    help: { chat: vi.fn() },
    kb: { list: vi.fn(), chat: vi.fn() },
    telemetry: { event: vi.fn() },
  },
}));

vi.mock('@/lib/echo-client', () => ({
  classifyEchoInput: vi.fn(),
  // Empty stream: the agentic loop answers nothing, so useEcho falls through.
  streamEchoChat: vi.fn(async function* () {}),
  confirmEchoAction: vi.fn(),
  EchoChatGateError: class extends Error {
    status = 0;
  },
}));

beforeEach(() => {
  vi.mocked(api.help.chat).mockResolvedValue('data: {"content":"Open the carousel and pick a photo."}\n\ndata: [DONE]\n');
  vi.mocked(api.kb.list).mockResolvedValue({ success: true, data: [{ id: 'kb-1', is_default: true }] } as any);
  vi.mocked(api.kb.chat).mockResolvedValue('data: {"content":"From your notes."}\n\ndata: [DONE]\n');
  vi.mocked(api.telemetry.event).mockResolvedValue(undefined);
});

async function ask(text: string) {
  const { result } = renderHook(() => useEcho(vi.fn()));
  act(() => { result.current.open(); result.current.setInputText(text); });
  await act(async () => { await result.current.submit(); });
  await waitFor(() => expect(result.current.state.phase).toBe('confirming'));
  await act(async () => { await result.current.confirm(); });
  await waitFor(() => expect(result.current.state.phase).toBe('answered'));
  return result;
}

describe('useEcho question routing', () => {
  it('sends kind=help questions to the help docs, not the Voice KB', async () => {
    vi.mocked(classifyEchoInput).mockResolvedValue({
      intent: 'question', confidence: 0.9, source: 'llm', latencyMs: 0,
      args: { query: 'how do I add a photo to a carousel slide?', kind: 'help' },
    });
    const result = await ask('how do I add a photo to a carousel slide?');
    expect(api.help.chat).toHaveBeenCalledWith('how do I add a photo to a carousel slide?');
    expect(api.kb.chat).not.toHaveBeenCalled();
    expect(result.current.state.answer).toBe('Open the carousel and pick a photo.');
  });

  it('keeps KB questions on the Voice KB', async () => {
    vi.mocked(classifyEchoInput).mockResolvedValue({
      intent: 'question', confidence: 0.9, source: 'llm', latencyMs: 0,
      args: { query: 'what did I say about pricing?' },
    });
    await ask('what did I say about pricing?');
    expect(api.kb.chat).toHaveBeenCalled();
    expect(api.help.chat).not.toHaveBeenCalled();
  });
});
