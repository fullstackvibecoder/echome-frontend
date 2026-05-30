'use client';

/**
 * Placeholder for the homepage hero while a new product walkthrough is being shot.
 * Auto-rotating screenshot carousel — same outer chrome (glass container, floating
 * cards, decorative circle) as the previous YouTube embed so the surrounding hero
 * layout doesn't shift. Swap back to a video element when the new walkthrough is
 * ready; keep this file's component name so HeroSection import stays stable.
 */

import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

const SLIDES = [
  { src: '/guide-screenshots/create-page.png', alt: 'EchoMe create page', caption: 'Paste a link, a video, anything' },
  { src: '/guide-screenshots/content-kit-list.png', alt: 'Generated content kits in Your Library', caption: 'Get every platform in one kit' },
  { src: '/guide-screenshots/build-your-voice.png', alt: 'Voice strength dashboard', caption: 'Matched to your voice' },
  { src: '/guide-screenshots/carousel-editor.png', alt: 'Carousel slide editor', caption: 'Edit every slide before posting' },
  { src: '/guide-screenshots/scheduling-clip-post-actions.png', alt: 'Post-now and schedule actions', caption: 'One click to publish' },
];

const SLIDE_DURATION_MS = 4500;
const FADE_DURATION_MS = 700;

export function HeroDemoVideo() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    // Respect users who've opted out of motion at the OS level.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div className="relative group">
      {/* Glass Container */}
      <div
        className="relative z-10 p-4 sm:p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_rgba(0,103,126,0.15)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="rounded-xl overflow-hidden bg-gray-950 relative" style={{ paddingBottom: '56.25%' }}>
          {SLIDES.map((slide, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              fetchPriority={i === 0 ? 'high' : 'low'}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 w-full h-full object-cover ease-in-out"
              style={{
                opacity: i === index ? 1 : 0,
                transitionProperty: 'opacity',
                transitionDuration: `${FADE_DURATION_MS}ms`,
              }}
            />
          ))}

          {/* Caption + dot indicators */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between gap-3">
            <p className="text-white font-headline font-bold text-sm tracking-tight">
              {SLIDES[index].caption}
            </p>
            <div className="flex gap-1.5 flex-shrink-0">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide ${i + 1} of ${SLIDES.length}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Floating card: Voice Matched — top right, bouncing */}
        <div className="absolute -top-5 -right-5 sm:-top-6 sm:-right-6 z-20 bg-white/[0.03] backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-white/10 shadow-[0_20px_40px_rgba(0,103,126,0.15)] flex items-center gap-3 animate-bounce pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent-purple" />
          </div>
          <span className="text-[11px] font-bold text-white whitespace-nowrap">Voice Matched 99%</span>
        </div>

        {/* Floating card: Instagram Carousel Gen — bottom left */}
        <div className="absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-12 z-20 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,103,126,0.15)] flex flex-col gap-2 max-w-[180px] pointer-events-none">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/40 uppercase tracking-tight">Drafting...</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse" />
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[70%] bg-primary rounded-full transition-all duration-1000" />
          </div>
          <span className="text-xs text-white/80 font-medium">Instagram Carousel Gen</span>
        </div>
      </div>

      {/* Decorative circle behind container */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-white/5 rounded-full opacity-50 pointer-events-none" />
    </div>
  );
}
