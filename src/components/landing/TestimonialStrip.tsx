'use client';

import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { SectionCTA } from './SectionCTA';

// Real member quotes from the June 2026 office hours, anonymized (members
// consented to the call, not to public named attribution). Role-only attribution.
const testimonials: { quote: string; name: string; role: string; initials: string }[] = [
  {
    quote: 'I thought I needed to have existing video. Turns out I don’t.',
    name: 'Real estate agent',
    role: 'EchoMe member',
    initials: 'RE',
  },
  {
    quote: 'I was just driving and talked about why I stopped working with buyers during the pandemic and came back to it. That became content.',
    name: 'Real estate agent',
    role: 'EchoMe member',
    initials: 'RE',
  },
  {
    quote: 'It’s always weird writing about yourself. That’s the biggest hurdle with content.',
    name: 'Real estate agent',
    role: 'EchoMe member',
    initials: 'RE',
  },
];

export function TestimonialStrip() {
  // Hide entire section until real testimonials are added
  if (testimonials.length === 0) return null;

  return (
    <AnimatedSection>
      <section className="py-20 px-6 bg-gray-900 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-3">
              Creators Are Talking
            </h2>
            <p className="text-white/60 font-light text-lg">
              Real feedback from real users.
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-2xl p-6 flex flex-col"
              >
                <p className="text-white/90 font-light leading-relaxed flex-1 mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-white/50 text-sm">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <SectionCTA headline="Start creating content that sounds like you" buttonText="Start Free" trust="No credit card required" />
        </div>
      </section>
    </AnimatedSection>
  );
}
