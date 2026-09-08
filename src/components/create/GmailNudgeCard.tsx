'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { isGmailConnectEnabled } from '@/lib/flags';
import { showErrorToast } from '@/lib/toast';
import { AdvisorNudgeCard } from './AdvisorNudgeCard';
import type { Nudge, NudgeAction } from '@/types/advisor';

const GMAIL_NUDGE: Nudge = {
  headline: 'Connect Gmail so Echo learns how you actually write.',
  subhead: 'It reads sent mail only. Nothing is kept except your own words. Disconnect any time.',
  actions: [
    { label: 'Connect Gmail', type: 'connect_gmail' },
    { label: 'Skip for now', type: 'dismiss_gmail' },
  ],
};

/**
 * Self-contained Gmail nudge for the Create page.
 *
 * Eligibility lives on the backend (account age, not connected, not
 * dismissed), so this component only asks /social/status and renders the
 * shared AdvisorNudgeCard when told yes. Any failure renders nothing: a
 * nudge that cannot be checked should not shout.
 */
export function GmailNudgeCard() {
  const enabled = isGmailConnectEnabled();
  const [eligible, setEligible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.social.getStatus();
        if (!cancelled) setEligible(Boolean(res.success && res.nudgeEligible));
      } catch {
        if (!cancelled) setEligible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || !eligible) return null;

  const handleAction = async (action: NudgeAction) => {
    if (busy) return;
    if (action.type === 'connect_gmail') {
      setBusy(true);
      try {
        const res = await api.social.connectGmail('create');
        if (!res.success || !res.data?.authUrl) throw new Error('No auth url returned');
        window.location.assign(res.data.authUrl);
      } catch (err) {
        showErrorToast(err, 'connecting Gmail');
        setBusy(false);
      }
      return;
    }
    if (action.type === 'dismiss_gmail') {
      // Hide immediately; the backend dismissal is best-effort. If it fails
      // the nudge simply returns next visit.
      setEligible(false);
      try {
        await api.social.dismissGmailNudge();
      } catch {
        // swallowed on purpose
      }
    }
  };

  return (
    <div className="mt-4 w-full max-w-4xl">
      <AdvisorNudgeCard nudge={GMAIL_NUDGE} onAction={handleAction} />
    </div>
  );
}
