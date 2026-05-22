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

  // React hydration errors (#418/#423/#425) on public pages are dominated by
  // two environmental causes, neither of which is an EchoMe code bug:
  //   1. Browser auto-translate rewriting text nodes between SSR delivery and
  //      hydration (React sees translated text, throws a text mismatch).
  //   2. In-app browsers (TikTok, Instagram, Facebook, Chrome WebView, Quark,
  //      Google app) injecting their own DOM before React hydrates.
  // Verified 2026-05-22: the homepage hydrates cleanly in a normal browser
  // locally; the prod error distribution is scattered across every browser
  // family, which is the fingerprint of the environment, not the code.
  //
  // We drop hydration errors ONLY when they come from a known in-app browser.
  // A hydration error from a normal desktop/mobile browser is kept — it would
  // be the tripwire for a genuine hydration regression we DO want to see.
  beforeSend(event) {
    const msg =
      event.exception?.values?.[0]?.value ||
      (typeof event.message === 'string' ? event.message : '') ||
      '';
    const isHydration = /Minified React error #(418|423|425)|Hydration failed|hydrat/i.test(msg);
    if (isHydration && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      // `; wv)` is the Android WebView token; the rest are named in-app browsers.
      const inAppBrowser =
        /;\s*wv\)|FBAN|FBAV|FB_IAB|Instagram|TikTok|BytedanceWebview|musical_ly|Trill|Quark|\bGSA\/|Snapchat|LinkedInApp/i.test(ua);
      if (inAppBrowser) return null;
    }
    return event;
  },
});
