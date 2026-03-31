'use client';

import Image from 'next/image';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

export function KnowledgeBaseSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary relative overflow-hidden">
        {/* Ambient gradient */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground leading-tight">
              One Video In.{' '}
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                Everything Out.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Drop a video, get a week of content. Every piece is grounded in your voice because the system already knows how you think.
            </p>
          </div>

          {/* Visual: Input → Output flow */}
          <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
            {/* Left: Input — what goes in */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-primary uppercase tracking-widest mb-4">What goes in</div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
                <Image
                  src="/showcase/platform/upload-video.png"
                  alt="Upload Video interface — drop a podcast, interview, or talking-head video"
                  width={800}
                  height={500}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Any video. YouTube link, file upload, or paste a URL.
              </p>
            </div>

            {/* Right: Output — what comes out */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-accent-purple uppercase tracking-widest mb-4">What comes out</div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
                <Image
                  src="/showcase/platform/written-content.png"
                  alt="Written content generated for LinkedIn, Twitter, Instagram, TikTok, blog, and email"
                  width={800}
                  height={500}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Posts, carousels, clips, blog drafts, captions — all in your voice.
              </p>
            </div>
          </div>

          {/* The "why" — dark callout */}
          <div className="bg-gray-900 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid md:grid-cols-3 gap-8 text-center">
              {[
                {
                  stat: '6',
                  label: 'platforms',
                  detail: 'LinkedIn, Twitter/X, Instagram, TikTok, Blog, Email',
                },
                {
                  stat: '15+',
                  label: 'content pieces',
                  detail: 'Posts, carousels, clips, captions, blog drafts',
                },
                {
                  stat: '1',
                  label: 'video',
                  detail: 'That\u2019s all it takes. Your voice does the rest.',
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-5xl md:text-6xl font-black text-primary mb-1">{item.stat}</div>
                  <div className="text-lg font-bold text-white mb-2">{item.label}</div>
                  <p className="text-sm text-white/60">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
