'use client';

import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { SectionCTA } from './SectionCTA';

const testimonials = [
  {
    quote: "I uploaded a 45-minute podcast and got a week's worth of LinkedIn posts that actually sounded like me. Not generic AI slop.",
    name: 'Jordan M.',
    role: 'B2B Creator',
    initials: 'JM',
  },
  {
    quote: "The carousel generator alone is worth it. I used to spend 2 hours per carousel in Canva. Now it's done before my coffee is cold.",
    name: 'Priya S.',
    role: 'Marketing Consultant',
    initials: 'PS',
  },
  {
    quote: "My team manages 4 creator accounts. EchoMe Teams keeps each voice profile separate — no cross-contamination. Game changer.",
    name: 'Alex R.',
    role: 'Agency Owner',
    initials: 'AR',
  },
  {
    quote: "I record one video a week and EchoMe turns it into 15+ pieces of content across every platform. My engagement tripled in 2 months.",
    name: 'Marcus T.',
    role: 'YouTube Educator',
    initials: 'MT',
  },
  {
    quote: "Finally an AI tool that doesn't make me sound like everyone else. It actually picks up my sarcasm and casual tone.",
    name: 'Sarah K.',
    role: 'Solopreneur & Podcaster',
    initials: 'SK',
  },
];

export function TestimonialStrip() {
  return (
    <AnimatedSection>
      <section className="py-20 px-6 bg-foreground relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
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

          <SectionCTA headline="Join 500+ creators making content that sounds like them" buttonText="Start Free" trust="No credit card required" />
        </div>
      </section>
    </AnimatedSection>
  );
}
