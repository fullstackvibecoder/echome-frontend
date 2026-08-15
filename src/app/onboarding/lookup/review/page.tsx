import ReviewContent from './ReviewContent';

export const dynamic = 'force-dynamic';

// ECHO-ME-FRONTEND-30: Chrome/Edge Mobile's translate engine mutates the
// DOM (replaces text nodes with translated copies). When React then tries
// to reconcile — typically on input re-render mid-onboarding — it can't
// find the node it expected and throws `NotFoundError: insertBefore`.
// Telling Google not to translate this page is the most reliable
// cross-mobile-browser fix (same pattern as /auth/signup, f5e2b703).
export const metadata = {
  other: {
    google: 'notranslate',
  },
};

export default function LookupReviewPage() {
  return <ReviewContent />;
}
