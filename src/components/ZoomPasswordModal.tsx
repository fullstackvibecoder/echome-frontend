'use client';

/**
 * ZoomPasswordModal
 *
 * Pops when a Zoom recording download fails with errorCode
 * 'zoom_password_required' or 'zoom_password_incorrect'. Lets the user supply
 * the meeting passcode and retries the same upload — no new generation, the
 * existing video_uploads row is reused.
 */

import { useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, X } from 'lucide-react';

interface ZoomPasswordModalProps {
  open: boolean;
  /** True when the previous attempt already supplied a passcode that yt-dlp rejected. */
  isRetryAfterIncorrect?: boolean;
  /** Called when the user submits a passcode. Should resolve once the retry has been kicked off. */
  onSubmit: (password: string) => Promise<void>;
  /** Called when the user cancels. */
  onCancel: () => void;
}

export function ZoomPasswordModal({
  open,
  isRetryAfterIncorrect = false,
  onSubmit,
  onCancel,
}: ZoomPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the modal opens fresh, and focus the input.
  useEffect(() => {
    if (!open) return;
    setPassword('');
    setLocalError(null);
    setSubmitting(false);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setLocalError('Enter the meeting passcode to continue.');
      return;
    }
    setSubmitting(true);
    setLocalError(null);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setSubmitting(false);
      setLocalError(err instanceof Error ? err.message : 'Could not submit passcode. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-white/10 p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label="Cancel"
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-cyan-400" />
          </div>
        </div>

        <h2 className="text-center text-xl font-bold text-white mb-2">
          {isRetryAfterIncorrect ? 'Passcode didn\u2019t work' : 'Enter Zoom passcode'}
        </h2>
        <p className="text-center text-sm text-gray-400 mb-6">
          {isRetryAfterIncorrect
            ? 'Double-check the passcode from the Zoom recording email and try again.'
            : 'This Zoom recording is password-protected. Paste the passcode from the recording invite to keep going.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="zoom-password" className="block text-sm font-medium text-gray-300 mb-2">
              Meeting passcode
            </label>
            <input
              ref={inputRef}
              id="zoom-password"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(null); }}
              disabled={submitting}
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-white placeholder:text-gray-500 focus:border-accent focus:outline-none disabled:opacity-50"
              placeholder="e.g. 8a3K9!"
            />
            {localError && (
              <p className="mt-2 text-sm text-red-400">{localError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="flex-1 px-4 py-3 rounded-lg bg-accent text-black font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Retry download'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
