'use client';

import { useRef } from 'react';
import { CalendarPlus, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Tile } from '@/components/ds/Tile';
import type { HomeSuggestion, PanelTarget } from '@/lib/just-echo-client';
import { EchoBox } from './EchoBox';
import { Thread } from './thread/Thread';
import type { ThreadItem } from './thread/thread-model';

export type StageProps = {
  mode: 'new' | 'thread';
  firstName: string | null;
  suggestions: HomeSuggestion[];
  items: ThreadItem[];
  sending: boolean;
  notFound: boolean;
  draft: string;
  setDraft: (v: string) => void;
  onSend: (t: string) => void;
  onOpenPanel: (t: PanelTarget) => void;
  onConfirm: (id: string, ok: boolean) => void;
  confirmingId: string | null;
  onNew: () => void;
};

function partOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

export function Stage(props: StageProps) {
  const { mode, firstName, suggestions, items, sending, notFound, draft, setDraft, onSend, onOpenPanel, onConfirm, confirmingId, onNew } = props;
  const boxRef = useRef<HTMLTextAreaElement>(null);

  if (mode === 'thread') {
    if (notFound) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-[15px] font-bold">This conversation is not available.</p>
          <Button variant="primary" onClick={onNew}>
            New conversation
          </Button>
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <Thread items={items} onOpenPanel={onOpenPanel} onConfirm={onConfirm} confirmingId={confirmingId} />
        </div>
        <div className="p-4">
          <EchoBox onSend={onSend} disabled={sending} placeholder="Steer it..." autoFocus value={draft} onChange={setDraft} />
        </div>
      </div>
    );
  }

  const tiles = suggestions.slice(0, 3);
  const greeting = firstName ? `${partOfDay()}, ${firstName}.` : `${partOfDay()}.`;

  function fillTake(label: string) {
    setDraft(`Write my take on "${label}". My angle: `);
    boxRef.current?.focus();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-6">
      <h1 className="text-center text-[36px] font-black leading-[1.1] tracking-[-0.04em]">
        <span className="block">{greeting}</span>
        <span className="je-grad-text block">What should we make?</span>
      </h1>
      <div className="w-full max-w-[640px]">
        <EchoBox
          onSend={onSend}
          disabled={sending}
          placeholder="Paste a link or tell Echo what to make..."
          autoFocus
          value={draft}
          onChange={setDraft}
          inputRef={boxRef}
        />
      </div>
      {tiles.length > 0 && (
        <div data-testid="suggestion-tiles" className="grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map((s, i) => (
            <SuggestionTile key={`${s.kind}:${s.id ?? i}`} s={s} onOpenPanel={onOpenPanel} onFillTake={fillTake} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionTile({
  s,
  onOpenPanel,
  onFillTake,
}: {
  s: HomeSuggestion;
  onOpenPanel: (t: PanelTarget) => void;
  onFillTake: (label: string) => void;
}) {
  if (s.kind === 'open_day') {
    return (
      <Tile
        picture={
          <span className="flex h-full w-full items-center justify-center bg-je-item">
            <CalendarPlus size={28} strokeWidth={1.7} className="text-je-accent" />
          </span>
        }
        action="Fill today"
        onClick={() => onOpenPanel({ kind: 'calendar' })}
      />
    );
  }
  if (s.kind === 'unclipped_video') {
    return (
      <Tile
        picture={
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-je-item px-3">
            <Clapperboard size={24} strokeWidth={1.7} className="text-je-accent" />
            <span className="line-clamp-1 max-w-full text-[12px] font-bold text-je-muted">{s.label}</span>
          </span>
        }
        action="Clip this video"
        onClick={() => onOpenPanel({ kind: 'clips', id: s.id })}
      />
    );
  }
  return (
    <Tile
      picture={
        <span className="flex h-full w-full flex-col justify-center gap-1 bg-je-item px-3">
          <span className="text-[12px] font-bold text-je-muted">Radar</span>
          <span className="line-clamp-2 text-[13px] font-bold">{s.label}</span>
        </span>
      }
      action="Write my take"
      onClick={() => onFillTake(s.label)}
    />
  );
}
