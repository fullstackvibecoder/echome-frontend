import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EchoTurnEvent, PublicMessage, JobView } from '@/lib/just-echo-client';

vi.mock('@/lib/just-echo-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/just-echo-client')>();
  return {
    ...actual,
    createConversation: vi.fn(),
    getConversation: vi.fn(),
    resolveConfirm: vi.fn(),
    streamTurn: vi.fn(),
  };
});

import {
  JustEchoHttpError,
  createConversation,
  getConversation,
  resolveConfirm,
  streamTurn,
} from '@/lib/just-echo-client';
import { useConversation } from './useConversation';

const msg = (id: string, role: PublicMessage['role'], content: string, extra: Partial<PublicMessage> = {}): PublicMessage => ({
  id,
  conversationId: 'c1',
  role,
  content,
  event: null,
  confirmState: null,
  actionId: null,
  createdAt: '2026-11-27T00:00:00Z',
  ...extra,
});

function conv(messages: PublicMessage[] = [], jobs: JobView[] = []) {
  return {
    conversation: { id: 'c1', title: null, thumbnailUrl: null, archived: false, createdAt: '', updatedAt: '' },
    messages,
    jobs,
  };
}

async function* events(list: EchoTurnEvent[], thenThrow?: Error): AsyncGenerator<EchoTurnEvent> {
  for (const e of list) yield e;
  if (thenThrow) throw thenThrow;
}

/** Generator that waits on a gate before yielding the given events. */
function gated(list: EchoTurnEvent[]) {
  let open!: () => void;
  const gate = new Promise<void>((r) => (open = r));
  async function* gen(): AsyncGenerator<EchoTurnEvent> {
    await gate;
    for (const e of list) yield e;
  }
  return { gen: gen(), open };
}

function setup(initial: string | null = null) {
  const cb = {
    onCreated: vi.fn(),
    onPanel: vi.fn(),
    onTitle: vi.fn(),
    onTurnDone: vi.fn(),
  };
  const hook = renderHook(
    (props: { id: string | null }) =>
      useConversation({ conversationId: props.id, panel: { kind: 'voice' }, ...cb }),
    { initialProps: { id: initial } },
  );
  return { ...hook, cb };
}

