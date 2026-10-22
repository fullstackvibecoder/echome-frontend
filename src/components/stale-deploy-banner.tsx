'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, X } from 'lucide-react';
import { useDeployVersion } from '@/lib/use-deploy-version';
import { isBusy } from '@/lib/deploy-version';

/**
 * Shown when a newer frontend has shipped since this tab loaded. Offers a
 * refresh, and reloads by itself on the user's next page change. It never
 * reloads out from under someone mid-view, and never while an upload is
 * running. Dismissing hides the banner for this tab but keeps the
 * reload-on-navigation safety net.
 */
export function StaleDeployBanner() {
  const { stale } = useDeployVersion();
  const [dismissed, setDismissed] = useState(false);
  const [waitingOnUpload, setWaitingOnUpload] = useState(false);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const navigated = pathname !== prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (stale && navigated && !isBusy()) window.location.reload();
  }, [pathname, stale]);

  if (!stale || dismissed) return null;

  const refresh = () => {
    if (isBusy()) {
      setWaitingOnUpload(true);
      return;
    }
    window.location.reload();
  };

  return (
    <div
      role="status"
      className="relative z-10 border-b border-primary/20 bg-primary/5 px-6 py-2.5 flex items-center gap-3"
    >
      <RefreshCw className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="flex-1 min-w-0 text-sm font-medium text-foreground">
        {waitingOnUpload
          ? 'Your upload is still running. Refresh once it finishes.'
          : 'EchoMe has been updated. Refresh to get the latest version.'}
      </p>
      <button
        type="button"
        onClick={refresh}
        className="shrink-0 rounded-lg bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Refresh
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
