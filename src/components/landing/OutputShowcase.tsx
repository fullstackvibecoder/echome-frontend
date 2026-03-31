'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Film, LayoutGrid, FileText, Brain, Users, Mic } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const tabs = [
  { id: 'reels', label: 'Reels & Clips', icon: Film },
  { id: 'carousels', label: 'Carousels', icon: LayoutGrid },
  { id: 'content', label: 'Written Content', icon: FileText },
  { id: 'voice', label: 'Your Voice', icon: Brain },
  { id: 'tools', label: 'Creator Tools', icon: Users },
];

interface ShowcaseItem {
  image: string;
  alt: string;
  caption: string;
}

const showcaseData: Record<string, { description: string; items: ShowcaseItem[] }> = {
  reels: {
    description: 'Auto-captioned vertical clips pulled from your video, optimized for Instagram Reels, TikTok, and YouTube Shorts.',
    items: [
      { image: '/showcase/platform/reel-maker.png', alt: 'Reel Maker with split-screen clips and face detection', caption: 'Split-screen clips with face tracking and auto-captions' },
    ],
  },
  carousels: {
    description: 'Square and portrait carousel slides with your face, your words, and your style. Ready to post on Instagram and LinkedIn.',
    items: [
      { image: '/showcase/platform/instagram-carousel.png', alt: 'Instagram carousel with tweet-style and photo-overlay slides', caption: 'Tweet-style and photo-overlay formats, auto-generated from your video' },
    ],
  },
  content: {
    description: 'Platform-specific posts for LinkedIn, Twitter/X, Instagram, TikTok, blog, and email. Each written in your voice.',
    items: [
      { image: '/showcase/platform/written-content.png', alt: 'Written content cards for multiple social platforms', caption: 'One video, six platforms. Every post sounds like you wrote it.' },
      { image: '/showcase/platform/blog-post.png', alt: 'Blog post generator with header image selection', caption: 'Full blog posts with header images, ready to publish' },
    ],
  },
  voice: {
    description: 'Your voice profile is built from your existing content. Connect socials, import writing, or just talk.',
    items: [
      { image: '/showcase/platform/build-voice.png', alt: 'Knowledge base with Connect Socials, Import Writing, and Record Voice', caption: 'Three ways to teach Echo your voice' },
      { image: '/showcase/platform/build-voice-expanded.png', alt: 'Expanded import options including paste, upload, blog, and email', caption: 'Import from YouTube, Instagram, blogs, PDFs, or email exports' },
      { image: '/showcase/platform/record-voice.png', alt: 'Voice recording interface for content generation', caption: 'Speak your idea and Echo creates content from it' },
    ],
  },
  tools: {
    description: 'Follow creators, manage team voices, and access a monthly library of B-roll, templates, and scripts.',
    items: [
      { image: '/showcase/platform/creator-radar.png', alt: 'Following page with creator feeds and repurpose button', caption: 'Follow creators in your space. Repurpose their ideas in your voice.' },
      { image: '/showcase/platform/team-voices.png', alt: 'Team Voices management with multiple voice profiles', caption: 'Manage multiple voice profiles from one account' },
      { image: '/showcase/platform/creator-library.png', alt: 'Creator Library with monthly B-roll, templates, and scripts', caption: 'Monthly B-roll drops, caption templates, and reel scripts' },
    ],
  },
};

export function OutputShowcase() {
  const [activeTab, setActiveTab] = useState('reels');
  const data = showcaseData[activeTab];

  return (
    <AnimatedSection>
      <section id="output-showcase" className="pt-16 pb-32 px-6 bg-gradient-to-b from-secondary via-background to-secondary relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent-purple/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm">Real Platform Screenshots</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 text-foreground leading-tight">
              What You
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                {' '}Actually Get
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              No mockups. These are real screenshots from the EchoMe platform.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap" role="tablist" aria-label="Platform feature examples">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`tabpanel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
                      : 'bg-card text-muted-foreground hover:bg-secondary border border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div
            className="bg-card rounded-2xl border border-border shadow-xl p-6 md:p-10"
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            <div className="max-w-6xl mx-auto space-y-8">
              {data.items.map((item, i) => (
                <div key={item.image} className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all hover:shadow-2xl">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      width={1200}
                      height={700}
                      sizes="(max-width: 768px) 100vw, 1100px"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center font-medium">{item.caption}</p>
                </div>
              ))}

              <p className="text-center text-muted-foreground text-base leading-relaxed pt-4">
                {data.description}
              </p>
            </div>
          </div>

          {/* Mid-page CTA */}
          <div className="text-center mt-16">
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                         rounded-xl font-bold hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 transition-all
                         shadow-lg text-lg group"
            >
              Get Your Content Kit
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="text-sm text-muted-foreground font-light mt-3">
              Upload a video and see the magic - no credit card required
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