beforeEach(() => {
  vi.mocked(createConversation).mockReset().mockResolvedValue({ id: 'new1' });
  vi.mocked(getConversation).mockReset().mockResolvedValue(conv());
  vi.mocked(resolveConfirm).mockReset();
  vi.mocked(streamTurn).mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useConversation sending', () => {
  it('creates the conversation on first send and reports it', async () => {
    const { gen, open } = gated([{ type: 'done' }]);
    vi.mocked(streamTurn).mockReturnValue(gen);
    vi.mocked(getConversation).mockResolvedValue(conv([msg('m1', 'user', 'hi')]));
    const { result, cb } = setup(null);

    let p!: Promise<void>;
    act(() => {
      p = result.current.send('hi');
    });
    // user item appears before any stream event
    await waitFor(() => expect(result.current.items).toEqual([{ kind: 'user', key: expect.any(String), text: 'hi' }]));
    open();
    await act(async () => {
      await p;
    });

    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(cb.onCreated).toHaveBeenCalledWith('new1');
    expect(streamTurn).toHaveBeenCalledWith('new1', 'hi', { kind: 'voice' }, expect.any(AbortSignal));
    const created = cb.onCreated.mock.invocationCallOrder[0];
    expect(vi.mocked(createConversation).mock.invocationCallOrder[0]).toBeLessThan(created);
    expect(created).toBeLessThan(vi.mocked(streamTurn).mock.invocationCallOrder[0]);
  });

  it('keeps the stream and optimistic items when the parent adopts the created id', async () => {
    const { gen, open } = gated([{ type: 'text', content: 'hello' }, { type: 'done' }]);
    vi.mocked(streamTurn).mockReturnValue(gen);
    vi.mocked(getConversation).mockResolvedValue(conv([msg('m1', 'user', 'hi'), msg('m2', 'assistant', 'hello')]));
    const { result, rerender } = setup(null);
    let p!: Promise<void>;
    act(() => {
      p = result.current.send('hi');
    });
    await waitFor(() => expect(streamTurn).toHaveBeenCalled());
    const signal = vi.mocked(streamTurn).mock.calls[0][3] as AbortSignal;
    rerender({ id: 'new1' });
    expect(signal.aborted).toBe(false);
    expect(result.current.items).toHaveLength(1);
    expect(getConversation).not.toHaveBeenCalled();
    open();
    await act(async () => {
      await p;
    });
    expect(result.current.items.map((i) => i.kind)).toEqual(['user', 'echo']);
  });

  it('applies live events and opens panels', async () => {
    vi.mocked(streamTurn).mockReturnValue(
      events([
        { type: 'text', content: 'ok' },
        { type: 'panel', toolCallId: 't1', target: { kind: 'calendar' } },
        { type: 'title', title: 'My title' },
        { type: 'done' },
      ]),
    );
    const { result, cb } = setup(null);
    await act(async () => {
      await result.current.send('hi');
    });
    expect(cb.onPanel).toHaveBeenCalledWith({ kind: 'calendar' });
    expect(cb.onTitle).toHaveBeenCalledWith('new1', 'My title');
  });

  it('reloads the conversation when the turn is done', async () => {
    vi.mocked(streamTurn).mockReturnValue(events([{ type: 'text', content: 'yo' }, { type: 'done' }]));
    vi.mocked(getConversation).mockResolvedValue(conv([msg('m1', 'user', 'hi'), msg('m2', 'assistant', 'yo')]));
    const { result, cb } = setup(null);
    await act(async () => {
      await result.current.send('hi');
    });
    expect(getConversation).toHaveBeenCalledWith('new1');
    expect(result.current.items).toEqual([
      { kind: 'user', key: 'm1', text: 'hi' },
      { kind: 'echo', key: 'm2', text: 'yo' },
    ]);
    expect(cb.onTurnDone).toHaveBeenCalledTimes(1);
    expect(result.current.sending).toBe(false);
  });

  it('ignores send while a turn is streaming', async () => {
    const { gen, open } = gated([{ type: 'done' }]);
    vi.mocked(streamTurn).mockReturnValue(gen);
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.loading).toBe(false));
    let p!: Promise<void>;
    act(() => {
      p = result.current.send('one');
    });
    await act(async () => {
      await result.current.send('two');
    });
    expect(streamTurn).toHaveBeenCalledTimes(1);
    open();
    await act(async () => {
      await p;
    });
  });

  it('ignores empty or whitespace text', async () => {
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.send('   ');
      await result.current.send('');
    });
    expect(streamTurn).not.toHaveBeenCalled();
    expect(createConversation).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('useConversation reload races', () => {
  it('an initial load resolving after send does not wipe the optimistic message', async () => {
    const load = deferred<ReturnType<typeof conv>>();
    vi.mocked(getConversation).mockReturnValueOnce(load.promise);
    const { gen, open } = gated([{ type: 'done' }]);
    vi.mocked(streamTurn).mockReturnValue(gen);
    const { result } = setup('c1');
    let p!: Promise<void>;
    act(() => {
      p = result.current.send('hi');
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    vi.mocked(getConversation).mockResolvedValue(conv([msg('m1', 'user', 'hi')]));
    await act(async () => {
      load.resolve(conv([msg('old', 'assistant', 'older')]));
    });
    expect(result.current.items).toEqual([{ kind: 'user', key: expect.any(String), text: 'hi' }]);
    open();
    await act(async () => {
      await p;
    });
    expect(result.current.items).toEqual([{ kind: 'user', key: 'm1', text: 'hi' }]);
    expect(result.current.loading).toBe(false);
  });

  it('a poll in flight when a turn starts does not overwrite live items', async () => {
    vi.useFakeTimers();
    const processing: JobView = { jobType: 'video', jobId: 'j1', state: 'processing', progressPercent: 1, panel: null };
    const poll = deferred<ReturnType<typeof conv>>();
    vi.mocked(getConversation)
      .mockResolvedValueOnce(conv([], [processing]))
      .mockReturnValueOnce(poll.promise);
    const { gen, open } = gated([{ type: 'done' }]);
    vi.mocked(streamTurn).mockReturnValue(gen);
    const { result } = setup('c1');
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(getConversation).toHaveBeenCalledTimes(2);
    let p!: Promise<void>;
    act(() => {
      p = result.current.send('hi');
    });
    expect(result.current.items).toHaveLength(1);
    vi.mocked(getConversation).mockResolvedValue(conv([msg('m1', 'user', 'hi')]));
    await act(async () => {
      poll.resolve(conv([msg('old', 'assistant', 'older')], [processing]));
    });
    expect(result.current.items).toEqual([{ kind: 'user', key: expect.any(String), text: 'hi' }]);
    open();
    await act(async () => {
      await p;
    });
    expect(result.current.items).toEqual([{ kind: 'user', key: 'm1', text: 'hi' }]);
  });
});

describe('useConversation create failures', () => {
  it('a failed create shows an error item', async () => {
    vi.mocked(createConversation).mockRejectedValue(new TypeError('network'));
    const { result, cb } = setup(null);
    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.items.at(-1)).toMatchObject({
      kind: 'error',
      message: 'Could not start a conversation. Try again.',
    });
    expect(result.current.sending).toBe(false);
    expect(streamTurn).not.toHaveBeenCalled();
    expect(cb.onCreated).not.toHaveBeenCalled();
  });

  it('a 429 from create maps to the limit message', async () => {
    vi.mocked(createConversation).mockRejectedValue(new JustEchoHttpError('Too many chats today.', 429));
    const { result } = setup(null);
    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.items.at(-1)).toMatchObject({ kind: 'error', message: 'Too many chats today.' });
    expect(result.current.sending).toBe(false);
  });
});

