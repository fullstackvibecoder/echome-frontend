'use client';

import { useState, lazy, Suspense } from 'react';
import { Video, LayoutGrid, Brain, Calendar, Users } from 'lucide-react';

// Lazy load animation components for performance
const VideoProcessing = lazy(() => import('@/components/features/echome-video-processing.jsx'));
const CarouselShowcase = lazy(() => import('@/components/features/echome-carousel-showcase.jsx'));
const KnowledgeBase = lazy(() => import('@/components/features/echome-knowledge-base.jsx'));
const ContentCalendar = lazy(() => import('@/components/features/echome-content-calendar.jsx'));
const CreatorRepurposing = lazy(() => import('@/components/features/echome-creator-repurposing.jsx'));

const features = [
  {
    id: 'video-processing',
    label: 'Video Processing',
    icon: Video,
    component: VideoProcessing,
    description: 'Upload → Content Kit pipeline',
  },
  {
    id: 'carousels',
    label: 'Carousels',
    icon: LayoutGrid,
    component: CarouselShowcase,
    description: 'Tweet-style carousel generation',
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    icon: Brain,
    component: KnowledgeBase,
    description: 'Voice ingestion & learning',
  },
  {
    id: 'content-calendar',
    label: 'Content Calendar',
    icon: Calendar,
    component: ContentCalendar,
    description: 'Schedule & publish',
  },
  {
    id: 'creator-following',
    label: 'Creator Following',
    icon: Users,
    component: CreatorRepurposing,
    description: 'Repurpose through your voice',
  },
];

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState('video-processing');

  const activeFeature = features.find((f) => f.id === activeTab);
  const ActiveComponent = activeFeature?.component;

  return (
    <section className="py-32 px-6 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00D4FF]/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-full mb-6">
            <span className="text-[#38bdf8] font-semibold text-sm">Interactive Demo</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 text-[#1C1C1E] leading-tight">
            See It
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
              {' '}In Action
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
            Interactive walkthroughs of every feature. Click any tab to explore.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  activeTab === feature.id
                    ? 'bg-[#0f172a] text-white shadow-lg border border-[#38bdf8]/30'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {feature.label}
              </button>
            );
          })}
        </div>

        {/* Animation Container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-200 bg-[#0f172a]">
          <div className="relative w-full" style={{ height: '80vh', minHeight: '600px' }}>
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[#64748b] text-sm">Loading animation...</p>
                  </div>
                </div>
              }
            >
              {ActiveComponent && <ActiveComponent />}
            </Suspense>
          </div>
        </div>

        {/* Feature Description */}
        {activeFeature && (
          <div className="text-center mt-6">
            <p className="text-gray-600 text-base">
              {activeFeature.description}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
