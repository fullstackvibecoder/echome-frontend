'use client';

/**
 * useConversationList
 *
 * Recent conversations for the left column. Polls every 30 seconds, and
 * only while some conversation has a job running.
 */
import { useCallback, useEffect, useState } from 'react';
import { listConversations, type ConversationSummary } from '@/lib/just-echo-client';

const POLL_MS = 30_000;

export function useConversationList(): {
  conversations: ConversationSummary[];
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  setTitle: (id: string, title: string) => void;
} {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onData = useCallback((next: ConversationSummary[]) => {
    setConversations(next);
    setError(false);
    setLoading(false);
  }, []);
  const onFail = useCallback(() => {
    setError(true);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      onData(await listConversations());
    } catch {
      onFail();
    }
  }, [onData, onFail]);

  useEffect(() => {
    let cancelled = false;
    listConversations().then(
      (next) => !cancelled && onData(next),
      () => !cancelled && onFail(),
    );
    return () => {
      cancelled = true;
    };
  }, [onData, onFail]);

  const anyRunning = conversations.some((c) => c.jobRunning);
  useEffect(() => {
    if (!anyRunning) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [anyRunning, refresh]);

  const setTitle = useCallback((id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  return { conversations, loading, error, refresh, setTitle };
}
