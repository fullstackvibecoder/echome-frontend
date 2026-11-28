import { describe, it, expect } from 'vitest';
import { searchItems } from './search';
import type { ConversationSummary } from '@/lib/just-echo-client';

const conv = (id: string, title: string | null): ConversationSummary => ({
  id,
  title,
  updatedAt: '2026-11-27T00:00:00Z',
  thumbnailUrl: null,
  jobRunning: false,
});

describe('searchItems', () => {
  it('searchItems groups, caps at 6 and falls back to recent conversations', () => {
    const conversations = Array.from({ length: 10 }, (_, i) => conv(`c${i}`, i === 9 ? null : `Plan ${i}`));
    const kits = Array.from({ length: 8 }, (_, i) => ({ id: `k${i}`, title: i === 0 ? null : `Plan kit ${i}` }));
    const videos = [{ id: 'v1', title: 'My PLAN video' }, { id: 'v2', title: 'Other' }];
    const src = { conversations, kits, videos };

    const empty = searchItems('', src);
    expect(empty).toHaveLength(8);
    expect(empty.every((r) => r.group === 'Conversations')).toBe(true);
    expect(empty[0].id).toBe('c0');

    const r = searchItems('plan', src);
    expect(r.filter((x) => x.group === 'Conversations')).toHaveLength(6);
    expect(r.filter((x) => x.group === 'Kits')).toHaveLength(6);
    expect(r.filter((x) => x.group === 'Videos').map((x) => x.id)).toEqual(['v1']);
    expect(r.map((x) => x.group)).toEqual([
      ...Array(6).fill('Conversations'),
      ...Array(6).fill('Kits'),
      'Videos',
    ]);

    expect(searchItems('new conv', src).map((x) => x.id)).toEqual(['c9']);
    expect(searchItems('untitled kit', src).map((x) => x.id)).toEqual(['k0']);
  });
});
