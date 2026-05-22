import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],

  // Drop errors that are NOT our code — they originate from the host
  // environment when a user opens an EchoMe link inside an in-app browser
  // (Facebook / Instagram / Android WebView). The host app injects its own
  // JS bridge + analytics hooks; when the webview lifecycle invalidates that
  // bridge, the injected code throws and our global handler reports it as if
  // it were a page error. Verified 2026-05-22: none of these symbols exist
  // anywhere in our source. They were making /realtors (and /unsubscribe)
  // look broken in Sentry when the pages are actually fine.
  ignoreErrors: [
    // Android WebView bridge destroyed mid-lifecycle.
    /Java object is gone/,
    // iOS WKWebView bridge absent (Meta in-app browser).
    /webkit\.messageHandlers/,
    // Meta in-app-browser analytics hooks — injected by FB/IG, not us.
    "enableDidUserTypeOnKeyboardLogging",
    "enableButtonsClickedMetaDataLogging",
    // Browser-extension noise (email-scanner extensions inject this).
    /Object Not Found Matching Id/,
  ],
});
