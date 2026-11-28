import type { ConversationSummary } from '@/lib/just-echo-client';

export type SearchGroup = 'Conversations' | 'Kits' | 'Videos';
export type SearchResult = { group: SearchGroup; id: string; title: string };

export type SearchSource = {
  conversations: ConversationSummary[];
  kits: { id: string; title: string | null }[];
  videos: { id: string; title: string }[];
};

const PER_GROUP = 6;
const RECENT = 8;

export function searchItems(query: string, src: SearchSource): SearchResult[] {
  const q = query.trim().toLowerCase();
  const conversations = src.conversations.map((c) => ({ id: c.id, title: c.title ?? 'New conversation' }));
  if (!q) {
    return conversations.slice(0, RECENT).map((c) => ({ group: 'Conversations' as const, ...c }));
  }
  const pick = (group: SearchGroup, rows: { id: string; title: string }[]): SearchResult[] =>
    rows
      .filter((r) => r.title.toLowerCase().includes(q))
      .slice(0, PER_GROUP)
      .map((r) => ({ group, id: r.id, title: r.title }));
  return [
    ...pick('Conversations', conversations),
    ...pick('Kits', src.kits.map((k) => ({ id: k.id, title: k.title ?? 'Untitled kit' }))),
    ...pick('Videos', src.videos),
  ];
}
