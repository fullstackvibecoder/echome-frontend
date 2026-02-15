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

export function OutputShowcase() {
  const [activeTab, setActiveTab] = useState('clips');

  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
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
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-white text-xs">
                        0:{15 + i * 5}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-600 font-medium line-clamp-2">
                        "The key insight from this section is..."
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'carousels' && (
              <div className="max-w-md mx-auto">
                <div className="aspect-square bg-gradient-to-br from-[#00D4FF]/20 to-[#B794F6]/20 rounded-xl border-2 border-gray-200 p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 mb-4 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center">
                    <LayoutGrid className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#1C1C1E] mb-4">
                    Tweet-Style Carousel
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Each carousel slide extracted from your video's key points. Ready for LinkedIn, Instagram, Twitter.
                  </p>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded bg-[#0077B5] flex items-center justify-center text-white text-xs font-bold">
                      in
                    </div>
                    <span className="text-sm font-semibold text-gray-700">LinkedIn</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    "Here's the one thing most people miss about [topic]...
                    <br /><br />
                    I just recorded a deep-dive on this. Here are the 3 key insights:
                    <br /><br />
                    1. [Point one]
                    <br />
                    2. [Point two]
                    <br />
                    3. [Point three]"
                  </p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white text-xs font-bold">
                      IG
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Instagram</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    "Most creators do this backwards 🚫
                    <br /><br />
                    Here's what actually works:
                    <br /><br />
                    ✅ [Strategy]
                    <br />
                    ✅ [Tactic]
                    <br />
                    ✅ [Result]
                    <br /><br />
                    Full breakdown in today's video."
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
                          <div className="flex-1 bg-[#00D4FF]/20 rounded text-[9px] p-0.5 font-medium">
                            Clip
                          </div>
                          <div className="flex-1 bg-[#B794F6]/20 rounded text-[9px] p-0.5 font-medium">
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
