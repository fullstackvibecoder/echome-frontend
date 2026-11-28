'use client';

import { useLayoutEffect, useRef } from 'react';
import type { PanelTarget } from '@/lib/just-echo-client';
import type { ThreadItem } from './thread-model';
import { ConfirmRow, EchoRow, ErrorRow, JobRow, ReceiptRow, UpgradeRow, UserRow, WorkingRow } from './rows';

const STICK_PX = 80;

// Read at render so an expiry that passed while the tab sat idle shows as expired.
function currentSec(): number {
  return Math.floor(Date.now() / 1000);
}

export type ThreadProps = {
  items: ThreadItem[];
  onOpenPanel: (t: PanelTarget) => void;
  onConfirm: (messageId: string, approved: boolean) => void;
  confirmingId: string | null;
};

export function Thread({ items, onOpenPanel, onConfirm, confirmingId }: ThreadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prevLen = useRef(0);
  const nowSec = currentSec();

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_PX;
  }

  useLayoutEffect(() => {
    const el = ref.current;
    const grew = items.length > prevLen.current;
    const first = prevLen.current === 0;
    prevLen.current = items.length;
    if (el && grew && (first || nearBottom.current)) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-label="Conversation with Echo"
      onScroll={onScroll}
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-4"
    >
      {items.map((item) => {
        switch (item.kind) {
          case 'user':
            return <UserRow key={item.key} item={item} />;
          case 'echo':
            return <EchoRow key={item.key} item={item} />;
          case 'working':
            return <WorkingRow key={item.key} item={item} />;
          case 'receipt':
            return <ReceiptRow key={item.key} item={item} onOpenPanel={onOpenPanel} />;
          case 'confirm':
            return <ConfirmRow key={item.key} item={item} nowSec={nowSec} confirmingId={confirmingId} onConfirm={onConfirm} />;
          case 'upgrade':
            return <UpgradeRow key={item.key} item={item} />;
          case 'job':
            return <JobRow key={item.key} item={item} onOpenPanel={onOpenPanel} />;
          case 'error':
            return <ErrorRow key={item.key} item={item} />;
        }
      })}
    </div>
  );
}
