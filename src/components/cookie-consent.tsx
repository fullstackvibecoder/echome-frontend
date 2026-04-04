'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[998] bg-card/95 backdrop-blur-xl border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          We use cookies to manage sessions and improve your experience.
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/privacy#cookies"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Learn More
          </Link>
          <button
            onClick={handleAccept}
            className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
