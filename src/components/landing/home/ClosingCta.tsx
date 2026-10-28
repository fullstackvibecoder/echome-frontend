'use client';

import { trackCtaClick } from '@/lib/analytics';

export function ClosingCta() {
  return (
    <section aria-label="Get started" className="bg-home-signal text-home-ink">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-8 px-4 py-28 sm:px-6">
        <h2 className="m-0 flex-[1_1_640px] font-grotesk text-[clamp(48px,7vw,112px)] font-bold leading-[0.9] tracking-[-0.05em]">
          Your next week is a <span className="whitespace-nowrap">12-minute walk.</span>
        </h2>
        <a
          href="/auth/signup"
          onClick={() => trackCtaClick('closing_cta')}
          className="rounded-full bg-home-ink px-8 py-[18px] text-lg font-semibold text-home-paper transition-opacity hover:opacity-85"
        >
          Make your first kit free
        </a>
      </div>
    </section>
  );
}
