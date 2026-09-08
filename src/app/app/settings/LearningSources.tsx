'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { isGmailConnectEnabled } from '@/lib/flags';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import type { GmailActiveJob, SocialIntegration } from '@/types';

const POLL_MS = 3000;

type GmailView =
  | { kind: 'loading' }
  | { kind: 'not_connected' }
  | { kind: 'needs_reconnect' }
  | { kind: 'syncing'; job: GmailActiveJob; itemCount: number }
  | { kind: 'connected'; itemCount: number; syncMode: 'snapshot' | 'incremental' | null; lastSyncAt: string | null };

function toView(entry: SocialIntegration | undefined): GmailView {
  if (!entry) return { kind: 'not_connected' };
  if (entry.status === 'expired' || entry.status === 'error') return { kind: 'needs_reconnect' };
  if (entry.status === 'disconnected' || entry.status === 'inactive') return { kind: 'not_connected' };
  const itemCount = entry.itemCount ?? 0;
  if (entry.activeJob && (entry.activeJob.status === 'pending' || entry.activeJob.status === 'processing')) {
    return { kind: 'syncing', job: entry.activeJob, itemCount };
  }
  return {
    kind: 'connected',
    itemCount,
    syncMode: entry.syncMode ?? null,
    lastSyncAt: entry.lastSyncAt ?? null,
  };
}

/**
 * "Sources Echo learns from" card. Today the only source is Gmail; the card
 * is shaped as a list so a second source (calendar, notes) slots in later.
 *
 * Disconnect is destructive on the backend (it purges every chunk and
 * vector learned from Gmail), so it always goes through ConfirmDialog with
 * the spec's warning copy.
 */
export default function LearningSources() {
  const router = useRouter();
  const search = useSearchParams();
  const { isFreeUser } = useSubscription();
  const enabled = isGmailConnectEnabled();

  const [view, setView] = useState<GmailView>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.social.getStatus();
      const entry = res.success && Array.isArray(res.data)
        ? res.data.find((i) => i.platform === 'gmail')
        : undefined;
      setView(toView(entry));
    } catch (err) {
      showErrorToast(err, 'loading learning sources');
      setView({ kind: 'not_connected' });
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await api.social.getGmailSyncStatus(jobId);
          if (!res.success) return;
          const job = res.data;
          if (job.status === 'completed' || job.status === 'failed') {
            stopPolling();
            if (job.status === 'failed') {
              showErrorToast(new Error('Gmail sync failed'), 'syncing Gmail');
            }
            await refresh();
          } else {
            setView((prev) =>
              prev.kind === 'syncing' || prev.kind === 'connected'
                ? { kind: 'syncing', job, itemCount: prev.itemCount }
                : prev,
            );
          }
        } catch {
          // transient; keep polling
        }
      }, POLL_MS);
    },
    [refresh, stopPolling],
  );

  // Initial load + landing toast
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const outcome = search.get('gmail');
    if (outcome === 'connected') {
      showSuccessToast('Gmail connected. Echo is reading your sent mail.');
      router.replace('/app/settings?tab=connections');
    } else if (outcome === 'error') {
      showErrorToast(new Error('Gmail connection failed'), 'connecting Gmail');
      router.replace('/app/settings?tab=connections');
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // If the status load reports an active job, poll it.
  useEffect(() => {
    if (view.kind === 'syncing' && !pollRef.current) {
      pollJob(view.job.id);
    }
  }, [view, pollJob]);

  if (!enabled) return null;

  const startConnect = async () => {
    setBusy(true);
    try {
      const res = await api.social.connectGmail('settings');
      if (!res.success || !res.data?.authUrl) throw new Error('No auth url returned');
      window.location.assign(res.data.authUrl);
    } catch (err) {
      showErrorToast(err, 'connecting Gmail');
      setBusy(false);
    }
  };

  const startSync = async () => {
    setBusy(true);
    try {
      const res = await api.social.syncGmail();
      if (!res.success) throw new Error('Sync did not start');
      setView((prev) => ({
        kind: 'syncing',
        job: { id: res.data.jobId, status: 'pending', scanned: 0, kept: 0 },
        itemCount: prev.kind === 'connected' || prev.kind === 'syncing' ? prev.itemCount : 0,
      }));
      pollJob(res.data.jobId);
    } catch (err) {
      showErrorToast(err, 'syncing Gmail');
    } finally {
      setBusy(false);
    }
  };

  const confirmDisconnect = async () => {
    setConfirmOpen(false);
    setBusy(true);
    try {
      stopPolling();
      await api.social.disconnect('gmail');
      showSuccessToast('Gmail disconnected', 'Everything Echo learned from it has been removed.');
      await refresh();
    } catch (err) {
      showErrorToast(err, 'disconnecting Gmail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 rounded-lg border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold">Sources Echo learns from</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Echo reads your own words from these sources to match how you write.
      </p>

      <div className="flex items-start justify-between gap-4 rounded-md border p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted p-2">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-medium">Gmail</div>
            <GmailStatusLine view={view} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {view.kind === 'not_connected' && (
            <button
              type="button"
              onClick={startConnect}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Connect Gmail
            </button>
          )}
          {view.kind === 'needs_reconnect' && (
            <button
              type="button"
              onClick={startConnect}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Reconnect
            </button>
          )}
          {view.kind === 'connected' && !isFreeUser && (
            <button
              type="button"
              onClick={startSync}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Sync now
            </button>
          )}
          {(view.kind === 'connected' || view.kind === 'syncing' || view.kind === 'needs_reconnect') && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              className="inline-flex items-center rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Disconnect Gmail"
        message="This removes everything Echo learned from your Gmail. This cannot be undone."
        confirmLabel="Disconnect Gmail"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={confirmDisconnect}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}

function GmailStatusLine({ view }: { view: GmailView }) {
  switch (view.kind) {
    case 'loading':
      return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          Checking
        </div>
      );
    case 'not_connected':
      return <div className="text-sm text-muted-foreground">Not connected</div>;
    case 'needs_reconnect':
      return <div className="text-sm text-amber-600">Needs reconnect</div>;
    case 'syncing':
      return (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          Syncing, {view.job.scanned} scanned, {view.job.kept} kept
        </div>
      );
    case 'connected':
      return (
        <div className="text-sm text-muted-foreground">
          <span>{view.itemCount} emails</span>
          <span aria-hidden="true"> · </span>
          <span>{view.syncMode === 'incremental' ? 'Weekly sync' : 'One-time snapshot, upgrade for weekly sync'}</span>
        </div>
      );
  }
}
