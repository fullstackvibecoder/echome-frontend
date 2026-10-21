'use client';

import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { SectionCTA } from './SectionCTA';

// Quotes are verbatim from the user (lightly trimmed), used with permission.
// Giovanna: EchoMe office hours, 2026-10-21; agreed to be named on the site.
const featured = {
  stat: 'Almost 3,000 views overnight',
  quote:
    "I wasn't getting a lot of views. Then I put a video I'd made into EchoMe, it cut it into short clips, and I posted right from EchoMe. Overnight I got almost 3,000 views. I didn't do anything except click a couple buttons.",
  name: 'Giovanna Cavarra',
  role: 'Real estate agent',
  initials: 'GC',
};

export function TestimonialStrip() {
  return (
    <AnimatedSection>
      <section className="py-20 px-6 bg-gray-900 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto relative">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary mb-4">
            From one real video
          </p>
          <h2 className="heading-section text-white text-center mb-10">
            {featured.stat}
          </h2>

          <figure className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-8 sm:p-10">
            <blockquote className="text-white/90 text-xl sm:text-2xl font-light leading-relaxed">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-8">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{featured.initials}</span>
              </div>
              <div>
                <p className="text-white font-semibold">{featured.name}</p>
                <p className="text-white/50 text-sm">{featured.role}</p>
              </div>
            </figcaption>
          </figure>

          <p className="text-center text-white/60 font-light text-lg mt-8 max-w-2xl mx-auto">
            No script, no studio. The clips came from a video she had already recorded, so they sound like her.
          </p>

          <SectionCTA headline="Turn your next video into clips that sound like you" buttonText="Start Free" trust="No credit card required" />
        </div>
      </section>
    </AnimatedSection>
  );
}
