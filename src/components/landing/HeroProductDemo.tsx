'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, Video, LayoutGrid } from 'lucide-react';

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
          <div className="relative w-[300px] lg:w-[360px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Input</span>
            </div>

            {/* Video Card - Real QuickTime Player Screenshot */}
            <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <Image
                src="/showcase/new/source-video.png"
                alt="Source video"
                width={360}
                height={240}
                className="w-full h-auto"
              />
            </div>

            <div className="mt-2 text-center">
              <p className="text-white/60 text-xs">Raw video · Any length</p>
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
          <div className="relative w-[420px] lg:w-[520px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#B794F6] flex items-center justify-center shadow-lg">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Content Kit</span>
              <div className="ml-auto px-2 py-1 rounded-md bg-green-500/20 border border-green-500/30">
                <span className="text-green-400 text-xs font-bold">Ready in 2-5 min</span>
              </div>
            </div>

            {/* Grid of Real Product UI Outputs */}
            <div className="grid grid-cols-3 gap-3">
              {/* Viral Reel */}
              <div
                className="relative rounded-lg overflow-hidden border border-[#00D4FF]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '100ms' : '0ms' }}
              >
                <Image
                  src="/showcase/new/viral-reel-1.png"
                  alt="Viral reel with captions"
                  width={160}
                  height={285}
                  className="w-full h-auto"
                />
              </div>

              {/* Carousel Array */}
              <div
                className="relative col-span-2 rounded-lg overflow-hidden border border-[#B794F6]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '200ms' : '0ms' }}
              >
                <Image
                  src="/showcase/new/carousel-array.png"
                  alt="Carousel outputs"
                  width={340}
                  height={285}
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Text Content Grid */}
              <div
                className="relative col-span-3 rounded-lg overflow-hidden border border-[#00D4FF]/30 shadow-xl transition-all duration-500"
                style={{ transitionDelay: showOutputs ? '300ms' : '0ms' }}
              >
                <Image
                  src="/showcase/new/text-content-output.png"
                  alt="Text content outputs"
                  width={520}
                  height={180}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Bottom stat */}
            <div className="mt-3 text-center">
              <p className="text-white/60 text-xs">15 pieces of content, matched to your voice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
