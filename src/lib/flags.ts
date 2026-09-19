/**
 * Build-time feature flags. Next.js inlines NEXT_PUBLIC_* at build time, so
 * a flag flip needs a redeploy. Read them through a function (not a
 * module-level constant) so tests can flip process.env between cases.
 */
export const isGmailConnectEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED === 'true';

/**
 * Zoom recording import. Every Zoom URL import attempt failed (46/46) in the
 * last 90 days, so the source is hidden across the app until the backend is
 * fixed. Flip NEXT_PUBLIC_ZOOM_IMPORT_ENABLED=true to bring it back.
 */
export const isZoomImportEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ZOOM_IMPORT_ENABLED === 'true';

/** Matches a Zoom recording URL, e.g. https://us06web.zoom.us/rec/share/... */
export const ZOOM_URL_RE = /zoom\.us/i;

/** Shown inline the moment a Zoom link is pasted while the source is hidden. */
export const ZOOM_IMPORT_DISABLED_MESSAGE =
  'Zoom links are not supported right now. Download the recording from Zoom and upload the file instead.';
