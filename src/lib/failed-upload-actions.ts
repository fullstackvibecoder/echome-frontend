/**
 * Which actions a failed upload row offers, and the message it shows.
 *
 * Kept pure so the rule is testable. The backend sends a plain-language
 * statusMessage and an errorCode; we never build user copy from raw errors.
 */

export type FailedUploadAction = 'try_again' | 'upload_again' | 'upload_file' | 'enter_passcode';

export const FAILED_UPLOAD_ACTION_LABELS: Record<FailedUploadAction, string> = {
  try_again: 'Try again',
  upload_again: 'Upload again',
  upload_file: 'Upload the file instead',
  enter_passcode: 'Enter passcode',
};

export const FAILED_UPLOAD_FALLBACK_MESSAGE = 'This video did not finish.';

/** Source types that mean the user supplied the file itself, not a link. */
const FILE_SOURCES = new Set(['upload', 'recording']);

export function getFailedUploadActions(input: {
  errorCode?: string | null;
  sourceType?: string | null;
}): FailedUploadAction[] {
  const code = input.errorCode ?? '';

  // The file never fully arrived: retrying cannot help, a fresh upload can.
  if (code === 'upload_incomplete' || code === 'upload_aborted') return ['upload_again'];
  if (code === 'zoom_password_required' || code === 'zoom_password_incorrect') return ['enter_passcode'];
  if (code === 'video_url_invalid') return ['upload_file'];

  const isLink = !!input.sourceType && !FILE_SOURCES.has(input.sourceType);
  if (isLink) return ['try_again', 'upload_file'];

  return ['try_again'];
}

export function getFailedUploadMessage(statusMessage?: string | null): string {
  const trimmed = statusMessage?.trim();
  return trimmed ? trimmed : FAILED_UPLOAD_FALLBACK_MESSAGE;
}
