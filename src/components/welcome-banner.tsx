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
      <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-card border border-outline-variant/40 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-10">
        {/* Ambient glow elements */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/[0.03] blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary/[0.03] blur-[100px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between mb-1">
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready to go{userName ? `, ${userName}` : ''}
          </h1>
          <button
            onClick={handleDismiss}
            className="rounded-full text-text-secondary hover:text-text-primary transition-colors p-2 -mt-1 hover:bg-surface-container-low"
            aria-label="Dismiss welcome banner"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <p className="relative text-lg text-slate-lavender font-medium mb-6">
          The system has your context. Generate something and see how it sounds.
        </p>

        {/* Quick Hint Cards */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
          {/* Generate */}
          <button
            onClick={onScrollToForm}
            className="rounded-[1.5rem] bg-white dark:bg-card border border-outline-variant/40 hover:border-primary/30 hover:shadow-lg transition-all p-6 text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary transition-colors mb-3">
              <span className="text-2xl group-hover:brightness-0 group-hover:invert transition-all">✨</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-1">Generate</h3>
            <p className="text-sm text-slate-lavender mb-3">
              Pick a topic. The system writes it in your voice.
            </p>
            <span className="text-sm text-primary font-medium group-hover:underline">
              Try it now &rarr;
            </span>
          </button>

          {/* Knowledge Base */}
          <Link
            href="/app/voice"
            className="rounded-[1.5rem] bg-white dark:bg-card border border-outline-variant/40 hover:border-primary/30 hover:shadow-lg transition-all p-6 text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary transition-colors mb-3">
              <span className="text-2xl group-hover:brightness-0 group-hover:invert transition-all">📖</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-1">Knowledge Base</h3>
            <p className="text-sm text-slate-lavender mb-3">
              More context means better output. Add more of your work.
            </p>
            <span className="text-sm text-primary font-medium group-hover:underline">
              Open KB &rarr;
            </span>
          </Link>

          {/* Content Kit */}
          <Link
            href="/app/library"
            className="rounded-[1.5rem] bg-white dark:bg-card border border-outline-variant/40 hover:border-primary/30 hover:shadow-lg transition-all p-6 text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary transition-colors mb-3">
              <span className="text-2xl group-hover:brightness-0 group-hover:invert transition-all">📂</span>
            </div>
            <h3 className="font-headline font-bold text-lg mb-1">Content Kit</h3>
            <p className="text-sm text-slate-lavender mb-3">
              Everything generated lives here.
            </p>
            <span className="text-sm text-primary font-medium group-hover:underline">
              View Kit &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
