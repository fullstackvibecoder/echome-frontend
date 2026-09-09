import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Security headers
//
// Emitted on every response. HSTS is deliberately absent: Vercel already
// sends `strict-transport-security: max-age=63072000; includeSubDomains;
// preload` for this project, and a second copy would trip the ZAP
// "multiple HSTS headers" rule.
//
// The CSP ships as Content-Security-Policy-Report-Only. Browsers report
// violations (to Sentry when NEXT_PUBLIC_SENTRY_DSN is set) but block
// nothing. Once the report stream is clean the header name flips to
// Content-Security-Policy in a follow-up change. ZAP does not credit the
// report-only form, so the flip is what closes finding 10038.
// ---------------------------------------------------------------------------

/** Origin of a URL from the environment, or undefined when unset or invalid. */
function originOf(url: string | undefined): string | undefined {
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
function sentryReportUri(dsn: string | undefined): string | undefined {
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

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL) ?? 'https://api.tryechome.com';
const appOrigin = originOf(process.env.NEXT_PUBLIC_APP_URL) ?? 'https://www.tryechome.com';
const cspReportUri = sentryReportUri(process.env.NEXT_PUBLIC_SENTRY_DSN);

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' covers the Next.js hydration bootstrap and the Meta
  // pixel snippet in app/layout.tsx; nonces would force every page dynamic.
  // No 'unsafe-eval': nothing in the production bundle needs it.
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
    'https://*.supabase.co wss://*.supabase.co', // auth + realtime, prod and staging projects
    'https://*.r2.cloudflarestorage.com', // presigned PUT direct uploads (multipart parts)
    'https://api.giphy.com', // GIF picker
    'https://api.affonso.io', // Affonso beacon
    'https://www.facebook.com https://connect.facebook.net', // Meta pixel
  ].join(' '),
  "frame-src 'self' https://challenges.cloudflare.com https://www.loom.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
  ...(cspReportUri ? [`report-uri ${cspReportUri}`] : []),
];

const securityHeaders = [
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives.join('; ') },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  // Vercel emits `access-control-allow-origin: *` on every response for this
  // project (ZAP 10098). Pin it to our own origin so other sites cannot read
  // our pages or JSON. Nothing loads our assets cross-origin, so this is safe.
  { key: 'Access-Control-Allow-Origin', value: appOrigin },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bbsrpkjwuujuszjqwnul.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Permanent redirects from the pre-swap URL scheme:
  //   /app/content-kit       → /app/library       (user's generated content)
  //   /app/content-kit/:id   → /app/library/:id   (kit detail)
  // Audit §5.2: the old /app/library was the curated stock toolkit; users
  // looking for "their library" found stock assets. Swapping aligns the
  // mental model. /app/toolkit is the new home for the curated content.
  async redirects() {
    return [
      { source: '/app/content-kit', destination: '/app/library', permanent: true },
      { source: '/app/content-kit/:id', destination: '/app/library/:id', permanent: true },
      // /app/reels list folded into /app/library as the Reels tab (Tier 3 Phase 2).
      // The editor at /app/reels/:id stays put — different concern, deeper route.
      { source: '/app/reels', destination: '/app/library?tab=reels', permanent: true },
      // Tier 3 Phase 3: /knowledge → /voice (route name now matches the H1
      // we shipped yesterday) and /team-voices → /voice?tab=team (folded
      // into the unified Voice page as a Teams-tier tab).
      { source: '/app/knowledge', destination: '/app/voice', permanent: true },
      { source: '/app/team-voices', destination: '/app/voice?tab=team', permanent: true },
      // Audit §5.1: in-app route name now matches the marketing/sidebar
      // name. "Following" framed the feature as a passive social-network
      // verb; "Radar" matches the active industrial-repurposing positioning
      // already shipped on the homepage Creator Radar section.
      { source: '/app/following', destination: '/app/radar', permanent: true },
      // Audit §5.4: the legacy 750-line /onboarding wizard is retired.
      // Signups land at /onboarding/lookup (WBTW); existing users add
      // sources via /app/voice. Re-onboarding flows from /app/billing
      // also redirect to /app/voice. Deeper /onboarding/* paths
      // (e.g., /onboarding/lookup) are NOT caught — only the bare
      // /onboarding route.
      { source: '/onboarding', destination: '/app/voice', permanent: true },
      // /app/integrations was a "Coming Soon" stub — the real connections
      // UI lives in Settings. Redirect so existing bookmarks resolve.
      { source: '/app/integrations', destination: '/app/settings#connections', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Upload source maps for better stack traces in Sentry
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Route browser requests to Sentry through a Next.js rewrite to avoid ad-blockers
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Only upload source maps in CI (requires SENTRY_AUTH_TOKEN)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
