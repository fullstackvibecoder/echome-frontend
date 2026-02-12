'use client';

import Image from 'next/image';
import { Play, Sparkles, Check } from 'lucide-react';
import { ContentOutputFan } from './ContentOutputFan';

export function HeroShowcase() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Ambient glow behind the whole showcase */}
      <div className="absolute -inset-8 bg-gradient-to-b from-[#00D4FF]/10 via-[#B794F6]/10 to-[#FF6B9D]/10 rounded-[40px] blur-3xl pointer-events-none" />

      {/* ── Zone 1: Raw Video Input ── */}
      <div
        className="relative w-full max-w-md opacity-0 animate-hero-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        {/* Browser-chrome frame */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/5">
            {/* Traffic-light dots */}
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            <span className="text-white/50 text-xs font-medium ml-2">Your Recording</span>
          </div>

          {/* Video thumbnail */}
          <div className="aspect-video relative bg-gradient-to-br from-gray-800 to-gray-900">
            <Image
              src="/showcase/video-thumbnail.png"
              alt="Raw video recording"
              fill
              className="object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                <Play className="w-6 h-6 text-white ml-0.5" />
              </div>
            </div>

            {/* Timestamp pill — bottom-left */}
            <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur rounded-md">
              <span className="text-white/90 text-xs font-mono font-medium">42:18</span>
            </div>

            {/* RAW label — bottom-right */}
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur rounded-md">
              <span className="text-yellow-300 text-xs font-bold tracking-wider">RAW</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 2: Transform Beam ── */}
      <div className="relative flex flex-col items-center py-2" style={{ minHeight: 80 }}>
        {/* Vertical gradient line */}
        <div
          className="w-[2px] h-16 origin-top opacity-0 animate-transform-draw-vertical"
          style={{
            background: 'linear-gradient(to bottom, #00D4FF, #B794F6, #FF6B9D)',
            animationDelay: '700ms',
          }}
        />

        {/* Spark node — centered on the beam */}
        <div
          className="relative -mt-10 z-10 opacity-0 animate-hero-fade-in-up"
          style={{ animationDelay: '900ms' }}
        >
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#B794F6] animate-spark-ping"
            style={{ animationDelay: '1000ms' }}
          />
          {/* Solid circle */}
          <div className="relative w-9 h-9 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-full flex items-center justify-center shadow-lg shadow-[#00D4FF]/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Animated falling particles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-4 overflow-hidden pointer-events-none">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#B794F6]/60 animate-particle-fall"
              style={{
                left: `${6 + i * 4}px`,
                animationDelay: `${900 + i * 400}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Zone 3: Content Output Fan ── */}
      <div className="w-full relative">
        <ContentOutputFan />

        {/* Voice Match badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg mt-4 mx-auto w-fit opacity-0 animate-hero-fade-in-up"
          style={{ animationDelay: '1900ms' }}
        >
          <Check className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-green-400 text-sm font-bold leading-tight">94% Voice Match</p>
            <p className="text-white/50 text-[10px]">Powered by your Knowledge Base</p>
          </div>
        </div>

        {/* Floating "47 pieces" badge */}
        <div
          className="absolute -top-2 -right-2 md:right-0 px-3 py-1.5 bg-gradient-to-br from-[#FFD93D] to-[#FF6B9D] rounded-xl shadow-lg transform rotate-6 opacity-0 animate-hero-fade-in-up"
          style={{ animationDelay: '2000ms' }}
        >
          <span className="text-white text-xs font-bold">47 pieces</span>
        </div>
      </div>
    </div>
  );
}
