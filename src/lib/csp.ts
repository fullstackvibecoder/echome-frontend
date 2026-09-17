/**
 * Content-Security-Policy directive builder.
 *
 * Pulled out of next.config.ts so the origin-derivation logic (the part
 * that actually goes wrong when a backend's host changes) is unit
 * testable without booting Next's config loader.
 */

/** Origin of a URL, or undefined when the input is unset or invalid. */
export function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * Sentry accepts CSP violation reports at a security endpoint derived from
 * the DSN: https://<key>@<host>/<project> becomes
 * https://<host>/api/<project>/security/?sentry_key=<key>.
 * The key is the public DSN key that already ships in the client bundle.
 */
export function sentryReportUri(dsn: string | undefined): string | undefined {
  if (!dsn) return undefined;
  try {
    const u = new URL(dsn);
    const project = u.pathname.replace(/^\/+/, '');
    if (!u.username || !project) return undefined;
    return `${u.protocol}//${u.host}/api/${project}/security/?sentry_key=${u.username}`;
  } catch {
    return undefined;
  }
}

/** Parse a comma-separated list of URLs into their distinct valid origins. */
export function extraOriginsFrom(list: string | undefined): string[] {
  return (list ?? '')
    .split(',')
    .map((s) => originOf(s.trim()))
    .filter((s): s is string => Boolean(s));
}

export interface CspEnv {
  [key: string]: string | undefined;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SENTRY_DSN?: string;
  /**
   * Comma-separated list of additional backend origins to allow in
   * connect-src, beyond the main API (NEXT_PUBLIC_API_URL).
   *
   * Why this exists (ECHO-ME-FRONTEND-3V / -3Z, first seen 2026-09-11):
   * the video-compress and transcribe tools get their result/status URLs
   * from the backend at request time, and those have pointed at raw
   * per-deploy compute hostnames (a Cloud Run revision URL, then an
   * ECS/Fargate task URL) rather than the stable API origin. Those
   * hostnames change on every backend redeploy, so hard-coding one here
   * (as a literal host or a provider-wide wildcard like
   * https://*.a.run.app / https://*.on.aws, which would also allow any
   * other tenant's Cloud Run/ECS app) is not a real fix — the next
   * redeploy breaks again, or the wildcard over-allows. The durable fix is
   * on the backend: put the media-processing service behind a stable
   * custom domain and hand the browser links on that domain. Until that
   * lands, ops can pin the current stable origin(s) here without a code
   * change.
   */
  NEXT_PUBLIC_CSP_EXTRA_CONNECT_ORIGINS?: string;
}

export interface CspResult {
  directives: string[];
  apiOrigin: string;
  appOrigin: string;
  extraConnectOrigins: string[];
}

const DEFAULT_API_ORIGIN = 'https://api.tryechome.com';
const DEFAULT_APP_ORIGIN = 'https://www.tryechome.com';

/** Build the CSP directive list from environment values. */
export function buildCspDirectives(env: CspEnv): CspResult {
  const apiOrigin = originOf(env.NEXT_PUBLIC_API_URL) ?? DEFAULT_API_ORIGIN;
  const appOrigin = originOf(env.NEXT_PUBLIC_APP_URL) ?? DEFAULT_APP_ORIGIN;
  const cspReportUri = sentryReportUri(env.NEXT_PUBLIC_SENTRY_DSN);
  const extraConnectOrigins = extraOriginsFrom(env.NEXT_PUBLIC_CSP_EXTRA_CONNECT_ORIGINS);

  const directives = [
    "default-src 'self'",
    // 'unsafe-inline' covers the Next.js hydration bootstrap and the Meta
    // pixel snippet in app/layout.tsx; nonces would force every page dynamic.
    // No 'unsafe-eval': deliberately not added despite ECHO-ME-FRONTEND-3Y
    // (49 users / 138 events, first seen 2026-09-11). Fetched and inspected
    // every third-party script this page loads (Turnstile's api.js, Meta's
    // fbevents.js, Affonso's pixel.min.js + psl.min.js, @vercel/analytics'
    // script.debug.js) — none contain eval( or `new Function`. Source is
    // unidentified; could be a browser extension injecting eval (not ours
    // to fix) or something env/session-specific Sentry's report doesn't
    // capture enough of. Do not add 'unsafe-eval' globally on an
    // unconfirmed source.
    [
      "script-src 'self' 'unsafe-inline'",
      'https://challenges.cloudflare.com', // Turnstile widget on signup
      'https://connect.facebook.net', // Meta pixel
      'https://cdn.affonso.io', // Affonso affiliate pixel
      'https://va.vercel-scripts.com', // @vercel/analytics debug script (dev only)
    ].join(' '),
    "style-src 'self' 'unsafe-inline'",
    // Avatars, social previews, R2 and Supabase public assets, Loom thumbnails.
    "img-src 'self' data: blob: https:",
    // Local File previews, R2 public bucket, Giphy.
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      apiOrigin,
      ...extraConnectOrigins, // media-processing backend(s); see CspEnv doc above
      'https://*.supabase.co wss://*.supabase.co', // auth + realtime, prod and staging projects
      'https://*.r2.cloudflarestorage.com', // presigned PUT direct uploads (multipart parts)
      'https://api.giphy.com', // GIF picker
      'https://api.affonso.io', // Affonso beacon
      'https://www.facebook.com https://connect.facebook.net', // Meta pixel
    ].join(' '),
    // www.facebook.com: fbevents.js (Meta pixel, loaded in app/layout.tsx)
    // opens a hidden iframe and posts a fallback-tracking form to
    // facebook.com itself in browsers that block its normal beacon
    // (ECHO-ME-FRONTEND-41/-42). This is Meta's own pixel doing its own
    // tracking, not a login/share widget we added.
    "frame-src 'self' https://challenges.cloudflare.com https://www.loom.com https://www.facebook.com",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://www.facebook.com",
    "object-src 'none'",
    'upgrade-insecure-requests',
    ...(cspReportUri ? [`report-uri ${cspReportUri}`] : []),
  ];

  return { directives, apiOrigin, appOrigin, extraConnectOrigins };
}
