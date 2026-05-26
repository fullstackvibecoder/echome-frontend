import SignupContent from './SignupContent';

export const dynamic = 'force-dynamic';

// ECHO-ME-FRONTEND-30: Chrome/Edge Mobile's translate engine mutates the
// DOM (replaces text nodes with translated copies). When React then tries
// to reconcile — typically on Turnstile widget mount or input re-render —
// it can't find the node it expected and throws
// `NotFoundError: insertBefore`. Telling Google not to translate this page
// is the most reliable cross-mobile-browser fix.
export const metadata = {
  other: {
    google: 'notranslate',
  },
};

export default function SignupPage() {
  return <SignupContent />;
}
