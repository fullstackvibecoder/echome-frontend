'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const outputSlides = [
  { image: '/showcase/platform/written-content.png', alt: 'Written content for 6 platforms', label: 'Social Posts' },
  { image: '/showcase/platform/instagram-carousel.png', alt: 'Instagram carousel slides', label: 'Carousels' },
  { image: '/showcase/platform/reel-maker.png', alt: 'Reel Maker with split-screen clips', label: 'Video Clips' },
  { image: '/showcase/platform/blog-post.png', alt: 'Blog post with header image', label: 'Blog Posts' },
  { image: '/showcase/platform/carousel-slide-1.png', alt: 'Tweet-box carousel slide', label: 'Tweet Cards' },
];

const ROTATE_MS = 4000;

export function KnowledgeBaseSection() {
  const [current, setCurrent] = useState(0);
  const total = outputSlides.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  // Auto-rotate
  useEffect(() => {
    const timer = setInterval(next, ROTATE_MS);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary relative overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground leading-tight">
              It already read{' '}
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                your last hundred posts.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
              Now drop the next one. Echo writes it in your voice — your phrases, your tone, your framing — because it&apos;s been studying you all along.
            </p>
          </div>

          {/* Input → Output */}
          <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
            {/* Left: Static input */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-primary uppercase tracking-widest mb-4">What goes in</div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-xl">
                <Image
                  src="/showcase/platform/upload-video.png"
                  alt="EchoMe create page — paste a link, type a topic, drop a video, or record a voice note"
                  width={800}
                  height={500}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                A link, a video, a topic, a voice note — whatever you&apos;ve got.
              </p>
            </div>

            {/* Right: Cycling output carousel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-accent-purple uppercase tracking-widest">What comes out</div>
                {/* Pill label for current output type */}
                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                  {outputSlides[current].label}
                </span>
              </div>

              <div className="relative group">
                {/* Image with crossfade */}
                <div className="rounded-2xl overflow-hidden border border-border shadow-xl relative aspect-[8/5]">
                  {outputSlides.map((slide, i) => (
                    <Image
                      key={slide.image}
                      src={slide.image}
                      alt={slide.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className={`object-cover object-top transition-opacity duration-500 ${
                        i === current ? 'opacity-100' : 'opacity-0'
                      }`}
                      priority={i === 0}
                    />
                  ))}
                </div>

                {/* Arrows */}
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-all md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Previous output"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-all md:opacity-0 md:group-hover:opacity-100"
                  aria-label="Next output"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-2 mt-1">
                {outputSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`rounded-full transition-all ${
                      i === current
                        ? 'w-6 h-3 bg-accent-purple'
                        : 'w-3 h-3 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Show output ${i + 1}`}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Posts, carousels, clips, blog drafts, captions — all in your voice.
              </p>
            </div>
          </div>

          {/* Stats callout */}
          <div className="bg-gray-900 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid md:grid-cols-3 gap-8 text-center">
              {[
                { stat: '0', label: 'prompts to engineer', detail: 'No "act like me" instructions. Echo reads what you\u2019ve already made.' },
                { stat: '10+', label: 'source types', detail: 'YouTube, Instagram, blog, email, voice notes, PDFs, your public web.' },
                { stat: '1', label: 'voice profile', detail: 'Yours. Built from everything you give it. No generic LLM defaults.' },
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
