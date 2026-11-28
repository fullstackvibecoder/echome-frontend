import { Check, CircleAlert } from 'lucide-react';
import { Row } from '@/components/ds/Row';
import { Button } from '@/components/ds/Button';
import type { PanelTarget } from '@/lib/just-echo-client';
import { panelTitle } from '../panel/panel-targets';
import { effectiveConfirmState, type ConfirmState, type ThreadItem } from './thread-model';
import { linkify } from './linkify';

type Of<K extends ThreadItem['kind']> = Extract<ThreadItem, { kind: K }>;

export function UserRow({ item }: { item: Of<'user'> }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[12px] bg-je-item px-3 py-2 text-[14px] font-medium text-je-ink">
        {item.text}
      </div>
    </div>
  );
}

export function EchoRow({ item }: { item: Of<'echo'> }) {
  return (
    <div className="whitespace-pre-wrap break-words text-[14px] font-normal leading-[1.55] text-je-ink">
      {linkify(item.text)}
    </div>
  );
}

export function WorkingRow({ item }: { item: Of<'working'> }) {
  return (
    <Row
      lead={
        <span
          aria-hidden="true"
          className="block h-2 w-2 rounded-full bg-je-muted"
          style={{ animation: 'je-pulse 1.2s ease-in-out infinite' }}
        />
      }
      title={item.label}
    />
  );
}

function capitalise(verb: string): string {
  const v = verb.toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function OpenButton({ panel, onOpenPanel }: { panel: PanelTarget; onOpenPanel: (t: PanelTarget) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenPanel(panel)}
      aria-label={`Open ${panelTitle(panel)}`}
      className="rounded-[8px] px-2 py-1 text-[12px] font-bold text-je-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]"
    >
      Open
    </button>
  );
}

export function ReceiptRow({ item, onOpenPanel }: { item: Of<'receipt'>; onOpenPanel: (t: PanelTarget) => void }) {
  return (
    <Row
      lead={<Check size={16} strokeWidth={1.7} aria-hidden="true" className="text-je-ok" />}
      title={capitalise(item.verb)}
      detail={item.label}
      trail={item.panel ? <OpenButton panel={item.panel} onOpenPanel={onOpenPanel} /> : undefined}
    />
  );
}

const STATUS_LINE: Record<Exclude<ConfirmState, 'pending'>, string> = {
  running: 'Working on it.',
  confirmed: 'Done.',
  cancelled: 'Cancelled.',
  expired: 'Expired. Ask Echo again.',
  failed: 'That did not go through.',
};

export function ConfirmRow({
  item,
  nowSec,
  confirmingId,
  onConfirm,
}: {
  item: Of<'confirm'>;
  nowSec: number;
  confirmingId: string | null;
  onConfirm: (messageId: string, approved: boolean) => void;
}) {
  const state = effectiveConfirmState(item, nowSec);
  const busy = confirmingId === item.messageId;
  return (
    <div className="rounded-[12px] border border-je-hair bg-je-item p-3">
      <p className="whitespace-pre-wrap break-words text-[14px] text-je-ink">{item.preview}</p>
      {state === 'pending' ? (
        <div className="mt-3 flex gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={() => onConfirm(item.messageId, true)}>
            Confirm
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => onConfirm(item.messageId, false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-[12px] font-bold text-je-muted">{STATUS_LINE[state]}</p>
      )}
    </div>
  );
}

export function UpgradeRow({ item }: { item: Of<'upgrade'> }) {
  return (
    <div className="rounded-[12px] border border-je-hair bg-je-item p-3">
      <p className="text-[14px] text-je-ink">{item.message}</p>
      <a href="/app/billing" className="mt-2 inline-block text-[13px] font-bold text-je-accent underline underline-offset-2">
        See plans
      </a>
    </div>
  );
}

export function JobRow({ item, onOpenPanel }: { item: Of<'job'>; onOpenPanel: (t: PanelTarget) => void }) {
  if (item.state === 'failed') {
    return (
      <Row
        lead={<CircleAlert size={16} strokeWidth={1.7} aria-hidden="true" className="text-je-ink-2" />}
        title={`${item.label} did not finish`}
      />
    );
  }
  return (
    <Row
      lead={<Check size={16} strokeWidth={1.7} aria-hidden="true" className="text-je-ok" />}
      title={`${item.label} is ready`}
      trail={item.panel ? <OpenButton panel={item.panel} onOpenPanel={onOpenPanel} /> : undefined}
    />
  );
}

export function ErrorRow({ item }: { item: Of<'error'> }) {
  return (
    <div className="flex items-start gap-2 text-[14px] text-je-ink-2">
      <CircleAlert size={16} strokeWidth={1.7} aria-hidden="true" className="mt-[3px] shrink-0" />
      <span className="whitespace-pre-wrap break-words">{item.message}</span>
    </div>
  );
}
