'use client';

/**
 * useConversation
 *
 * Owns one Just Echo thread: loads it, streams a turn into it, resolves
 * confirms, and polls while a background job runs. Every async path is
 * guarded by activeIdRef (the conversation the hook currently shows), so a
 * switch mid-stream aborts the old turn and its late events are dropped.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  JustEchoHttpError,
  createConversation,
  getConversation,
  resolveConfirm,
  streamTurn,
  type PanelTarget,
} from '@/lib/just-echo-client';
import {
  applyTurnEvent,
  itemsFromMessages,
  type ConfirmState,
  type ThreadItem,
} from '@/components/just-echo/thread/thread-model';

const POLL_MS = 15_000;
const LOST_CONNECTION = 'Lost connection to Echo. Anything it finished is saved.';
const UPGRADE_MESSAGE = 'Echo is part of the paid plans.';
const NOT_STARTED = 'Could not start a conversation. Try again.';
const NOT_DONE = 'That did not go through.';

interface Options {
  conversationId: string | null;
  panel: PanelTarget | null;
  onCreated: (id: string) => void;
  onPanel: (target: PanelTarget) => void;
  onTitle: (id: string, title: string) => void;
  onTurnDone: () => void;
}

function isAbort(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === 'AbortError';
}

function appendError(items: ThreadItem[], message: string): ThreadItem[] {
  return applyTurnEvent(items, { type: 'error', code: 'client', message });
}

export function useConversation(opts: Options): {
  items: ThreadItem[];
  loading: boolean;
  sending: boolean;
  notFound: boolean;
  confirmingId: string | null;
  /** Resolves false when the turn failed before Echo streamed anything. */
  send: (text: string) => Promise<boolean>;
  confirm: (messageId: string, approved: boolean) => Promise<void>;
} {
  const { conversationId } = opts;
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(conversationId !== null);
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [jobRunning, setJobRunning] = useState(false);

  // The conversation this hook currently represents. Set at switch time and
  // when a first send creates a conversation, so the parent adopting that id
  // is a no-op rather than an abort-and-reload.
  const activeIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const reloadSeqRef = useRef(0);
  const confirmingRef = useRef<string | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  /**
   * Fetch the stored thread and show it, plus any items to keep on the end.
   * Only the latest-started reload applies, and while a turn streams only the
   * turn's own reload (own = true) may replace the live items.
   */
  const reload = useCallback(async (id: string, keep: ThreadItem[] = [], own = false) => {
    const seq = ++reloadSeqRef.current;
    const stale = () =>
      activeIdRef.current !== id ||
      seq !== reloadSeqRef.current ||
      (!own && sendingRef.current);
    try {
      const data = await getConversation(id);
      if (stale()) return;
      setItems([...itemsFromMessages(data.messages, Date.now() / 1000), ...keep]);
      setJobRunning(data.jobs.some((j) => j.state === 'processing'));
      setNotFound(false);
    } catch (err) {
      if (stale()) return;
      if (err instanceof JustEchoHttpError && err.status === 404) {
        setNotFound(true);
        setItems([]);
      } else if (keep.length) {
        setItems((prev) => [...prev, ...keep]);
      }
    } finally {
      if (activeIdRef.current === id) setLoading(false);
    }
  }, []);

  // Switch conversations (also runs on mount).
  useEffect(() => {
    if (conversationId === activeIdRef.current) return;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    confirmingRef.current = null;
    activeIdRef.current = conversationId;
    setItems([]);
    setSending(false);
    setNotFound(false);
    setConfirmingId(null);
    setJobRunning(false);
    if (conversationId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload(conversationId);
  }, [conversationId, reload]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Poll while a job is processing.
  useEffect(() => {
    if (!jobRunning || !conversationId) return;
    const timer = setInterval(() => {
      if (!sendingRef.current) void reload(conversationId);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [jobRunning, conversationId, reload]);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const message = text.trim();
      if (!message || sendingRef.current) return true;
      sendingRef.current = true;
      setSending(true);
      const controller = new AbortController();
      abortRef.current = controller;
      let id = activeIdRef.current;
      const live = () => !controller.signal.aborted && activeIdRef.current === id;
      let trailing: ThreadItem[] = [];
      let streamed = false;

      setItems((prev) => [...prev, { kind: 'user', key: `live-user-${prev.length}`, text: message }]);
      try {
        if (!id) {
          const created = await createConversation();
          if (controller.signal.aborted) return true;
          id = created.id;
          activeIdRef.current = id;
          optsRef.current.onCreated(id);
        }
        let done = false;
        for await (const event of streamTurn(id, message, optsRef.current.panel, controller.signal)) {
          if (!live()) return true;
          streamed = true;
          if (event.type === 'done') {
            done = true;
            continue;
          }
          if (event.type === 'panel') optsRef.current.onPanel(event.target);
          if (event.type === 'title') optsRef.current.onTitle(id, event.title);
          if (event.type === 'error') {
            trailing = appendError([], event.message);
          }
          setItems((prev) => applyTurnEvent(prev, event));
        }
        if (!live()) return true;
        if (!done) trailing = appendError([], LOST_CONNECTION);
        await reload(id, trailing, true);
        if (live()) optsRef.current.onTurnDone();
        return true;
      } catch (err) {
        if (!live() || isAbort(err)) return true;
        if (err instanceof JustEchoHttpError && err.status === 404) {
          setNotFound(true);
          setItems([]);
        } else if (err instanceof JustEchoHttpError && err.status === 402) {
          setItems((prev) => applyTurnEvent(prev, { type: 'upgrade', message: UPGRADE_MESSAGE, status: 402 }));
        } else if (err instanceof JustEchoHttpError) {
          setItems((prev) => appendError(prev, err.message));
        } else {
          if (id) await reload(id, appendError([], LOST_CONNECTION), true);
          else setItems((prev) => appendError(prev, NOT_STARTED));
        }
        return streamed;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          sendingRef.current = false;
          setSending(false);
        }
      }
    },
    [reload],
  );

  const confirm = useCallback(
    async (messageId: string, approved: boolean) => {
      const id = activeIdRef.current;
      if (!id || confirmingRef.current === messageId) return;
      confirmingRef.current = messageId;
      setConfirmingId(messageId);
      const setCard = (state: ConfirmState, extra: ThreadItem[] = []) =>
        setItems((prev) => [
          ...prev.map((i): ThreadItem =>
            i.kind === 'confirm' && i.messageId === messageId ? { ...i, state } : i,
          ),
          ...extra,
        ]);
      try {
        const result = await resolveConfirm(id, messageId, approved);
        if (activeIdRef.current !== id) return;
        if (result.state === 'already_resolved') {
          await reload(id);
          optsRef.current.onTurnDone();
          return;
        }
        const extra: ThreadItem[] = [];
        if (result.receipt?.type === 'receipt') {
          extra.push({
            kind: 'receipt',
            key: `receipt-${messageId}`,
            verb: result.receipt.verb,
            label: result.receipt.label,
            link: result.receipt.link,
            panel: result.receipt.panel,
          });
        }
        if (result.state === 'failed') {
          extra.push({ kind: 'error', key: `error-${messageId}-${Date.now()}`, message: result.message ?? NOT_DONE });
        }
        setCard(result.state, extra);
        if (result.panel) optsRef.current.onPanel(result.panel);
        optsRef.current.onTurnDone();
      } catch {
        if (activeIdRef.current === id) {
          setItems((prev) => appendError(prev, NOT_DONE));
        }
      } finally {
        if (confirmingRef.current === messageId) {
          confirmingRef.current = null;
          if (activeIdRef.current === id) setConfirmingId(null);
        }
      }
    },
    [reload],
  );

  return { items, loading, sending, notFound, confirmingId, send, confirm };
}