describe('useConversation send errors', () => {
  async function sendWith(err: unknown) {
    vi.mocked(streamTurn).mockImplementation(async function* () {
      throw err;
    });
    const hook = setup('c1');
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => {
      await hook.result.current.send('hi');
    });
    return hook;
  }

  it('maps a 429 to an error item with the server message', async () => {
    const { result } = await sendWith(new JustEchoHttpError('Slow down a little.', 429));
    expect(result.current.items.at(-1)).toMatchObject({ kind: 'error', message: 'Slow down a little.' });
    expect(result.current.sending).toBe(false);
  });

  it('maps a 402 to an upgrade item', async () => {
    const { result } = await sendWith(new JustEchoHttpError('nope', 402));
    expect(result.current.items.at(-1)).toMatchObject({
      kind: 'upgrade',
      message: 'Echo is part of the paid plans.',
    });
  });

  it('maps a 404 on send to notFound', async () => {
    const { result } = await sendWith(new JustEchoHttpError('gone', 404));
    expect(result.current.notFound).toBe(true);
    expect(result.current.sending).toBe(false);
  });

  it('a dropped stream leaves an error item and reloads', async () => {
    vi.mocked(streamTurn).mockReturnValue(events([{ type: 'text', content: 'part' }], new Error('socket')));
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(getConversation).mockClear();
    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.items.at(-1)).toMatchObject({
      kind: 'error',
      message: 'Lost connection to Echo. Anything it finished is saved.',
    });
    expect(result.current.sending).toBe(false);
    expect(getConversation).toHaveBeenCalledTimes(1);
  });
});

describe('useConversation loading and switching', () => {
  it('marks notFound on a 404', async () => {
    vi.mocked(getConversation).mockRejectedValue(new JustEchoHttpError('missing', 404));
    const { result } = setup('bad');
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('aborts the stream and drops its events when the conversation changes', async () => {
    const { gen, open } = gated([{ type: 'text', content: 'stale' }, { type: 'done' }]);
    vi.mocked(streamTurn).mockReturnValue(gen);
    const { result, rerender, cb } = setup('c1');
    await waitFor(() => expect(result.current.loading).toBe(false));
    let p!: Promise<void>;
    act(() => {
      p = result.current.send('hi');
    });
    await waitFor(() => expect(streamTurn).toHaveBeenCalled());
    const signal = vi.mocked(streamTurn).mock.calls[0][3] as AbortSignal;

    vi.mocked(getConversation).mockResolvedValue(conv([msg('n1', 'assistant', 'other thread')]));
    rerender({ id: 'c2' });
    expect(signal.aborted).toBe(true);
    await waitFor(() => expect(getConversation).toHaveBeenCalledWith('c2'));
    await waitFor(() => expect(result.current.items).toEqual([{ kind: 'echo', key: 'n1', text: 'other thread' }]));

    open();
    await act(async () => {
      await p;
    });
    expect(result.current.items).toEqual([{ kind: 'echo', key: 'n1', text: 'other thread' }]);
    expect(result.current.sending).toBe(false);
    expect(cb.onTurnDone).not.toHaveBeenCalled();
  });

  it('treats an AbortError as a silent drop', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.mocked(streamTurn).mockReturnValue(events([], abort));
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.send('hi');
    });
    expect(result.current.items.some((i) => i.kind === 'error')).toBe(false);
  });
});

