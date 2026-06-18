'use client';

/**
 * Homepage hero visual. A self-drawing SVG (SketchExplainer "hero-transform"
 * scene) showing: your video + voice -> Echo reads it -> a finished post in
 * your voice. Wrapped in the same glass chrome + floating cards as the prior
 * placeholder so a real product walkthrough video can drop back into this
 * frame later with zero relayout. Keep this component's name so the
 * HeroSection import stays stable.
 */

import { Zap } from 'lucide-react';
import { SketchExplainer } from '@/components/sketch/SketchExplainer';

// Bright accent so the line-art strokes + captions read on the dark hero bg.
// Tunable against the live card.
const HERO_ACCENT = '#6FC3EC';

export function HeroDemoVideo() {
  return (
    <div className="relative group">
      {/* Glass Container */}
      <div className="relative z-10 p-4 sm:p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_rgba(0,103,126,0.15)]">
        <div className="rounded-xl overflow-hidden bg-gray-950 relative flex items-center justify-center px-6 py-10 sm:py-12">
          <SketchExplainer scene="hero-transform" accent={HERO_ACCENT} className="w-full" />
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
