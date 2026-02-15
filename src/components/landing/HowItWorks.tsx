'use client';

import { Database, Upload, Sparkles, Calendar } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const steps = [
  {
    num: 1,
    icon: Database,
    title: 'Build Your Knowledge Base',
    desc: 'Upload YouTube channel link, blog URL, sent emails (MBOX), or just talk into the mic. The system ingests your words, tone, and patterns.',
  },
  {
    num: 2,
    icon: Upload,
    title: 'Upload a Video',
    desc: 'Drop in any video. Zoom recording, podcast, phone video, raw and unedited. Up to 5GB.',
  },
  {
    num: 3,
    icon: Sparkles,
    title: 'Get Your Content Kit',
    desc: 'In 2–5 minutes: extracted clips with captions, tweet-style carousels, social posts, blog drafts. All voice-matched.',
  },
  {
    num: 4,
    icon: Calendar,
    title: 'Schedule & Post',
    desc: 'Load everything into the built-in content calendar. Post directly to social platforms. One video becomes a week of content.',
  },
];

export function HowItWorks() {
  return (
    <AnimatedSection>
      <section id="how" className="py-24 px-6 bg-white relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00D4FF]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-[#1C1C1E]">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Four steps. Upload a video, get a full content kit - all matched to your voice.
            </p>
          </div>

          {/* 4-Step Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] rounded-3xl blur-lg opacity-0 group-hover:opacity-15 transition-opacity" />
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                    <div className="w-12 h-12 mb-4 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-bold text-[#00D4FF] mb-2">Step {step.num}</div>
                    <h3 className="text-lg font-bold text-[#1C1C1E] mb-3 leading-tight">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
