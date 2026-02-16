'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, Video, LayoutGrid, FileText, Play } from 'lucide-react';

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

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % outputs.length);
        setIsVisible(true);
      }, 300);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  const currentOutput = outputs[currentIndex];

  const getIcon = () => {
    if (currentOutput.type === 'text') return FileText;
    if (currentOutput.type === 'reel') return Play;
    return LayoutGrid;
  };

  const Icon = getIcon();

  return (
    <div className="relative w-full max-w-5xl mx-auto py-12">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#00D4FF]/5 via-transparent to-[#B794F6]/5 rounded-3xl blur-3xl" />

      <div className="relative flex items-center justify-center gap-8 lg:gap-12">
        {/* Input: Single Video */}
        <div className="relative">
          <div className="relative w-[280px] lg:w-[340px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Input</span>
            </div>

            {/* Video Card */}
            <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <Image
                src="/showcase/new/source-video.png"
                alt="Source video"
                width={340}
                height={227}
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
          <ArrowRight className="w-8 h-8 text-[#00D4FF]" />
        </div>

        {/* Output: Cycling through individual items */}
        <div className="relative">
          <div className="relative w-[280px] lg:w-[340px]">
            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#B794F6] flex items-center justify-center shadow-lg">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium">Content Kit</span>
              <div className="ml-auto px-2 py-1 rounded-md bg-green-500/20 border border-green-500/30">
                <span className="text-green-400 text-xs font-bold">Ready in 2-5 min</span>
              </div>
            </div>

            {/* Output Card - Fixed height container to prevent page jog */}
            <div className="relative" style={{ height: '604px' }}>
              <div
                className={`relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl transition-all duration-300 h-full flex items-center justify-center ${
                  isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              >
                {/* Image */}
                <Image
                  src={currentOutput.src}
                  alt={currentOutput.label}
                  width={340}
                  height={currentOutput.aspect === 'vertical' ? 604 : 340}
                  className="w-full h-auto max-h-full object-contain"
                />

                {/* Subtle corner badge - watermark style */}
                <div className="absolute bottom-2 right-2">
                  <div className="px-2 py-1 rounded bg-black/30 backdrop-blur-sm">
                    <p className="text-white/70 text-[10px] font-medium">{currentOutput.label}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-white/60 text-xs">
                {currentIndex + 1} of {outputs.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
