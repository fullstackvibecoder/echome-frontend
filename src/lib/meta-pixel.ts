/**
 * Meta Pixel event helpers
 *
 * Fires standard Meta conversion events for ad optimization.
 * All events are no-ops if fbq is not loaded (e.g., ad blockers).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

/** User signed up (free account created) */
export function trackSignup(email?: string) {
  fbq('track', 'Lead', {
    content_name: 'signup',
    ...(email ? { em: email } : {}),
  });
}

/** User used their first free generation */
export function trackStartTrial() {
  fbq('track', 'StartTrial', {
    content_name: 'first_generation',
  });
}

/** User subscribed to a paid plan */
export function trackSubscribe(plan: string, value?: number, currency = 'USD') {
  fbq('track', 'Subscribe', {
    content_name: plan,
    value: value || 0,
    currency,
  });
}

/** User made a payment (subscription or credit purchase) */
export function trackPurchase(value: number, currency = 'USD', contentId?: string) {
  fbq('track', 'Purchase', {
    value,
    currency,
    content_ids: contentId ? [contentId] : undefined,
  });
}

/** User viewed a key page (pricing, features, etc.) */
export function trackViewContent(contentName: string) {
  fbq('track', 'ViewContent', {
    content_name: contentName,
  });
}
