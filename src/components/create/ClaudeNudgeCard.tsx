'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import { FillFromClaude, CLAUDE_FILL_DONE_KEY } from '@/app/app/voice/components/FillFromClaude';

function readDone(): boolean {
  try {
    return Boolean(localStorage.getItem(CLAUDE_FILL_DONE_KEY));
  } catch {
    return false;
  }
}

/**
 * Fill from Claude on the Create page, the one place users feed Echo.
 * Hidden for good once the user adds a profile or skips (per browser), except
 * when the page is opened with ?transfer=claude (the email link): then it
 * shows regardless and scrolls into view.
 */
export function ClaudeNudgeCard() {
  // Server render and first paint stay hidden; storage is read on the client.
  const done = useSyncExternalStore(() => () => {}, readDone, () => true);
  const [closed, setClosed] = useState(false);
  const forced = useSearchParams()?.get('transfer') === 'claude';
  const ref = useRef<HTMLDivElement>(null);
  const visible = !closed && (forced || !done);

  useEffect(() => {
    if (forced && visible) ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [forced, visible]);

  if (!visible) return null;

  const hide = () => {
    try {
      localStorage.setItem(CLAUDE_FILL_DONE_KEY, new Date().toISOString());
    } catch {
      // per-browser convenience only
    }
    setClosed(true);
  };

  return (
    <div ref={ref} className="mt-4 w-full max-w-4xl">
      <FillFromClaude
        knowledgeBaseId={null}
        onAdded={() => {
          window.dispatchEvent(new Event('echo:ingest-complete'));
          setClosed(true);
        }}
        onSkip={hide}
        className="rounded-xl border border-primary/30 bg-primary/5 p-5"
      />
    </div>
  );
}
