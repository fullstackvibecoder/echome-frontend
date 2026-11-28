/**
 * Typed client for the Just Echo endpoints (backend src/routes/just-echo.ts).
 * Types mirror src/services/echo/{panel-targets,conversations,
 * conversation-actions,conversation-jobs,home-data,sse}.ts on develop.
 * Consumes api-client's axios instance; never modifies api-client.ts.
 */
import { apiClient } from './api-client';
import { echoAuthHeader } from './echo-client';
import { readSSE } from './sse';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ---- Panels ----

export const PANEL_KINDS = ['kit', 'clips', 'carousel', 'calendar', 'voice', 'list'] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];
export type PanelTarget = { kind: PanelKind; id?: string; filter?: Record<string, string> };

// ---- Conversations and messages ----

export interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
  thumbnailUrl: string | null;
  jobRunning: boolean;
}

export interface ConversationRow {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Stored event with the confirm token stripped by the server. */
export type PublicEvent =
  | { type: 'receipt'; verb: string; label: string; link?: string; panel?: PanelTarget }
  | { type: 'confirm'; tool: string; preview: string; expiresAt: number }
  | { type: 'upgrade'; message: string; status: 402 | 403 }
  | {
      type: 'job_done';
      jobType: 'generation' | 'video';
      jobId: string;
      state: 'ready' | 'failed';
      label: string;
      panel?: PanelTarget;
    };

export interface PublicMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'event';
  content: string;
  event: PublicEvent | null;
  confirmState: string | null;
  actionId: string | null;
  createdAt: string;
}

export interface JobView {
  jobType: 'generation' | 'video';
  jobId: string;
  state: 'processing' | 'ready' | 'failed';
  progressPercent: number | null;
  panel: PanelTarget | null;
}

export interface ResolveResult {
  state: 'confirmed' | 'cancelled' | 'expired' | 'failed' | 'already_resolved';
  receipt?: PublicEvent;
  panel?: PanelTarget;
  message?: string;
}

// ---- Home ----

export interface HomePost {
  id: string;
  scheduledAt: string;
  platforms: string[];
  title: string | null;
  status: string;
}

export interface ReadyItem {
  kind: 'kit' | 'clip' | 'running';
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  jobType?: 'generation' | 'video';
}

export interface HomeSuggestion {
  kind: 'open_day' | 'unclipped_video' | 'radar_pick';
  label: string;
  id?: string;
}

export interface HomeData {
  justEcho: boolean;
  week: { posts: HomePost[] } | null;
  nextUp: { id: string; scheduledAt: string; platforms: string[]; title: string | null } | null;
  ready: { items: ReadyItem[] } | null;
  knowledge: { count: number; today: number | null; sparkline: number[] | null } | null;
  suggestions: HomeSuggestion[];
}

// ---- Turn stream ----

export type EchoTurnEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; toolCallId: string; tool: string; summary: string }
  | {
      type: 'tool_done';
      toolCallId: string;
      receipt: { verb: string; label: string; link?: string };
    }
  | {
      type: 'confirm_request';
      toolCallId: string;
      tool: string;
      argsPreview: Record<string, unknown>;
    }
  | { type: 'conversation'; id: string }
  | { type: 'panel'; toolCallId: string; target: PanelTarget }
  | { type: 'confirm_pending'; messageId: string; tool: string; preview: string; expiresAt: number }
  | { type: 'upgrade'; message: string; status: 402 | 403 }
  | { type: 'title'; title: string }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };

export class JustEchoHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'JustEchoHttpError';
    this.status = status;
  }
}

function toHttpError(err: unknown): JustEchoHttpError {
  if (err instanceof JustEchoHttpError) return err;
  const e = err as {
    message?: string;
    response?: { status?: number; data?: { error?: { message?: string } } };
  };
  return new JustEchoHttpError(
    e?.response?.data?.error?.message ?? e?.message ?? 'Request failed',
    e?.response?.status ?? 0,
  );
}

async function call<T>(request: () => Promise<{ data: { data: T } }>): Promise<T> {
  try {
    const response = await request();
    return response.data.data;
  } catch (err) {
    throw toHttpError(err);
  }
}

export async function getJustEchoAccess(): Promise<boolean> {
  const data = await call<{ justEcho: boolean }>(() => apiClient.get('/echo/access'));
  return data.justEcho === true;
}

export function getHome(tz: string): Promise<HomeData> {
  return call<HomeData>(() => apiClient.get(`/echo/home?tz=${encodeURIComponent(tz)}`));
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const data = await call<{ conversations: ConversationSummary[] }>(() =>
    apiClient.get('/echo/conversations?limit=50'),
  );
  return data.conversations;
}

export function createConversation(): Promise<ConversationRow> {
  return call<ConversationRow>(() => apiClient.post('/echo/conversations'));
}

export function getConversation(
  id: string,
): Promise<{ conversation: ConversationRow; messages: PublicMessage[]; jobs: JobView[] }> {
  return call(() => apiClient.get(`/echo/conversations/${encodeURIComponent(id)}?limit=200`));
}

export function resolveConfirm(
  conversationId: string,
  messageId: string,
  approved: boolean,
): Promise<ResolveResult> {
  return call<ResolveResult>(() =>
    apiClient.post(
      `/echo/conversations/${encodeURIComponent(conversationId)}/confirms/${encodeURIComponent(messageId)}`,
      { approved },
    ),
  );
}

/**
 * POST /echo/conversations/:id/messages, an SSE stream. Throws
 * JustEchoHttpError (402/403/429/404...) before yielding anything.
 */
export async function* streamTurn(
  conversationId: string,
  message: string,
  panel: PanelTarget | null,
  signal?: AbortSignal,
): AsyncGenerator<EchoTurnEvent, void, unknown> {
  const auth = await echoAuthHeader();
  const response = await fetch(
    `${API_BASE}/echo/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...auth,
      },
      body: JSON.stringify(panel ? { message, panel } : { message }),
      signal,
    },
  );

  if (!response.ok) {
    let body: { error?: { message?: string } } = {};
    try {
      body = await response.json();
    } catch {
      // non-JSON error body: fall back to the status message
    }
    throw new JustEchoHttpError(
      body?.error?.message || `Echo error ${response.status}`,
      response.status,
    );
  }

  if (!response.body) return;
  yield* readSSE<EchoTurnEvent>(response.body);
}
