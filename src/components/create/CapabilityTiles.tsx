'use client';

import { Clapperboard, Images, PenLine, Newspaper } from 'lucide-react';

interface Capability {
  title: string;
  blurb: string;
  prefill: string;
  icon: typeof Clapperboard;
}

export const CAPABILITIES: Capability[] = [
  { title: 'Clips', blurb: 'from a video', prefill: 'Make clips from this video: ', icon: Clapperboard },
  { title: 'Carousel', blurb: 'slides from a topic', prefill: 'Make a carousel about ', icon: Images },
  { title: 'Post', blurb: 'in your voice', prefill: 'Write a post about ', icon: PenLine },
  { title: 'Newsletter', blurb: 'long form', prefill: 'Draft a newsletter about ', icon: Newspaper },
];

interface CapabilityTilesProps {
  onSelect: (prefill: string) => void;
  heading?: string;
}

export function CapabilityTiles({ onSelect, heading = 'What Echo can do' }: CapabilityTilesProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{heading}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <button
              key={cap.title}
              type="button"
              onClick={() => onSelect(cap.prefill)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-white p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">{cap.title}</span>
              <span className="text-xs text-muted-foreground">{cap.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
