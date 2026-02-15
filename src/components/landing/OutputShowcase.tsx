'use client';

import { useState } from 'react';
import { Video, LayoutGrid, FileText, Calendar } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const tabs = [
  { id: 'clips', label: 'Clips', icon: Video },
  { id: 'carousels', label: 'Carousels', icon: LayoutGrid },
  { id: 'posts', label: 'Social Posts', icon: FileText },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

const mockClips = [
  {
    duration: '0:32',
    caption: 'The biggest mistake I see creators make with content repurposing',
  },
  {
    duration: '0:47',
    caption: 'Why your knowledge base makes all the difference in output quality',
  },
  {
    duration: '0:23',
    caption: 'Three platforms you should be posting to daily (and how Echo handles it)',
  },
];

const carouselSlides = [
  {
    title: 'The Problem',
    content: 'You have 47 videos sitting in Drive. Zero social posts this week.',
  },
  {
    title: 'The Solution',
    content: 'Upload one video. Get clips, carousels, and posts - all in your voice.',
  },
  {
    title: 'How It Works',
    content: 'Your knowledge base (YouTube, blog, emails) trains the system to write like you.',
  },
];

export function OutputShowcase() {
  const [activeTab, setActiveTab] = useState('clips');
  const [carouselIndex, setCarouselIndex] = useState(0);

  return (
    <AnimatedSection>
      <section id="output-showcase" className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00D4FF]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-[#1C1C1E]">
              What You
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                {' '}Actually Get
              </span>
            </h2>

            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 min-h-[400px]">
            {activeTab === 'clips' && (
              <div className="grid md:grid-cols-3 gap-6">
                {mockClips.map((clip, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-white text-xs font-medium">
                        {clip.duration}
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#00D4FF]/80 backdrop-blur rounded text-white text-xs font-bold">
                        Clip {i + 1}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        "{clip.caption}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'carousels' && (
              <div className="max-w-2xl mx-auto">
                <div className="aspect-square bg-white rounded-xl border-2 border-gray-200 p-12 flex flex-col items-center justify-center text-center relative">
                  <div className="mb-6">
                    <span className="text-sm font-bold text-[#00D4FF]">
                      {carouselIndex + 1}/{carouselSlides.length}
                    </span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-[#1C1C1E] mb-6">
                    {carouselSlides[carouselIndex].title}
                  </h3>
                  <p className="text-lg text-gray-600 leading-relaxed max-w-md">
                    {carouselSlides[carouselIndex].content}
                  </p>
                  <div className="flex gap-2 mt-8">
                    {carouselSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCarouselIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          idx === carouselIndex ? 'bg-[#00D4FF] w-8' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">
                  Each slide extracted from your video's key points. Ready for LinkedIn, Instagram, Twitter.
                </p>
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded bg-[#0077B5] flex items-center justify-center text-white text-xs font-bold">
                      in
                    </div>
                    <span className="text-sm font-semibold text-gray-700">LinkedIn</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Most people think they need to create new content every day.
                    <br /><br />
                    That's backwards.
                    <br /><br />
                    I upload one video per week. My system generates:
                    <br />
                    → 5 short clips with captions
                    <br />
                    → 3 carousel posts
                    <br />
                    → 7 social captions
                    <br />
                    → 2 blog drafts
                    <br /><br />
                    All filtered through my knowledge base so they sound like me.
                    <br /><br />
                    One video = a week of content.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white text-xs font-bold">
                      IG
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Instagram</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Stop trying to "sound like yourself" in prompts. It doesn't work.
                    <br /><br />
                    Here's what actually works:
                    <br /><br />
                    ✅ Build a knowledge base from your existing content
                    <br />
                    ✅ Upload new videos as you create them
                    <br />
                    ✅ Get output that's already voice-matched
                    <br /><br />
                    No prompt engineering. No "act like me" instructions.
                    <br /><br />
                    The system already knows your voice.
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
