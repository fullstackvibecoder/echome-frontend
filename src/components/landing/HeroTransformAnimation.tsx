'use client';

import Image from 'next/image';
import { Play, Sparkles, Check } from 'lucide-react';

export function HeroTransformAnimation() {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-[#FF6B9D]/20 via-[#B794F6]/20 to-[#00D4FF]/20 rounded-3xl blur-2xl" />

      {/* Glass card */}
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden">

        {/* Stage 1 — Video Input (fades in at 300ms) */}
        <div
          className="mb-5 opacity-0 animate-hero-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B9D] to-[#FFD93D] rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
            <p className="text-white font-semibold text-sm">Your Recording</p>
            <span className="ml-auto text-white/50 text-xs">42:18</span>
          </div>

          {/* Video thumbnail */}
          <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl relative overflow-hidden">
            <Image
              src="/showcase/video-thumbnail.png"
              alt="Video recording"
              fill
              className="object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Stage 2 — Transformation line (800ms) */}
        <div className="relative my-5 flex items-center justify-center">
          <div
            className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] origin-left opacity-0 animate-transform-draw"
            style={{ animationDelay: '800ms' }}
          />
          <div
            className="relative z-10 w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-full flex items-center justify-center opacity-0 animate-hero-fade-in-up"
            style={{ animationDelay: '1000ms' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Stage 3 — Content Kit Output (1200ms) */}
        <div
          className="opacity-0 animate-card-fan-in"
          style={{ animationDelay: '1200ms' }}
        >
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
            Your Content Kit
          </p>

          {/* Content kit screenshot — swap src with real screenshot later */}
          <div className="rounded-xl overflow-hidden relative bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10">
            <Image
              src="/showcase/content-kit-output.png"
              alt="Content kit with clips, carousels, posts, and newsletter"
              width={600}
              height={400}
              className="w-full h-auto object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Fallback shown when screenshot isn't available yet */}
            <div className="p-4 grid grid-cols-2 gap-2">
              {[
                { label: '5 Captioned Reels', color: '#FF6B9D' },
                { label: '3 Carousels', color: '#B794F6' },
                { label: '8 Social Posts', color: '#00D4FF' },
                { label: '1 Newsletter', color: '#FFD93D' },
              ].map((card, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: `${card.color}10`,
                    borderColor: `${card.color}30`,
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: card.color }}>
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Voice Match badge (1800ms) */}
        <div
          className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mt-3 opacity-0 animate-hero-fade-in-up"
          style={{ animationDelay: '1800ms' }}
        >
          <Check className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-green-400 text-sm font-bold">94% Voice Match</p>
            <p className="text-white/50 text-xs">Powered by your Knowledge Base</p>
          </div>
        </div>

        {/* Floating "47 pieces" badge (2000ms) */}
        <div
          className="absolute -top-3 -right-3 px-4 py-2 bg-gradient-to-br from-[#FFD93D] to-[#FF6B9D] rounded-xl shadow-lg transform rotate-6 opacity-0 animate-hero-fade-in-up"
          style={{ animationDelay: '2000ms' }}
        >
          <span className="text-white text-sm font-bold">47 pieces</span>
        </div>
      </div>
    </div>
  );
}
