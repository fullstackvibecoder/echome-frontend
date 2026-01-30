'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WelcomeBannerProps {
  userName?: string;
  onDismiss: () => void;
  onScrollToForm: () => void;
}

export function WelcomeBanner({ userName, onDismiss, onScrollToForm }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`mb-8 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-display text-4xl">
          Your voice is ready{userName ? `, ${userName}` : ''}
        </h1>
        <button
          onClick={handleDismiss}
          className="text-text-secondary hover:text-text-primary transition-colors p-1 -mt-1"
          aria-label="Dismiss welcome banner"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
      <p className="text-body text-text-secondary mb-6">
        EchoMe has learned your writing style. Try generating your first piece of content below.
      </p>

      {/* Quick Hint Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Generate */}
        <button
          onClick={onScrollToForm}
          className="bg-bg-secondary border border-border rounded-lg p-4 text-left hover:border-accent/50 transition-colors group"
        >
          <div className="text-2xl mb-2">✨</div>
          <h3 className="text-body font-semibold mb-1">Generate</h3>
          <p className="text-small text-text-secondary mb-3">
            Type a topic and generate content in your voice.
          </p>
          <span className="text-small text-accent font-medium group-hover:underline">
            Try it now &rarr;
          </span>
        </button>

        {/* Knowledge Base */}
        <Link
          href="/app/knowledge"
          className="bg-bg-secondary border border-border rounded-lg p-4 text-left hover:border-accent/50 transition-colors group"
        >
          <div className="text-2xl mb-2">📖</div>
          <h3 className="text-body font-semibold mb-1">Knowledge Base</h3>
          <p className="text-small text-text-secondary mb-3">
            Add more samples to improve your voice profile.
          </p>
          <span className="text-small text-accent font-medium group-hover:underline">
            Open KB &rarr;
          </span>
        </Link>

        {/* Content Kit */}
        <Link
          href="/app/content-kit"
          className="bg-bg-secondary border border-border rounded-lg p-4 text-left hover:border-accent/50 transition-colors group"
        >
          <div className="text-2xl mb-2">📂</div>
          <h3 className="text-body font-semibold mb-1">Content Kit</h3>
          <p className="text-small text-text-secondary mb-3">
            All generated content is saved here for easy access.
          </p>
          <span className="text-small text-accent font-medium group-hover:underline">
            View Kit &rarr;
          </span>
        </Link>
      </div>
    </div>
  );
}
