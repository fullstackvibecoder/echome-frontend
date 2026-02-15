'use client';

import Image from 'next/image';
import { Play, Check, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

export function HeroShowcaseV3() {
  const [kbChunks, setKbChunks] = useState(0);
  const [showOutput, setShowOutput] = useState(false);

  // Animate KB chunks counter
  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setKbChunks((prev) => {
          if (prev >= 894) {
            clearInterval(interval);
            setTimeout(() => setShowOutput(true), 300);
            return 894;
          }
          return prev + 89;
        });
      }, 100);
      return () => clearInterval(interval);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-3">
      {/* Ambient glow */}
      <div className="absolute -inset-8 bg-gradient-to-b from-[#00D4FF]/10 via-[#B794F6]/10 to-[#FF6B9D]/10 rounded-[40px] blur-3xl pointer-events-none" />

      {/* Video + Content Library */}
      <div
        className="relative w-full max-w-md opacity-0 animate-hero-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
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

          {/* Video content */}
          <div className="aspect-video relative bg-gradient-to-br from-gray-800 to-gray-900">
            {/* Actual video thumbnail - using real uploaded video */}
            <div className="absolute inset-0">
              <Image
                src="/showcase/source-video.png"
                alt="Your video library"
                fill
                className="object-cover opacity-60"
              />
            </div>

            {/* Stronger overlay to reduce noise */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                <Play className="w-6 h-6 text-white ml-0.5" />
              </div>
            </div>

            {/* Content source badges (bottom left) */}
            <div
              className="absolute bottom-3 left-3 flex gap-1.5 z-10 opacity-0 animate-hero-fade-in-up"
              style={{ animationDelay: '600ms' }}
            >
              <div className="w-10 h-10 rounded border border-white/20 bg-red-500/20 backdrop-blur-sm flex items-center justify-center text-xs">
                🎬
              </div>
              <div className="w-10 h-10 rounded border border-white/20 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-xs">
                📝
              </div>
              <div className="w-10 h-10 rounded border border-white/20 bg-purple-500/20 backdrop-blur-sm flex items-center justify-center text-xs">
                📧
              </div>
            </div>

            {/* KB counter (bottom right) */}
            <div
              className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-[#00D4FF]/20 border border-[#00D4FF]/40 backdrop-blur-md rounded-lg z-10 opacity-0 animate-hero-fade-in-up"
              style={{ animationDelay: '800ms' }}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#00D4FF] animate-pulse" />
                <span className="text-[#00D4FF] text-xs font-bold">{kbChunks}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transform indicator */}
      <div
        className={`flex items-center gap-2 transition-all duration-500 ${showOutput ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#B794F6] animate-spark-ping opacity-50" />
          <div className="relative w-8 h-8 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
        <Play className="w-4 h-4 text-[#00D4FF] rotate-90" />
      </div>

      {/* Output: Real content kit */}
      <div
        className={`relative w-full max-w-md transition-all duration-700 ${showOutput ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Instagram Reel - vertical video */}
            <div className="aspect-[9/16] relative rounded-lg overflow-hidden border border-white/10">
              <Image
                src="/showcase/instagram-reel.png"
                alt="Instagram reel"
                fill
                className="object-cover object-center"
              />
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-[9px] text-white/80 font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
                  Instagram
                </span>
              </div>
            </div>

            {/* Twitter Post - square */}
            <div className="aspect-square relative rounded-lg overflow-hidden border border-white/10">
              <Image
                src="/showcase/twitter-post.png"
                alt="Twitter post"
                fill
                className="object-cover object-center"
              />
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-[9px] text-white/80 font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
                  Twitter
                </span>
              </div>
            </div>

            {/* LinkedIn Post */}
            <div className="aspect-[4/5] relative rounded-lg overflow-hidden border border-white/10">
              <Image
                src="/showcase/linkedin-post.png"
                alt="LinkedIn post"
                fill
                className="object-cover object-center"
              />
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-[9px] text-white/80 font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
                  LinkedIn
                </span>
              </div>
            </div>

            {/* Newsletter/Blog */}
            <div className="aspect-[3/4] relative rounded-lg overflow-hidden border border-white/10">
              <Image
                src="/showcase/newsletter.png"
                alt="Newsletter"
                fill
                className="object-cover object-top"
              />
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-[9px] text-white/80 font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">
                  Newsletter
                </span>
              </div>
            </div>
          </div>

          {/* Bottom label */}
          <div className="text-center pt-2.5 mt-2.5 border-t border-white/10">
            <p className="text-white/60 text-[10px] font-medium">One Video → Week of Content</p>
          </div>
        </div>

        {/* Voice Match badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg mt-3 mx-auto w-fit">
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
