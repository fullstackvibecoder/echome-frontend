'use client';

/**
 * GetStartedChecklist
 *
 * Top-of-dashboard 4-item activation card. Renders on /app for any user
 * who has NOT seen tour id "get-started-checklist-v1" AND has at least
 * one incomplete item. Auto-marks-seen on full completion; manual Dismiss
 * also marks seen.
 *
 * Note: the teleprompter item (recordedTeleprompter) may never auto-flip
 * to true (the KB-source detection currently returns false until the
 * knowledge_base_entries table exists). Users who want to clear the
 * card before all 4 items complete can use Dismiss.
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §6.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useTourState } from '@/hooks/useTourState';

const TOUR_ID = 'get-started-checklist-v1';

interface Progress {
  generatedFirstKit: boolean;
  connectedSocial: boolean;
  scheduledFirstPost: boolean;
  recordedTeleprompter: boolean;
}

interface Item {
  key: keyof Progress;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  blockedBy?: Array<keyof Progress>;
  blockedLabel?: string;
}

const ITEMS: Item[] = [
  {
    key: 'generatedFirstKit',
    title: 'Generate your first content kit',
    cta: { label: 'Create →', href: '/app/create' },
  },
  {
    key: 'connectedSocial',
    title: 'Connect a social account',
    description: 'Instagram, LinkedIn, Facebook, or Threads',
    cta: { label: 'Connect →', href: '/app/settings?tab=connections' },
  },
  {
    key: 'scheduledFirstPost',
    title: 'Schedule your first post',
    cta: { label: 'Schedule →', href: '/app/library' },
    blockedBy: ['generatedFirstKit', 'connectedSocial'],
    blockedLabel: 'Locked until you connect a social account',
  },
  {
    key: 'recordedTeleprompter',
    title: 'Record yourself on the teleprompter',
    description: "Open any kit's Video Script tab",
  },
];

export function GetStartedChecklist() {
  const { hasSeen, markSeen } = useTourState();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (hasSeen(TOUR_ID)) return;
    api.me.getSetupProgress()
      .then((r) => { if (r.success && r.data) setProgress(r.data); })
      .catch(() => { /* silent — dashboard renders without the card */ });
  }, [hasSeen]);

  // Auto-mark-seen when all 4 complete
  useEffect(() => {
    if (!progress) return;
    const allDone = Object.values(progress).every(Boolean);
    if (allDone && !hasSeen(TOUR_ID)) {
      void markSeen(TOUR_ID);
    }
  }, [progress, hasSeen, markSeen]);

  if (hasSeen(TOUR_ID) || dismissed || !progress) return null;
  const allDone = Object.values(progress).every(Boolean);
  if (allDone) return null;

  const completedCount = Object.values(progress).filter(Boolean).length;
  const progressPct = Math.round((completedCount / ITEMS.length) * 100);

  function handleDismiss() {
    setDismissed(true);
    void markSeen(TOUR_ID);
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Get the most out of EchoMe</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {ITEMS.length} steps · about 5 minutes
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-muted h-[3px] rounded-full overflow-hidden mb-3">
        <div className="bg-accent h-full transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const done = progress[item.key];
          const blocked = !done && (item.blockedBy?.some((k) => !progress[k]) ?? false);
          const nextItemIdx = ITEMS.findIndex((i) => !progress[i.key] && !(i.blockedBy?.some((k) => !progress[k])));
          const isNext = !done && !blocked && nextItemIdx === ITEMS.indexOf(item);

          return (
            <div
              key={item.key}
              className={`flex items-center justify-between px-2 py-2 rounded-md ${
                isNext ? 'bg-muted/40 border-l-2 border-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    done
                      ? 'bg-accent text-accent-foreground'
                      : 'border-[1.5px] border-border'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : ''}
                </div>
                <div>
                  <div
                    className={`text-[13px] ${
                      done ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                  )}
                </div>
              </div>

              {!done && blocked && (
                <div className="text-[11px] text-muted-foreground italic">{item.blockedLabel}</div>
              )}
              {!done && !blocked && item.cta && (
                <Link
                  href={item.cta.href}
                  className="bg-accent text-accent-foreground px-3 py-1 rounded-md text-[11px] font-semibold"
                >
                  {item.cta.label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
