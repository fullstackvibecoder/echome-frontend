import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
