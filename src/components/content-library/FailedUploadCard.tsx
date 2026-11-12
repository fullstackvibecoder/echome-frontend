'use client';

/**
 * FailedUploadCard
 *
 * A library row for an upload that did not finish. Shows the backend's plain
 * message and only the actions that can actually help (see
 * getFailedUploadActions). "Try again" re-runs the same row, no new upload.
 */

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { NormalizedContent } from '@/lib/content-normalizer';
import type { VideoUpload } from '@/lib/api-client';
import {
  FAILED_UPLOAD_ACTION_LABELS,
  getFailedUploadActions,
  getFailedUploadMessage,
} from '@/lib/failed-upload-actions';

interface FailedUploadCardProps {
  item: NormalizedContent;
  /** Re-run the upload. Rejects with a user-ready message. */
  onRetry: (id: string) => Promise<void>;
  /** Open the passcode prompt for this upload. */
  onPasscode: (item: NormalizedContent) => void;
  onDelete?: (item: NormalizedContent) => void;
}

const BTN = 'text-[12px] font-medium text-accent hover:underline disabled:opacity-50';

export function FailedUploadCard({ item, onRetry, onPasscode, onDelete }: FailedUploadCardProps) {
  const upload = item.raw as VideoUpload;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = getFailedUploadActions({ errorCode: upload.errorCode, sourceType: upload.sourceType });

  const handleRetry = async () => {
    setBusy(true);
    setError(null);
    try {
      await onRetry(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not restart this video. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="group relative rounded-lg border border-destructive/30 bg-card px-3 py-3" data-testid="failed-upload-card">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">{item.title}</h3>
          <p className="mt-1 text-[11px] text-destructive">{getFailedUploadMessage(upload.statusMessage)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {actions.map((action) => {
          const label = FAILED_UPLOAD_ACTION_LABELS[action];
          if (action === 'upload_again' || action === 'upload_file') {
            return (
              <Link key={action} href="/app" className={BTN}>
                {label}
              </Link>
            );
          }
          if (action === 'enter_passcode') {
            return (
              <button key={action} type="button" className={BTN} onClick={() => onPasscode(item)}>
                {label}
              </button>
            );
          }
          return (
            <button key={action} type="button" className={BTN} onClick={handleRetry} disabled={busy}>
              {busy ? <Loader2 className="inline w-3 h-3 animate-spin" aria-label="Restarting" /> : label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-destructive">
          {error}
        </p>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          title="Delete"
          className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default FailedUploadCard;
