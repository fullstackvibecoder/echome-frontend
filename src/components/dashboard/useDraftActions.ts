'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DraftProposal } from '@/types';
import { api } from '@/lib/api-client';
import { showInfoToast } from '@/lib/toast';

// Telemetry races against this timeout. If the API hangs we give up after 2s
// and navigate anyway — never block the user on a side-effect call.
const TELEMETRY_TIMEOUT_MS = 2000;

type TelemetryResult = 'ok' | 'gone' | 'error' | 'timeout';

// A 404 from the action endpoint means the kit is no longer a draft proposal
// (dismissed in another tab, auto-cleaned by cron). Navigating there would
// land the user on a stale/empty kit-detail page; acknowledge and remove instead.
// Promise.resolve(p) guards against non-thenable values (e.g. mocked API in tests).
async function recordWithTimeout(p: unknown): Promise<TelemetryResult> {
  return Promise.race<TelemetryResult>([
    Promise.resolve(p)
      .then<TelemetryResult>(() => 'ok')
      .catch((err): TelemetryResult => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        return status === 404 ? 'gone' : 'error';
      }),
    new Promise<TelemetryResult>((resolve) =>
      setTimeout(() => resolve('timeout'), TELEMETRY_TIMEOUT_MS),
    ),
  ]);
}

interface UseDraftActionsArgs {
  draft: DraftProposal;
  onDismissed: (id: string) => void;
  onActionRecorded?: (id: string, action: 'reviewed' | 'scheduled') => void;
}

export interface DraftActions {
  review: () => Promise<void>;
  schedule: () => Promise<void>;
  dismiss: () => Promise<void>;
  busy: 'none' | 'dismissing';
  dismissError: string | null;
  href: string;
}

export function useDraftActions({ draft, onDismissed, onActionRecorded }: UseDraftActionsArgs): DraftActions {
  const router = useRouter();
  const [busy, setBusy] = useState<'none' | 'dismissing'>('none');
  const [dismissError, setDismissError] = useState<string | null>(null);
  const href = `/app/library/${draft.id}`;

  async function navigateAfter(action: 'reviewed' | 'scheduled') {
    onActionRecorded?.(draft.id, action);
    const result = await recordWithTimeout(api.drafts.recordAction(draft.id, action));
    if (result === 'gone') {
      showInfoToast('That draft was already removed', 'Refreshing your inbox.');
      onDismissed(draft.id);
      return;
    }
    router.push(href);
  }

  return {
    review: () => navigateAfter('reviewed'),
    schedule: () => navigateAfter('scheduled'),
    dismiss: async () => {
      if (busy !== 'none') return;
      setBusy('dismissing');
      setDismissError(null);
      try {
        await api.drafts.dismiss(draft.id);
        onDismissed(draft.id);
      } catch {
        // 401/402/403 are toasted by api-client interceptors; surface the rest inline.
        setBusy('none');
        setDismissError("Couldn't dismiss. Try again.");
      }
    },
    busy,
    dismissError,
    href,
  };
}
