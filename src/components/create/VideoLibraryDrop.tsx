'use client';

import { useState } from 'react';
import { Library, Plus } from 'lucide-react';

// SP1 routing labels. SP2 makes these per-item agentic suggestions backed by the
// deferred-ingestion backend. Default route is Stockpile (library), not clip-now.
type Route = 'clip_now' | 'library' | 'context_only';

const ROUTE_LABEL: Record<Route, string> = {
  clip_now: 'Clip now',
  library: 'Stockpile',
  context_only: 'Context only',
};

interface TrayItem {
  id: string;
  label: string;
  route: Route;
}

export function VideoLibraryDrop() {
  const [link, setLink] = useState('');
  const [items, setItems] = useState<TrayItem[]>([]);

  const addLink = () => {
    const trimmed = link.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, { id: `${prev.length}-${trimmed}`, label: trimmed, route: 'library' }]);
    setLink('');
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Library className="h-4 w-4 text-primary" />
        Add videos or links to your library
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Adding these to your knowledge. They will teach me your voice and what you talk about.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addLink();
          }}
          placeholder="Paste a YouTube or Zoom link"
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
        />
        <button
          type="button"
          onClick={addLink}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add to library
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-primary/5 px-3 py-2"
            >
              <span className="truncate text-xs text-foreground">{item.label}</span>
              <span className="ml-2 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {ROUTE_LABEL[item.route]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
