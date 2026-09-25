'use client';

import Link from 'next/link';
import { Globe, MousePointerClick, Sparkles, ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const points = [
  {
    icon: Globe,
    label: "It starts from what's public",
    desc: 'Your YouTube channel, your blog, your Instagram. Echo goes looking before you type a word.',
  },
  {
    icon: MousePointerClick,
    label: "You confirm, you don't configure",
    desc: 'Echo shows you what it found and asks one question: is this you?',
  },
  {
    icon: Sparkles,
    label: 'Feed it more any time',
    desc: 'Drop in emails and documents, or hit Teach Echo more on the Create page.',
  },
];

export function VoiceProfileSection() {
  return (
    <AnimatedSection>
      <section id="how" className="py-24 px-6 bg-gradient-to-b from-background to-secondary relative overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/25 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm">Work before the work</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground leading-tight">
              Your voice profile{' '}
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                builds itself
              </span>
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Sign up and Echo goes looking for how you already sound: your YouTube, your blog, your Instagram, the
              emails and documents you drop in. It builds a voice profile, shows you what it found, and asks one
              question: is this you? From then on, everything it writes sounds like you, and the more you feed it,
              the closer it gets.
            </p>
          </div>

          {/* Three points */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.label}
                  className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-12 h-12 mb-4 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-md">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{point.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Secondary link */}
          <div className="text-center">
            <Link
              href="/guides/build-your-voice"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How your voice profile works
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
