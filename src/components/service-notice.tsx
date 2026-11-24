'use client';

import { useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

/**
 * Temporary in-app notice for a known, partial service problem (not a full
 * outage; that is OutageBanner). Shown on /app pages only, dismissible for the
 * browser session.
 *
 * To show one, set SERVICE_NOTICE to { id, message } (use a new id so past
 * dismissals don't hide it). Set it back to null to turn it off.
 * History: 2026-11-24 long-YouTube notice (AWS suspension), removed same day.
 */
export type ServiceNoticeConfig = { id: string; message: string };
// `as` keeps the declared type wide, so the component still type-checks while
// no notice is active.
export const SERVICE_NOTICE = null as ServiceNoticeConfig | null;

const DISMISS_KEY = 'serviceNoticeDismissed';

// sessionStorage has no change events within a tab; the local `closed` state
// covers the click, this read covers reloads. Server snapshot = hidden, so the
// notice never renders in SSR HTML and hydration matches.
const noSubscribe = () => () => {};
const readDismissed = () => sessionStorage.getItem(DISMISS_KEY) === SERVICE_NOTICE?.id;
const serverDismissed = () => true;

export function ServiceNotice() {
  const pathname = usePathname();
  const storedDismissed = useSyncExternalStore(noSubscribe, readDismissed, serverDismissed);
  const [closed, setClosed] = useState(false);

  if (!SERVICE_NOTICE || storedDismissed || closed || !pathname?.startsWith('/app')) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, SERVICE_NOTICE.id);
    setClosed(true);
  };

  return (
    <div
      role="status"
      className="relative w-full bg-amber-100 px-10 py-2.5 text-center text-sm font-medium text-amber-950"
    >
      {SERVICE_NOTICE.message}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-amber-200"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
