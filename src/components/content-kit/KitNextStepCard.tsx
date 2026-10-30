import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Link2 } from 'lucide-react';
import api from '@/lib/api-client';

export type KitNextStep = 'connect' | 'schedule' | null;

/**
 * Where this user is on the way to a first post (bet 2, 2026-10-27):
 * no account connected -> connect; connected but never scheduled -> schedule;
 * anything scheduled before -> nothing to nudge.
 */
export function nextStepFor(accountCount: number, hasScheduledPost: boolean): KitNextStep {
  if (hasScheduledPost) return null;
  return accountCount === 0 ? 'connect' : 'schedule';
}

/**
 * Loads the user's accounts and whether they have ever scheduled a post.
 * Any failed load hides the card: a nudge on wrong data is worse than none.
 */
export function useKitNextStep(enabled: boolean): KitNextStep {
  const [step, setStep] = useState<KitNextStep>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([api.socialPosting.listAccounts(), api.socialPosting.listPosts({ limit: 1 })])
      .then(([accounts, posts]) => {
        if (cancelled || !accounts.success || !accounts.data || !posts.success || !posts.data) return;
        setStep(nextStepFor(accounts.data.accounts.length, posts.data.posts.length > 0));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? step : null;
}

interface KitNextStepCardProps {
  step: KitNextStep;
  onSchedule: () => void;
}

export function KitNextStepCard({ step, onSchedule }: KitNextStepCardProps) {
  if (!step) return null;

  const connect = step === 'connect';
  const Icon = connect ? Link2 : CalendarPlus;
  const title = connect ? 'Post this kit without copy and paste' : 'Schedule this kit';
  const body = connect
    ? 'Connect Instagram, LinkedIn or Facebook once. After that, every kit schedules in one click.'
    : 'Echo can pick the days and times for the whole kit. You review it before anything posts.';
  const buttonClass =
    'shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700';

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-purple-500" />
        <div>
          <p className="font-medium text-text-primary">{title}</p>
          <p className="text-sm text-text-secondary">{body}</p>
        </div>
      </div>
      {connect ? (
        <Link href="/app/settings?tab=connections" className={buttonClass}>
          Connect an account
        </Link>
      ) : (
        <button type="button" onClick={onSchedule} className={buttonClass}>
          Schedule with Echo
        </button>
      )}
    </div>
  );
}
