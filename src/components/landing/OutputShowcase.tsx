'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Video, LayoutGrid, FileText, Calendar, Play } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const tabs = [
  { id: 'clips', label: 'Clips', icon: Video },
  { id: 'carousels', label: 'Carousels', icon: LayoutGrid },
  { id: 'posts', label: 'Social Posts', icon: FileText },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

const realClips = [
  {
    image: '/showcase/instagram-reel.png',
    duration: '0:19',
    caption: 'Vertical reel optimized for Instagram and TikTok',
    badge: '80% viral',
  },
  {
    image: '/showcase/vertical-clip-2.png',
    duration: '0:23',
    caption: 'Tutorial-style clip with text overlay and captions',
    badge: '70% viral',
  },
];

const carouselImages = [
  '/showcase/carousel-square-1.png',
  '/showcase/carousel-square-2.png',
  '/showcase/carousel-1.png',
  '/showcase/twitter-post.png',
];

export function OutputShowcase() {
  const [activeTab, setActiveTab] = useState('clips');
  const [carouselIndex, setCarouselIndex] = useState(0);

  return (
    <AnimatedSection>
      <section id="output-showcase" className="py-32 px-6 bg-gradient-to-b from-gray-50 via-white to-gray-50 relative overflow-hidden">
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
              This is proof, not promise. Here's what comes out of every video you upload.
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-12 min-h-[500px]">
            {activeTab === 'clips' && (
              <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {realClips.map((clip, i) => (
                    <div key={i} className="group relative border border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
                      <div className="relative aspect-[9/16] bg-gray-900">
                        <Image
                          src={clip.image}
                          alt={clip.caption}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur rounded-lg text-white text-xs font-medium">
                          {clip.duration}
                        </div>
                        {clip.badge && (
                          <div className="absolute top-3 left-3 px-3 py-1 bg-[#00D4FF] rounded-full text-white text-xs font-bold">
                            {clip.badge}
                          </div>
                        )}
                      </div>
                      <div className="p-5 bg-gradient-to-b from-white to-gray-50">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {clip.caption}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Additional placeholder clips with different styles */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 bg-gradient-to-br from-[#00D4FF]/5 to-[#B794F6]/5">
                    <div className="aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                      <Video className="w-16 h-16 text-white/30" />
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur rounded-lg text-white text-xs font-medium">
                        0:31
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Key insight extracted with auto-generated captions
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 bg-gradient-to-br from-[#B794F6]/5 to-[#00D4FF]/5">
                    <div className="aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                      <Video className="w-16 h-16 text-white/30" />
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur rounded-lg text-white text-xs font-medium">
                        0:45
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Hook moment identified and trimmed to perfect length
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-center text-gray-500 mt-8 text-sm">
                  Each clip auto-captioned and optimized for vertical platforms
                </p>
              </div>
            )}

            {activeTab === 'carousels' && (
              <div className="max-w-3xl mx-auto">
                <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={carouselImages[carouselIndex]}
                    alt={`Carousel slide ${carouselIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/80 backdrop-blur rounded-full text-white text-sm font-bold">
                    {carouselIndex + 1}/{carouselImages.length}
                  </div>
                </div>
                <div className="flex gap-3 mt-6 justify-center">
                  {carouselImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === carouselIndex ? 'bg-[#00D4FF] w-12' : 'bg-gray-300 w-2'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-center text-gray-500 mt-8 text-base leading-relaxed">
                  Tweet-style carousel posts generated from your video's key points.<br />
                  Ready for LinkedIn, Instagram, and Twitter - no editing required.
                </p>
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="max-w-6xl mx-auto">
                {/* Full Written Content Grid Screenshot */}
                <div className="relative border-2 border-gray-200 rounded-2xl overflow-hidden shadow-2xl bg-white">
                  <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                    <Image
                      src="/showcase/written-content-grid.png"
                      alt="Written content for all platforms"
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <p className="text-lg text-gray-700 font-medium mb-3">
                    Six platforms. One video. Full text content ready to post.
                  </p>
                  <p className="text-gray-500 text-sm leading-relaxed max-w-3xl mx-auto">
                    LinkedIn, Twitter/X, Instagram, TikTok, Blog Post, and Newsletter - all generated with your voice and tone. Each includes a Copy button and Add to Calendar integration for instant scheduling.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg border p-2 text-xs ${
                        i < 5
                          ? 'bg-gradient-to-br from-[#00D4FF]/10 to-[#B794F6]/10 border-[#00D4FF]/30'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {i < 5 && (
                        <div className="flex flex-col gap-0.5 h-full">
                          <div className="flex-1 bg-[#00D4FF]/20 rounded text-[9px] p-0.5 font-medium flex items-center justify-center">
                            Clip
                          </div>
                          <div className="flex-1 bg-[#B794F6]/20 rounded text-[9px] p-0.5 font-medium flex items-center justify-center">
                            Post
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-500 mt-6">
                  One video = 5 days of scheduled content
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
