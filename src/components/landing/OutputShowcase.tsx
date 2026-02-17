'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Video, LayoutGrid, FileText } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const tabs = [
  { id: 'reels', label: 'Viral Reels', icon: Video },
  { id: 'carousels', label: 'Carousels', icon: LayoutGrid },
  { id: 'posts', label: 'Social Posts', icon: FileText },
];

const viralReels = [
  { image: '/showcase/new/viral-reel-1.png', label: 'Reel 1' },
  { image: '/showcase/new/viral-reel-2.png', label: 'Reel 2' },
  { image: '/showcase/new/viral-reel-3.png', label: 'Reel 3' },
  { image: '/showcase/new/viral-reel-4.png', label: 'Reel 4' },
];

const tweetCarousels = [
  { image: '/showcase/new/tweet-carousel-1.png', label: 'Tweet Style Slide 1' },
  { image: '/showcase/new/tweet-carousel-2.png', label: 'Tweet Style Slide 2' },
  { image: '/showcase/new/tweet-carousel-3.png', label: 'Tweet Style Slide 3' },
];

const bgCarousels = [
  { image: '/showcase/new/bg-carousel-1.png', label: 'Custom Background Slide 1' },
  { image: '/showcase/new/bg-carousel-2.png', label: 'Custom Background Slide 2' },
  { image: '/showcase/new/bg-carousel-3.png', label: 'Custom Background Slide 3' },
];

export function OutputShowcase() {
  const [activeTab, setActiveTab] = useState('reels');

  return (
    <AnimatedSection>
      <section id="output-showcase" className="pt-16 pb-32 px-6 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#00D4FF]/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#B794F6]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#00D4FF]/10 border border-[#00D4FF]/20 rounded-full mb-6">
              <span className="text-[#00D4FF] font-semibold text-sm">Real Examples</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 text-[#1C1C1E] leading-tight">
              What You
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                {' '}Actually Get
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
              Real product output. No mockups. This is what comes out of every video you upload.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 md:p-12">
            {activeTab === 'reels' && (
              <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {viralReels.map((reel, i) => (
                    <div key={i} className="group relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#00D4FF]/30 transition-all hover:shadow-2xl hover:-translate-y-1">
                      <Image
                        src={reel.image}
                        alt={reel.label}
                        width={300}
                        height={533}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-center text-gray-600 mt-8 text-base leading-relaxed">
                  Vertical reels with auto-generated captions, optimized for Instagram, TikTok, and YouTube Shorts.
                </p>
              </div>
            )}

            {activeTab === 'carousels' && (
              <div className="max-w-6xl mx-auto space-y-12">
                {/* Tweet Style Carousels */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Tweet Style</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {tweetCarousels.map((carousel, i) => (
                      <div key={i} className="group relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#B794F6]/30 transition-all hover:shadow-2xl hover:-translate-y-1">
                        <Image
                          src={carousel.image}
                          alt={carousel.label}
                          width={400}
                          height={400}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Background Carousels */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Custom Backgrounds</h3>
                  <div className="grid grid-cols-3 gap-6">
                    {bgCarousels.map((carousel, i) => (
                      <div key={i} className="group relative rounded-xl overflow-hidden border-2 border-gray-200 hover:border-[#00D4FF]/30 transition-all hover:shadow-2xl hover:-translate-y-1">
                        <Image
                          src={carousel.image}
                          alt={carousel.label}
                          width={400}
                          height={400}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-gray-600 text-base leading-relaxed">
                  Multi-slide carousel posts ready for LinkedIn, Instagram, and Twitter. Choose tweet-style or custom backgrounds.
                </p>
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="max-w-6xl mx-auto">
                {/* Real Product UI Screenshot */}
                <div className="relative border-2 border-gray-200 rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="/showcase/new/text-content-output.png"
                    alt="Text content for all platforms"
                    width={1200}
                    height={600}
                    className="w-full h-auto"
                  />
                </div>
                <div className="mt-8 text-center">
                  <p className="text-lg text-gray-700 font-medium mb-3">
                    Six platforms. One video. Full text content ready to post.
                  </p>
                  <p className="text-gray-600 text-base leading-relaxed max-w-3xl mx-auto">
                    LinkedIn, Twitter/X, Instagram, TikTok, Blog Post, and Newsletter—all generated with your voice and tone. Each includes a Copy button and Add to Calendar integration.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
