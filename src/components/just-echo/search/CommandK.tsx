'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import api from '@/lib/api-client';
import type { ConversationSummary, PanelTarget } from '@/lib/just-echo-client';
import { searchItems, type SearchResult } from './search';

export type CommandKProps = {
  open: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  onPickConversation: (id: string) => void;
  onOpenPanel: (t: PanelTarget) => void;
};

type Kit = { id: string; title: string | null };
type Video = { id: string; title: string };

export function CommandK(props: CommandKProps) {
  const { open } = props;
  const [kits, setKits] = useState<Kit[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const started = useRef(false);

  // Only the first open loads; reopening reuses what is already here.
  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    api.contentKits
      .list(100)
      .then((r) => setKits((r.data?.kits ?? []).map((k) => ({ id: k.id, title: k.title ?? null }))))
      .catch(() => {});
    api.clips
      .list(50)
      .then((r) =>
        setVideos((r.data?.uploads ?? []).map((u) => ({ id: u.id, title: u.originalFilename || 'Untitled video' }))),
      )
      .catch(() => {});
  }, [open]);

  if (!open) return null;
  return <CommandKDialog {...props} kits={kits} videos={videos} />;
}

function CommandKDialog({
  onClose,
  conversations,
  onPickConversation,
  onOpenPanel,
  kits,
  videos,
}: CommandKProps & { kits: Kit[]; videos: Video[] }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => prev?.focus?.();
  }, []);

  const results = useMemo(() => searchItems(query, { conversations, kits, videos }), [query, conversations, kits, videos]);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  function pick(r: SearchResult) {
    if (r.group === 'Conversations') onPickConversation(r.id);
    else if (r.group === 'Kits') onOpenPanel({ kind: 'kit', id: r.id });
    else onOpenPanel({ kind: 'clips', id: r.id });
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(results.length ? (activeIndex + 1) % results.length : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(results.length ? (activeIndex - 1 + results.length) % results.length : 0);
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) pick(r);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[96px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-je-hair bg-je-panel"
      >
        <div className="flex items-center gap-3 border-b border-je-hair p-4">
          <Search size={18} strokeWidth={1.7} aria-hidden="true" className="shrink-0 text-je-muted" />
          <input
            ref={inputRef}
            type="text"
            role="textbox"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search conversations, kits and videos"
            aria-label="Search conversations, kits and videos"
            aria-controls="je-cmdk-list"
            aria-activedescendant={results.length ? `je-cmdk-opt-${activeIndex}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-je-ink placeholder:text-je-muted focus:outline-none"
          />
        </div>
        <div id="je-cmdk-list" role="listbox" aria-label="Results" className="overflow-y-auto p-2">
          {results.length === 0 && <p className="p-3 text-[13px] text-je-muted">No matches.</p>}
          {results.map((r, i) => {
            const header = i === 0 || results[i - 1].group !== r.group;
            return (
              <div key={`${r.group}:${r.id}`}>
                {header && <p className="px-3 pb-1 pt-2 text-[12px] font-bold text-je-muted">{r.group}</p>}
                <div
                  id={`je-cmdk-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseMove={() => setActive(i)}
                  onClick={() => pick(r)}
                  className={`cursor-pointer truncate rounded-[8px] px-3 py-2 text-[13px] font-medium ${i === activeIndex ? 'bg-je-item' : ''}`}
                >
                  {r.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
