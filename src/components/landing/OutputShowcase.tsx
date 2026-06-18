'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Film, Package, Brain, Users, Send } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const tabs = [
  { id: 'create', label: 'One Input', icon: Sparkles },
  { id: 'reels', label: 'Reels & Clips', icon: Film },
  { id: 'kits', label: 'Content Kits', icon: Package },
  { id: 'voice', label: 'Your Voice', icon: Brain },
  { id: 'tools', label: 'Creator Tools', icon: Users },
  { id: 'schedule', label: 'Schedule & Publish', icon: Send },
];

interface Slide {
  image: string;
  alt: string;
  caption: string;
  /** Native pixel size of the source. Defaults to the 1200x700 landscape frame. */
  width?: number;
  height?: number;
  /** Cap the rendered width (px) so smaller captures display near 1:1 instead of upscaling. */
  maxW?: number;
}

const slides: Record<string, Slide[]> = {
  create: [
    { image: '/showcase/platform/v2/unified-create.png', width: 684, height: 646, maxW: 684, alt: 'EchoMe unified workspace with draft content cards, a voice-knowledge score panel, and one universal input box', caption: 'Echo learns how well it knows you, then drafts content from what you shared. Pick one and go.' },
    { image: '/showcase/platform/v2/unified-input.png', width: 689, height: 497, maxW: 689, alt: 'EchoMe universal input box: type, paste a link, drop a file, or record your voice', caption: 'One box. Type, paste a link, drop a video, or talk. It all feeds your voice.' },
  ],
  reels: [
    { image: '/showcase/platform/v2/reels.png', alt: 'Reel Maker with drafted clips ready to publish', caption: 'Captioned clips, drafted and ready to post.' },
  ],
  kits: [
    { image: '/showcase/platform/v2/content-kit-list.png', alt: 'Content kit library grid', caption: 'Every idea becomes a full kit. Your whole library in one place.' },
    { image: '/showcase/platform/v2/content-kit-detail.png', alt: 'Content kit detail with carousel, B-roll reel, and platform posts', caption: 'One kit: carousel, B-roll reel, blog, and a post for every platform.' },
  ],
  voice: [
    { image: '/showcase/platform/v2/voice.png', alt: 'Build your voice knowledge base with connect, import, and record options', caption: 'Teach Echo how you think and sound.' },
  ],
  tools: [
    { image: '/showcase/platform/v2/creator-radar.png', alt: 'Creator Radar following feed with repurpose buttons', caption: 'Follow creators. Repurpose their videos and links in your voice.' },
    { image: '/showcase/platform/v2/creator-library.png', alt: 'Creator Library with monthly B-roll', caption: 'Monthly B-roll drops, caption templates, and reel scripts' },
  ],
  schedule: [
    { image: '/showcase/platform/v2/calendar.png', alt: 'Content calendar week view with scheduled posts across platforms', caption: 'Schedule a week of content across every platform.' },
    { image: '/showcase/platform/v2/post-to.png', alt: 'Platform selector with Post now and Schedule buttons', caption: 'Post now or schedule. Instagram, LinkedIn, Facebook, and more.' },
  ],
};

const AUTO_ROTATE_MS = 5000;

function ImageCarousel({ items }: { items: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = items.length;

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement;
    if (child) {
      el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    }
  }, []);

  const next = useCallback(() => {
    const n = (current + 1) % total;
    setCurrent(n);
    scrollTo(n);
  }, [current, total, scrollTo]);

  const prev = useCallback(() => {
    const n = (current - 1 + total) % total;
    setCurrent(n);
    scrollTo(n);
  }, [current, total, scrollTo]);

  // Auto-rotate
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, AUTO_ROTATE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total]);

  // Pause on hover
  const pause = () => { if (timerRef.current) clearInterval(timerRef.current); };
  const resume = () => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, AUTO_ROTATE_MS);
  };

  // Sync dots with scroll-snap
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollLeft = el.scrollLeft;
        const width = el.clientWidth;
        const idx = Math.round(scrollLeft / width);
        if (idx !== current && idx >= 0 && idx < total) {
          setCurrent(idx);
        }
        ticking = false;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [current, total]);

  // Reset to first slide when items change
  useEffect(() => {
    setCurrent(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0 });
    }
  }, [items]);

  return (
    <div
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => (
          <div key={item.image} className="w-full flex-shrink-0 snap-center flex justify-center">
            <div
              className="rounded-xl overflow-hidden border border-border w-full"
              style={item.maxW ? { maxWidth: item.maxW } : undefined}
            >
              <Image
                src={item.image}
                alt={item.alt}
                width={item.width ?? 1200}
                height={item.height ?? 700}
                sizes={item.maxW ? `${item.maxW}px` : '(max-width: 768px) 100vw, 1100px'}
                className="w-full h-auto"
                priority={items.indexOf(item) === 0}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Caption */}
      <p className="text-sm text-muted-foreground text-center font-medium mt-4 min-h-[20px]">
        {items[current]?.caption}
      </p>

      {/* Arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-[45%] -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-all z-10"
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-[45%] -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-all z-10"
            aria-label="Next screenshot"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); scrollTo(i); }}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to screenshot ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutputShowcase() {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <AnimatedSection>
      <section id="output-showcase" className="pt-16 pb-32 px-6 bg-gradient-to-b from-secondary via-background to-secondary relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm">Real Platform Screenshots</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 text-foreground leading-tight">
              What You
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                {' '}Actually Get
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              No mockups. Swipe through real screenshots from the EchoMe platform.
            </p>
          </div>

          {/* Tab Pills */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap" role="tablist" aria-label="Platform feature examples">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
                      : 'bg-card text-muted-foreground hover:bg-secondary border border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Carousel */}
          <div className="bg-card rounded-2xl border border-border shadow-xl p-4 sm:p-6 md:p-8">
            <ImageCarousel items={slides[activeTab]} />
          </div>

          {/* Mid-page CTA */}
          <div className="text-center mt-16">
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                         rounded-xl font-bold hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 transition-all
                         shadow-lg text-lg group"
            >
              Get Your Content Kit
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="text-sm text-muted-foreground font-light mt-3">
              Give it a video, a link, or a topic and see the magic - no credit card required
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
