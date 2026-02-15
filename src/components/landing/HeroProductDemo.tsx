'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, Video, LayoutGrid, FileText, Calendar } from 'lucide-react';

export function HeroProductDemo() {
  const [showOutputs, setShowOutputs] = useState(false);

  useEffect(() => {
    // Simple cycle: show input → show outputs
    const cycle = () => {
      setShowOutputs(false);
      setTimeout(() => setShowOutputs(true), 1500);
      setTimeout(cycle, 5000);
    };

    const timer = setTimeout(() => setShowOutputs(true), 1500);
    const cycleTimer = setTimeout(cycle, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(cycleTimer);
    };
  }, []);

  return (
    <div className="relative w-full max-w-6xl mx-auto py-12">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B794F6]/5 rounded-3xl blur-3xl" />

      <div className="relative flex items-center justify-center gap-8 lg:gap-12">
        {/* Input: Single Video */}
        <div
          className={`relative transition-all duration-700 ${
            showOutputs ? 'scale-95 opacity-60' : 'scale-100 opacity-100'
          }`}
        >
          <div className="relative w-[280px] lg:w-[320px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Input</span>
            </div>

            {/* Video Card */}
            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <Image
                src="/showcase/source-video.png"
                alt="Source video"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-xs font-medium">podcast_episode_24.mp4</p>
                <p className="text-white/60 text-xs">42:18</p>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="relative">
          <div
            className={`transition-all duration-500 ${
              showOutputs ? 'scale-110 opacity-100' : 'scale-100 opacity-40'
            }`}
          >
            <ArrowRight className="w-8 h-8 text-[#00D4FF]" />
          </div>
        </div>

        {/* Outputs: Content Kit Grid */}
        <div
          className={`relative transition-all duration-700 ${
            showOutputs ? 'scale-100 opacity-100 translate-x-0' : 'scale-95 opacity-0 translate-x-8'
          }`}
        >
          <div className="relative w-[380px] lg:w-[480px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#B794F6] flex items-center justify-center shadow-lg">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Content Kit</span>
              <div className="ml-auto px-2 py-1 rounded-md bg-green-500/20 border border-green-500/30">
                <span className="text-green-400 text-xs font-bold">Ready in 3m</span>
              </div>
            </div>

            {/* Grid of Outputs */}
            <div className="grid grid-cols-2 gap-3">
              {/* Clip */}
              <div
                className="relative aspect-[9/16] rounded-lg overflow-hidden border border-[#00D4FF]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '100ms' : '0ms' }}
              >
                <Image
                  src="/showcase/instagram-reel.png"
                  alt="Video clip"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm border border-white/20">
                  <p className="text-white text-xs font-bold">Clip 1 of 5</p>
                </div>
              </div>

              {/* Carousel */}
              <div
                className="relative aspect-square rounded-lg overflow-hidden border border-[#B794F6]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '200ms' : '0ms' }}
              >
                <Image
                  src="/showcase/carousel-square-1.png"
                  alt="Carousel"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm border border-white/20">
                  <p className="text-white text-xs font-bold">Carousel 1 of 3</p>
                </div>
              </div>

              {/* LinkedIn Post */}
              <div
                className="relative aspect-square rounded-lg overflow-hidden border border-[#00D4FF]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '300ms' : '0ms' }}
              >
                <Image
                  src="/showcase/linkedin-post.png"
                  alt="LinkedIn post"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-white" />
                    <p className="text-white text-xs font-bold">LinkedIn Post</p>
                  </div>
                </div>
              </div>

              {/* Twitter Post */}
              <div
                className="relative aspect-square rounded-lg overflow-hidden border border-[#B794F6]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '400ms' : '0ms' }}
              >
                <Image
                  src="/showcase/twitter-post.png"
                  alt="Twitter post"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-white" />
                    <p className="text-white text-xs font-bold">X Post</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stat */}
            <div className="mt-3 text-center">
              <p className="text-white/60 text-xs">+ 7 more posts, captions & calendar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
