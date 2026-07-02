/**
 * Echo copilot client (v1). Lives outside api-client.ts deliberately:
 * api-client.ts is a protected path (CLAUDE.md); this module consumes its
 * exported axios instance, which already carries JWT sync + interceptors.
 */
import { apiClient } from './api-client';

export type EchoIntent = 'create' | 'ingest' | 'question' | 'command';

export interface EchoClassification {
  intent: EchoIntent;
  confidence: number;
  args: Record<string, string>;
  source: 'llm' | 'heuristic';
  latencyMs: number;
}

export interface EchoContext {
  page?: string;
  itemId?: string;
  hasAttachment?: boolean;
}

export async function classifyEchoInput(
  text: string,
  context?: EchoContext,
): Promise<EchoClassification> {
  const response = await apiClient.post('/echo/classify', { text, context });
  return response.data.data as EchoClassification;
}

// ---- Echo v2 agentic chat (paid tiers; backend gates with 402) ----
//
// True streaming via fetch + ReadableStream, NOT the buffered axios pattern
// kb.chat uses: the agentic loop can pause mid-stream on a confirm_request
// and wait for POST /echo/chat/confirm — a buffered client would deadlock
// against that pause (events invisible until the stream ends).

export type EchoChatEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; toolCallId: string; tool: string; summary: string }
  | { type: 'tool_done'; toolCallId: string; receipt: { verb: string; label: string; link?: string } }
  | { type: 'confirm_request'; toolCallId: string; tool: string; argsPreview: Record<string, unknown> }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };

export class EchoChatGateError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'EchoChatGateError';
    this.status = status;
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

async function echoAuthHeader(): Promise<Record<string, string>> {
  // Mirror api-client's token source: the app logs in through the backend
  // (/api/auth/login) and keeps the JWT in localStorage — the Supabase
  // client session is only a refresh fallback, not the primary store.
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('authToken');
  }
  if (!token) {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * POST /api/echo/chat — SSE async generator. Yields events as they arrive.
 * Throws EchoChatGateError with status 402 (free user) / 429 (daily limit)
 * before yielding anything; callers branch on status for the upgrade card.
 */
export async function* streamEchoChat(
  sessionId: string,
  message: string,
  pageContext?: { route?: string; focusedEntity?: { type: 'kit' | 'clip'; id: string } },
): AsyncGenerator<EchoChatEvent, void, unknown> {
  const auth = await echoAuthHeader();
  const response = await fetch(`${API_BASE}/echo/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...auth,
    },
    body: JSON.stringify({ sessionId, message, pageContext }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new EchoChatGateError(
      body?.error?.message || `Echo chat error ${response.status}`,
      response.status,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const parse = (seg: string): EchoChatEvent | null => {
    const line = seg.trim();
    if (!line.startsWith('data: ')) return null;
    const payload = line.slice('data: '.length).trim();
    if (!payload) return null;
    try {
      return JSON.parse(payload) as EchoChatEvent;
    } catch {
      return null;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      const trailing = parse(buffer);
      if (trailing) yield trailing;
      return;
    }
    buffer += decoder.decode(value, { stream: true });
    const segments = buffer.split('\n\n');
    buffer = segments.pop() ?? '';
    for (const seg of segments) {
      const event = parse(seg);
      if (event) yield event;
      if (event?.type === 'done') return;
    }
  }
}

/** Resolve a confirm-tier pause. */
export async function confirmEchoAction(toolCallId: string, approved: boolean): Promise<boolean> {
  const response = await apiClient.post('/echo/chat/confirm', { toolCallId, approved });
  return !!response.data?.data?.resolved;
}
