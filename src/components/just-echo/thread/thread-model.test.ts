import { describe, it, expect } from 'vitest';
import {
  applyTurnEvent,
  effectiveConfirmState,
  itemsFromMessages,
  type ThreadItem,
} from './thread-model';
import type { PublicMessage } from '@/lib/just-echo-client';

function msg(p: Partial<PublicMessage> & { id: string }): PublicMessage {
  return {
    conversationId: 'c1',
    role: 'user',
    content: '',
    event: null,
    confirmState: null,
    actionId: null,
    createdAt: '2026-11-27T00:00:00Z',
    ...p,
  };
}

type Confirm = Extract<ThreadItem, { kind: 'confirm' }>;

describe('thread-model', () => {
  it('itemsFromMessages maps roles and events in order', () => {
    const items = itemsFromMessages(
      [
        msg({ id: 'a', role: 'user', content: 'hi' }),
        msg({ id: 'b', role: 'assistant', content: 'hello' }),
        msg({ id: 'c', role: 'assistant', content: '' }),
        msg({ id: 'd', role: 'event', event: { type: 'receipt', verb: 'SAVED', label: 'Kit', link: '/k' } }),
        msg({ id: 'e', role: 'event', event: { type: 'confirm', tool: 'post_now', preview: 'p', expiresAt: 100 } }),
        msg({ id: 'f', role: 'event', event: { type: 'confirm', tool: 'post_now', preview: 'p', expiresAt: 100 }, confirmState: 'confirmed' }),
        msg({ id: 'g', role: 'event', event: { type: 'upgrade', message: 'Upgrade', status: 402 } }),
        msg({ id: 'h', role: 'event', event: { type: 'job_done', jobType: 'video', jobId: 'j', state: 'ready', label: 'Clips' } }),
        msg({ id: 'i', role: 'event', event: null }),
      ],
      50,
    );
    expect(items.map((i) => [i.kind, i.key])).toEqual([
      ['user', 'a'],
      ['echo', 'b'],
      ['receipt', 'd'],
      ['confirm', 'e'],
      ['confirm', 'f'],
      ['upgrade', 'g'],
      ['job', 'h'],
    ]);
    expect((items[3] as Confirm).state).toBe('pending');
    expect((items[4] as Confirm).state).toBe('confirmed');
    expect(items[2]).toMatchObject({ verb: 'SAVED', label: 'Kit', link: '/k' });
  });

  it('appends streamed text to the live echo item', () => {
    let items: ThreadItem[] = [];
    items = applyTurnEvent(items, { type: 'text', content: '\n\nHel' });
    items = applyTurnEvent(items, { type: 'text', content: 'lo' });
    expect(items).toEqual([{ kind: 'echo', key: 'live-text-0', text: 'Hello' }]);
  });

  it('starts a new echo item after a tool row', () => {
    let items: ThreadItem[] = [];
    items = applyTurnEvent(items, { type: 'text', content: 'a' });
    items = applyTurnEvent(items, { type: 'tool_start', toolCallId: 't1', tool: 'x', summary: 'Working' });
    items = applyTurnEvent(items, { type: 'text', content: 'b' });
    expect(items.map((i) => i.kind)).toEqual(['echo', 'working', 'echo']);
    expect(items[2].key).toBe('live-text-2');
  });

  it('replaces the working row with its receipt', () => {
    let items: ThreadItem[] = [];
    items = applyTurnEvent(items, { type: 'tool_start', toolCallId: 't1', tool: 'x', summary: 'Working' });
    items = applyTurnEvent(items, { type: 'tool_done', toolCallId: 't1', receipt: { verb: 'SAVED', label: 'Kit' } });
    expect(items).toEqual([{ kind: 'receipt', key: 'live-tool-t1', verb: 'SAVED', label: 'Kit', link: undefined }]);
    const pushed = applyTurnEvent([], { type: 'tool_done', toolCallId: 't2', receipt: { verb: 'A', label: 'B' } });
    expect(pushed).toHaveLength(1);
    expect(pushed[0].key).toBe('live-tool-t2');
  });

  it('drops the PREVIEW receipt so the confirm card stands alone', () => {
    let items: ThreadItem[] = [];
    items = applyTurnEvent(items, { type: 'tool_start', toolCallId: 't1', tool: 'post_now', summary: 'Posting' });
    items = applyTurnEvent(items, { type: 'tool_done', toolCallId: 't1', receipt: { verb: 'PREVIEW', label: 'x' } });
    expect(items).toEqual([]);
    items = applyTurnEvent(items, { type: 'confirm_pending', messageId: 'm1', tool: 'post_now', preview: 'p', expiresAt: 10 });
    expect(items.map((i) => i.kind)).toEqual(['confirm']);
  });

  it('attaches a panel to its receipt', () => {
    let items: ThreadItem[] = [];
    items = applyTurnEvent(items, { type: 'tool_start', toolCallId: 't1', tool: 'x', summary: 'W' });
    items = applyTurnEvent(items, { type: 'tool_done', toolCallId: 't1', receipt: { verb: 'SAVED', label: 'Kit' } });
    items = applyTurnEvent(items, { type: 'panel', toolCallId: 't1', target: { kind: 'kit', id: 'k1' } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'receipt', panel: { kind: 'kit', id: 'k1' } });
  });

  it('a new confirm cancels older pending confirms of the same tool', () => {
    let items: ThreadItem[] = [];
    items = applyTurnEvent(items, { type: 'confirm_pending', messageId: 'm1', tool: 'post_now', preview: 'a', expiresAt: 10 });
    items = applyTurnEvent(items, { type: 'confirm_pending', messageId: 'm2', tool: 'schedule_post', preview: 'b', expiresAt: 10 });
    items = applyTurnEvent(items, { type: 'confirm_pending', messageId: 'm3', tool: 'post_now', preview: 'c', expiresAt: 10 });
    expect(items.map((i) => (i as Confirm).state)).toEqual(['cancelled', 'pending', 'pending']);
  });

  it('effectiveConfirmState expires a lapsed pending confirm', () => {
    const base: Confirm = { kind: 'confirm', key: 'k', messageId: 'k', tool: 't', preview: 'p', expiresAt: 100, state: 'pending' };
    expect(effectiveConfirmState(base, 99)).toBe('pending');
    expect(effectiveConfirmState(base, 101)).toBe('expired');
    const running = { ...base, state: 'running' as const };
    expect(effectiveConfirmState(running, 160)).toBe('running');
    expect(effectiveConfirmState(running, 161)).toBe('failed');
    expect(effectiveConfirmState({ ...base, state: 'confirmed' }, 999)).toBe('confirmed');
  });

  it('does not mutate the input array', () => {
    const items: ThreadItem[] = [
      { kind: 'echo', key: 'live-text-0', text: 'a' },
      { kind: 'confirm', key: 'm1', messageId: 'm1', tool: 'x', preview: 'p', expiresAt: 1, state: 'pending' },
    ];
    const snapshot = JSON.stringify(items);
    applyTurnEvent(items, { type: 'text', content: 'b' });
    applyTurnEvent(items, { type: 'confirm_pending', messageId: 'm2', tool: 'x', preview: 'p', expiresAt: 1 });
    applyTurnEvent(items, { type: 'error', code: 'e', message: 'm' });
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});
