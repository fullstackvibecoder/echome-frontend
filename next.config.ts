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
