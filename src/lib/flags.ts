/**
 * Build-time feature flags. Next.js inlines NEXT_PUBLIC_* at build time, so
 * a flag flip needs a redeploy. Read them through a function (not a
 * module-level constant) so tests can flip process.env between cases.
 */
export const isGmailConnectEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_GMAIL_CONNECT_ENABLED === 'true';
