'use client';

import Image from 'next/image';
import { ArrowRight, Crown } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

export function HowItWorks() {
  return (
    <AnimatedSection>
      <section id="how" className="py-24 px-6 bg-background relative overflow-hidden">
        {/* Ambient gradient */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* "Context is King" Hero Statement */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">
            {/* Left: Message */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-bold text-xs tracking-widest uppercase">Core Belief</span>
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1]">
                Context is{' '}
                <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                  King.
                </span>
              </h2>

              <p className="text-xl text-muted-foreground font-light leading-relaxed max-w-lg">
                Most AI tools start from zero every time you open them. You write a prompt, cross your fingers, and hope it doesn&apos;t sound like a robot.
              </p>

              <p className="text-xl text-foreground font-medium leading-relaxed max-w-lg">
                EchoMe starts from <em>everything you&apos;ve already made</em>. Your videos, your posts, your emails, your voice. That context is why the output sounds like you — not like AI.
              </p>
            </div>

            {/* Right: Platform screenshot */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-accent-purple/10 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl">
                <Image
                  src="/showcase/platform/build-voice.png"
                  alt="EchoMe Knowledge Base — Connect Socials, Import Writing, Record Voice"
                  width={800}
                  height={500}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* 3-Step Flow — compact, horizontal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              {
                num: '01',
                title: 'Feed it your history',
                desc: 'YouTube, Instagram, blog posts, emails, PDFs, or just your voice. The more context, the better it knows you.',
              },
              {
                num: '02',
                title: 'Drop in any video',
                desc: 'A podcast, a Zoom call, a phone recording. Raw and unedited is fine. EchoMe does the rest.',
              },
              {
                num: '03',
                title: 'Get a full content kit',
                desc: 'Clips, carousels, social posts, blog drafts, captions — all grounded in your voice and your ideas.',
              },
            ].map((step) => (
              <div key={step.num} className="relative">
                <div className="text-6xl font-black text-primary/10 mb-2 leading-none">{step.num}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                         rounded-xl font-bold hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 transition-all
                         shadow-lg text-lg group"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="text-sm text-muted-foreground font-light mt-3">
              No credit card. 5 free content kits.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
