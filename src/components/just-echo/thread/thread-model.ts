/**
 * Pure model for the Just Echo thread: folds stored messages and live SSE
 * events into display items. No React, no I/O, never mutates its input.
 */
import type { EchoTurnEvent, PanelTarget, PublicMessage } from '@/lib/just-echo-client';

export type ConfirmState = 'pending' | 'running' | 'confirmed' | 'cancelled' | 'expired' | 'failed';

export type ThreadItem =
  | { kind: 'user'; key: string; text: string }
  | { kind: 'echo'; key: string; text: string }
  | { kind: 'working'; key: string; label: string }
  | { kind: 'receipt'; key: string; verb: string; label: string; link?: string; panel?: PanelTarget }
  | { kind: 'confirm'; key: string; messageId: string; tool: string; preview: string; expiresAt: number; state: ConfirmState }
  | { kind: 'upgrade'; key: string; message: string }
  | { kind: 'job'; key: string; label: string; state: 'ready' | 'failed'; panel?: PanelTarget }
  | { kind: 'error'; key: string; message: string };

const CONFIRM_STATES: readonly ConfirmState[] = [
  'pending',
  'running',
  'confirmed',
  'cancelled',
  'expired',
  'failed',
];

function toConfirmState(value: string | null): ConfirmState {
  return CONFIRM_STATES.includes(value as ConfirmState) ? (value as ConfirmState) : 'pending';
}

export function itemsFromMessages(messages: PublicMessage[], nowSec: number): ThreadItem[] {
  void nowSec; // expiry is derived at render time via effectiveConfirmState
  const items: ThreadItem[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      if (m.content) items.push({ kind: 'user', key: m.id, text: m.content });
    } else if (m.role === 'assistant') {
      if (m.content) items.push({ kind: 'echo', key: m.id, text: m.content });
    } else if (m.event) {
      const e = m.event;
      switch (e.type) {
        case 'receipt':
          items.push({ kind: 'receipt', key: m.id, verb: e.verb, label: e.label, link: e.link, panel: e.panel });
          break;
        case 'confirm':
          items.push({
            kind: 'confirm',
            key: m.id,
            messageId: m.id,
            tool: e.tool,
            preview: e.preview,
            expiresAt: e.expiresAt,
            state: toConfirmState(m.confirmState),
          });
          break;
        case 'upgrade':
          items.push({ kind: 'upgrade', key: m.id, message: e.message });
          break;
        case 'job_done':
          items.push({ kind: 'job', key: m.id, label: e.label, state: e.state, panel: e.panel });
          break;
      }
    }
  }
  return items;
}

export function applyTurnEvent(items: ThreadItem[], event: EchoTurnEvent): ThreadItem[] {
  switch (event.type) {
    case 'text': {
      const last = items[items.length - 1];
      if (last && last.kind === 'echo' && last.key.startsWith('live-')) {
        return [...items.slice(0, -1), { ...last, text: last.text + event.content }];
      }
      return [
        ...items,
        { kind: 'echo', key: `live-text-${items.length}`, text: event.content.replace(/^\n+/, '') },
      ];
    }
    case 'tool_start':
      return [...items, { kind: 'working', key: `live-tool-${event.toolCallId}`, label: event.summary }];
    case 'tool_done': {
      const key = `live-tool-${event.toolCallId}`;
      if (event.receipt.verb === 'PREVIEW') return items.filter((i) => i.key !== key);
      const receipt: ThreadItem = {
        kind: 'receipt',
        key,
        verb: event.receipt.verb,
        label: event.receipt.label,
        link: event.receipt.link,
      };
      return items.some((i) => i.key === key)
        ? items.map((i) => (i.key === key ? receipt : i))
        : [...items, receipt];
    }
    case 'panel': {
      const key = `live-tool-${event.toolCallId}`;
      return items.map((i) => (i.kind === 'receipt' && i.key === key ? { ...i, panel: event.target } : i));
    }
    case 'confirm_pending':
      return [
        ...items.map((i): ThreadItem =>
          i.kind === 'confirm' && i.tool === event.tool && i.state === 'pending'
            ? { ...i, state: 'cancelled' }
            : i,
        ),
        {
          kind: 'confirm',
          key: event.messageId,
          messageId: event.messageId,
          tool: event.tool,
          preview: event.preview,
          expiresAt: event.expiresAt,
          state: 'pending',
        },
      ];
    case 'upgrade':
      return [...items, { kind: 'upgrade', key: `live-upgrade-${items.length}`, message: event.message }];
    case 'error':
      return [...items, { kind: 'error', key: `live-error-${items.length}`, message: event.message }];
    default:
      return items;
  }
}

export function effectiveConfirmState(
  item: Extract<ThreadItem, { kind: 'confirm' }>,
  nowSec: number,
): ConfirmState {
  if (item.state === 'pending' && item.expiresAt < nowSec) return 'expired';
  if (item.state === 'running' && item.expiresAt + 60 < nowSec) return 'failed';
  return item.state;
}
