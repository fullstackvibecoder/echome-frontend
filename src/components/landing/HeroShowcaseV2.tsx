'use client';

import { Play, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export function HeroShowcaseV2() {
  const [kbChunks, setKbChunks] = useState(0);
  const [showTransform, setShowTransform] = useState(false);

  // Animate KB chunks counter
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setKbChunks((prev) => {
          if (prev >= 894) {
            clearInterval(interval);
            setTimeout(() => setShowTransform(true), 500);
            return 894;
          }
          return prev + 89;
        });
      }, 100);
      return () => clearInterval(interval);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Ambient glow */}
      <div className="absolute -inset-8 bg-gradient-to-b from-primary/10 via-accent-purple/10 to-accent-pink/10 rounded-[40px] blur-3xl pointer-events-none" />

      {/* BEFORE: Raw Video + Content Library */}
      <div
        className="relative w-full max-w-md opacity-0 animate-hero-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        <div className="relative">
          {/* Main video frame */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <span className="text-white/50 text-xs font-medium ml-2">Your Video Library</span>
            </div>

            {/* Video thumbnail with overlay mini-thumbnails */}
            <div className="aspect-video relative bg-gradient-to-br from-gray-800 to-gray-900">
              {/* Main video */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
              </div>

              {/* Mini content library stack (bottom left) */}
              <div
                className="absolute bottom-3 left-3 flex gap-1.5 opacity-0 animate-hero-fade-in-up"
                style={{ animationDelay: '600ms' }}
              >
                <div className="w-12 h-12 rounded border border-white/20 bg-red-500/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs">🎬</span>
                </div>
                <div className="w-12 h-12 rounded border border-white/20 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs">📝</span>
                </div>
                <div className="w-12 h-12 rounded border border-white/20 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs">📧</span>
                </div>
              </div>

              {/* KB indicator (bottom right) */}
              <div
                className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-primary/20 border border-primary/40 backdrop-blur-md rounded-lg opacity-0 animate-hero-fade-in-up"
                style={{ animationDelay: '800ms' }}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                  <span className="text-primary text-xs font-bold">{kbChunks}</span>
                </div>
              </div>

              {/* RAW label */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 backdrop-blur rounded-md">
                <span className="text-yellow-300 text-xs font-bold tracking-wider">RAW</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSFORM: Arrow + Echo processing */}
      <div
        className={`relative flex flex-col items-center py-2 transition-all duration-700 ${showTransform ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{ minHeight: 60 }}
      >
        {/* Echo logo with pulse */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent-purple animate-spark-ping" />
          <div className="relative w-10 h-10 bg-gradient-to-br from-primary to-accent-purple rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-primary rotate-90 mt-1" />
      </div>

      {/* AFTER: Content Kit Output */}
      <div
        className={`relative w-full max-w-md transition-all duration-700 ${showTransform ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        {/* Content grid */}
        <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Reel */}
            <div className="aspect-[9/16] bg-gradient-to-br from-accent-pink/20 to-accent-pink/5 border border-accent-pink/30 rounded-lg flex flex-col items-center justify-center p-2">
              <Play className="w-6 h-6 text-accent-pink mb-1" />
              <span className="text-[10px] text-accent-pink font-medium">Reel</span>
            </div>

            {/* Carousel */}
            <div className="aspect-square bg-gradient-to-br from-accent-purple/20 to-accent-purple/5 border border-accent-purple/30 rounded-lg flex flex-col items-center justify-center p-2">
              <div className="flex gap-0.5 mb-1">
                <div className="w-1 h-1 rounded-full bg-accent-purple" />
                <div className="w-1 h-1 rounded-full bg-accent-purple/50" />
                <div className="w-1 h-1 rounded-full bg-accent-purple/50" />
              </div>
              <span className="text-[10px] text-accent-purple font-medium">Carousel</span>
            </div>

            {/* Post */}
            <div className="aspect-[4/5] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-lg flex flex-col items-center justify-center p-2">
              <div className="text-primary text-lg mb-1">Aa</div>
              <span className="text-[10px] text-primary font-medium">Post</span>
            </div>

            {/* Blog */}
            <div className="aspect-[3/4] bg-gradient-to-br from-accent-yellow/20 to-accent-yellow/5 border border-accent-yellow/30 rounded-lg flex flex-col items-center justify-center p-2">
              <div className="flex flex-col gap-0.5 mb-1">
                <div className="w-6 h-0.5 bg-accent-yellow" />
                <div className="w-4 h-0.5 bg-accent-yellow/70" />
                <div className="w-5 h-0.5 bg-accent-yellow/50" />
              </div>
              <span className="text-[10px] text-accent-yellow font-medium">Blog</span>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="text-center pt-3 border-t border-white/10">
            <p className="text-white/60 text-xs font-medium">One Video → Week of Content</p>
          </div>
        </div>

        {/* Voice Match badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg mt-4 mx-auto w-fit">
          <Check className="w-4 h-4 text-green-400" />
          <div>
            <p className="text-green-400 text-sm font-bold leading-tight">94% Voice Match</p>
            <p className="text-white/50 text-[10px]">Powered by your Knowledge Base</p>
          </div>
        </div>
      </div>
    </div>
  );
}
