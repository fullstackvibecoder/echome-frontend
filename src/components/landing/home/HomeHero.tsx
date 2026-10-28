'use client';

import { trackCtaClick } from '@/lib/analytics';

export function HomeHero() {
  return (
    <section className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <h1 className="m-0 font-grotesk text-[clamp(56px,9vw,136px)] font-bold leading-[0.88] tracking-[-0.055em] text-home-ink">
        <span className="block">Talk once.</span> <span className="block">Show up all week.</span>
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-5">
        <p className="m-0 max-w-[36em] text-[19px] leading-normal text-home-muted">
          Record 5 to 20 minutes on your phone, or paste a YouTube, Zoom or Loom link. Echo cuts the clips, writes the posts in your
          voice, and schedules the week.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/auth/signup"
            onClick={() => trackCtaClick('hero_primary')}
            className="rounded-full bg-home-ink px-7 py-4 text-[17px] font-semibold text-home-paper transition-opacity hover:opacity-85"
          >
            Start free
          </a>
          <span className="text-[15px] text-home-muted">5 free kits. No card.</span>
        </div>
      </div>
    </section>
  );
}