const confirmMsg = msg('cf1', 'event', '', {
  event: { type: 'confirm', tool: 'delete_kit', preview: 'Delete it?', expiresAt: 9_999_999_999 },
  confirmState: 'pending',
});

describe('useConversation confirms', () => {
  it('confirm updates the card, appends the receipt and opens the panel', async () => {
    vi.mocked(getConversation).mockResolvedValue(conv([confirmMsg]));
    vi.mocked(resolveConfirm).mockResolvedValue({
      state: 'confirmed',
      receipt: { type: 'receipt', verb: 'DELETED', label: 'content kit' },
      panel: { kind: 'calendar' },
    });
    const { result, cb } = setup('c1');
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await act(async () => {
      await result.current.confirm('cf1', true);
    });
    expect(resolveConfirm).toHaveBeenCalledWith('c1', 'cf1', true);
    expect(result.current.items[0]).toMatchObject({ kind: 'confirm', state: 'confirmed' });
    expect(result.current.items[1]).toMatchObject({ kind: 'receipt', verb: 'DELETED', label: 'content kit' });
    expect(cb.onPanel).toHaveBeenCalledWith({ kind: 'calendar' });
    expect(result.current.confirmingId).toBeNull();
  });

  it('confirm is ignored while one is in flight for the same message', async () => {
    vi.mocked(getConversation).mockResolvedValue(conv([confirmMsg]));
    let finish!: (v: { state: 'cancelled' }) => void;
    vi.mocked(resolveConfirm).mockReturnValue(new Promise((r) => (finish = r)));
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    let p!: Promise<void>;
    act(() => {
      p = result.current.confirm('cf1', true);
    });
    expect(result.current.confirmingId).toBe('cf1');
    await act(async () => {
      await result.current.confirm('cf1', true);
    });
    expect(resolveConfirm).toHaveBeenCalledTimes(1);
    finish({ state: 'cancelled' });
    await act(async () => {
      await p;
    });
    expect(result.current.items[0]).toMatchObject({ state: 'cancelled' });
  });

  it('already_resolved reloads the conversation', async () => {
    vi.mocked(getConversation).mockResolvedValue(conv([confirmMsg]));
    vi.mocked(resolveConfirm).mockResolvedValue({ state: 'already_resolved' });
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    vi.mocked(getConversation).mockClear();
    await act(async () => {
      await result.current.confirm('cf1', true);
    });
    expect(getConversation).toHaveBeenCalledTimes(1);
  });

  it('expired and failed set the card state, failed also appends an error', async () => {
    vi.mocked(getConversation).mockResolvedValue(conv([confirmMsg]));
    const { result } = setup('c1');
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    vi.mocked(resolveConfirm).mockResolvedValueOnce({ state: 'expired' });
    await act(async () => {
      await result.current.confirm('cf1', true);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toMatchObject({ state: 'expired' });

    vi.mocked(resolveConfirm).mockResolvedValueOnce({ state: 'failed' });
    await act(async () => {
      await result.current.confirm('cf1', true);
    });
    expect(result.current.items[0]).toMatchObject({ state: 'failed' });
    expect(result.current.items[1]).toMatchObject({ kind: 'error', message: 'That did not go through.' });

    vi.mocked(resolveConfirm).mockResolvedValueOnce({ state: 'failed', message: 'Kit is locked.' });
    await act(async () => {
      await result.current.confirm('cf1', true);
    });
    expect(result.current.items[2]).toMatchObject({ kind: 'error', message: 'Kit is locked.' });
  });
});

describe('useConversation polling', () => {
  it('polls every 15 seconds while a job is processing and stops after', async () => {
    vi.useFakeTimers();
    const processing: JobView = { jobType: 'video', jobId: 'j1', state: 'processing', progressPercent: 10, panel: null };
    vi.mocked(getConversation)
      .mockResolvedValueOnce(conv([], [processing]))
      .mockResolvedValue(conv([msg('m1', 'assistant', 'done')], [{ ...processing, state: 'ready' }]));
    const { result } = setup('c1');
    await act(async () => {});
    expect(getConversation).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(14_000);
    });
    expect(getConversation).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(getConversation).toHaveBeenCalledTimes(2);
    expect(result.current.items).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(getConversation).toHaveBeenCalledTimes(2);
  });
});
