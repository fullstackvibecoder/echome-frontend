'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Video } from 'lucide-react';

type OutputType = 'text' | 'reel' | 'tweet-carousel' | 'bg-carousel';

interface Output {
  type: OutputType;
  src: string;
  label: string;
  aspect: 'square' | 'vertical';
}

const outputs: Output[] = [
  // Mix it up for variety - no consecutive similar types
  { type: 'reel', src: '/showcase/new/viral-reel-1.png', label: 'Instagram Reel', aspect: 'vertical' },
  { type: 'text', src: '/showcase/new/text-linkedin.png', label: 'LinkedIn Post', aspect: 'square' },
  { type: 'tweet-carousel', src: '/showcase/new/tweet-carousel-1.png', label: 'Twitter Carousel', aspect: 'square' },
  { type: 'reel', src: '/showcase/new/viral-reel-2.png', label: 'TikTok Clip', aspect: 'vertical' },
  { type: 'text', src: '/showcase/new/text-blog.png', label: 'Blog Post', aspect: 'square' },
  { type: 'bg-carousel', src: '/showcase/new/bg-carousel-1.png', label: 'Custom Carousel', aspect: 'square' },
  { type: 'reel', src: '/showcase/new/viral-reel-3.png', label: 'YouTube Short', aspect: 'vertical' },
  { type: 'text', src: '/showcase/new/text-twitter.png', label: 'X Thread', aspect: 'square' },
  { type: 'tweet-carousel', src: '/showcase/new/tweet-carousel-2.png', label: 'LinkedIn Carousel', aspect: 'square' },
  { type: 'reel', src: '/showcase/new/viral-reel-4.png', label: 'Viral Clip', aspect: 'vertical' },
  { type: 'text', src: '/showcase/new/text-instagram.png', label: 'IG Caption', aspect: 'square' },
  { type: 'bg-carousel', src: '/showcase/new/bg-carousel-2.png', label: 'Quote Carousel', aspect: 'square' },
];

export function HeroProductDemo() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile to pause auto-cycling (prevents layout jumps from varying content sizes)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const startCycling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % outputs.length);
        setIsVisible(true);
      }, 300);
    }, 1800);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      startCycling();
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isMobile, startCycling]);

  const currentOutput = outputs[currentIndex];

  return (
    <div className="relative w-full max-w-5xl mx-auto py-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-purple/5 rounded-3xl blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Input: Stacked Videos */}
        <div className="relative">
          <div className="relative w-[280px] lg:w-[340px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Input</span>
            </div>

            {/* Video Card 1 - Solo recording */}
            <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <Image
                src="/showcase/new/source-video.png"
                alt="Solo video recording"
                width={340}
                height={227}
                className="w-full h-auto animate-ken-burns"
              />
              {/* REC indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-rec-pulse" />
                <span className="text-red-400 text-[10px] font-bold tracking-wider uppercase">REC</span>
              </div>
              {/* Scan line overlay */}
              <div className="absolute inset-0 pointer-events-none animate-scan-line" />
            </div>

            <div className="mt-2 text-center">
              <p className="text-white/60 text-xs">Solo recording · Any length</p>
            </div>

            {/* "or" divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-white/50 text-sm font-medium uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            {/* Video Card 2 - Multi-person Zoom */}
            <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <Image
                src="/showcase/new/source-video-zoom.png"
                alt="Multi-person Zoom recording"
                width={340}
                height={227}
                className="w-full h-auto animate-ken-burns-alt"
              />
              {/* REC indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-rec-pulse" />
                <span className="text-red-400 text-[10px] font-bold tracking-wider uppercase">REC</span>
              </div>
              {/* Scan line overlay */}
              <div className="absolute inset-0 pointer-events-none animate-scan-line" />
            </div>

            <div className="mt-2 text-center">
              <p className="text-white/60 text-xs">Zoom call · Podcast · Interview</p>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="relative">
          <ArrowRight className="w-8 h-8 text-primary" />
        </div>

        {/* Output: Cycling through individual items */}
        <div className="relative">
          <div className="relative w-[280px] lg:w-[340px]">
            {/* Output Card - Fixed height container to prevent page jog */}
            <div className="relative min-h-[400px] lg:min-h-[604px]">
              <div
                className={`relative h-full flex items-center justify-center transition-all duration-300 ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              >
                {/* Reel - iPhone Mockup */}
                {currentOutput.type === 'reel' && (
                  <div className="relative">
                    {/* iPhone Frame */}
                    <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl border-4 border-gray-800" style={{ width: '260px' }}>
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-10" />

                      {/* Screen */}
                      <div className="relative rounded-[2.5rem] overflow-hidden bg-white" style={{ aspectRatio: '9/19.5' }}>
                        <Image
                          src={currentOutput.src}
                          alt={currentOutput.label}
                          width={236}
                          height={512}
                          className="w-full h-full object-cover"
                        />

                        {/* Instagram UI Elements */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white" />
                            <span className="text-white text-sm font-semibold drop-shadow-lg">echome</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Label below */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm">
                        <p className="text-white text-xs font-medium">{currentOutput.label}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Post - Platform Card */}
                {currentOutput.type === 'text' && (
                  <div className="relative w-[340px]">
                    {/* Platform badge */}
                    <div className="absolute -top-3 left-4 z-10">
                      <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-dark shadow-lg">
                        <p className="text-white text-xs font-bold">{currentOutput.label}</p>
                      </div>
                    </div>

                    {/* Card */}
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-2xl border border-gray-200">
                      <Image
                        src={currentOutput.src}
                        alt={currentOutput.label}
                        width={340}
                        height={340}
                        className="w-full h-auto"
                      />

                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Carousel - Browser Window */}
                {(currentOutput.type === 'tweet-carousel' || currentOutput.type === 'bg-carousel') && (
                  <div className="relative w-[340px]">
                    {/* Browser chrome */}
                    <div className="bg-gray-800 rounded-t-xl px-3 py-2 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-gray-400 text-xs">
                        {currentOutput.type === 'tweet-carousel' ? 'twitter.com' : 'linkedin.com'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative rounded-b-xl overflow-hidden border-2 border-gray-800 shadow-2xl">
                      <Image
                        src={currentOutput.src}
                        alt={currentOutput.label}
                        width={340}
                        height={340}
                        className="w-full h-auto"
                      />

                      {/* Platform badge */}
                      <div className="absolute top-3 right-3">
                        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/20">
                          <p className="text-white text-xs font-medium">{currentOutput.label}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3">
              {/* Mobile: prev/next buttons. Desktop: counter only */}
              {isMobile ? (
                <>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(() => {
                        setCurrentIndex((prev) => (prev - 1 + outputs.length) % outputs.length);
                        setIsVisible(true);
                      }, 200);
                    }}
                    aria-label="Previous"
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <ArrowRight className="w-3 h-3 text-white/70 rotate-180" />
                  </button>
                  <p className="text-white/60 text-xs" aria-live="polite">
                    {currentIndex + 1} of {outputs.length}
                  </p>
                  <button
                    onClick={() => {
                      setIsVisible(false);
                      setTimeout(() => {
                        setCurrentIndex((prev) => (prev + 1) % outputs.length);
                        setIsVisible(true);
                      }, 200);
                    }}
                    aria-label="Next"
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <ArrowRight className="w-3 h-3 text-white/70" />
                  </button>
                </>
              ) : (
                <p className="text-white/60 text-xs" aria-live="polite">
                  {currentIndex + 1} of {outputs.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
