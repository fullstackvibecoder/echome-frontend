'use client';

import Link from 'next/link';
import { ArrowRight, Database, Upload, Sparkles, Calendar } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const steps = [
  {
    num: 1,
    icon: Database,
    title: 'Give It Your History',
    desc: 'Drop in a YouTube link, blog URL, email export, or just talk. The system reads your words, tone, and patterns.',
  },
  {
    num: 2,
    icon: Upload,
    title: 'Drop a Video',
    desc: 'Any video. Zoom call, podcast, phone recording, raw and unedited. Up to 5GB.',
  },
  {
    num: 3,
    icon: Sparkles,
    title: 'Get a Content Kit',
    desc: 'Clips, captions, carousels, social posts, blog drafts. All grounded in your voice and your ideas.',
  },
  {
    num: 4,
    icon: Calendar,
    title: 'Post It',
    desc: 'Everything goes into a content calendar. One video, a week of content, all yours.',
  },
];

export function HowItWorks() {
  return (
    <AnimatedSection>
      <section id="how" className="py-24 px-6 bg-white relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Four steps. Your history goes in, your content comes out.
            </p>
          </div>

          {/* 4-Step Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent-purple rounded-3xl blur-lg opacity-0 group-hover:opacity-15 transition-opacity" />
                  <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full">
                    <div className="w-12 h-12 mb-4 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-bold text-primary mb-2">Step {step.num}</div>
                    <h3 className="text-lg font-bold text-foreground mb-3 leading-tight">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mid-page CTA */}
          <div className="text-center mt-16">
            <a
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                         rounded-xl font-bold hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 transition-all
                         shadow-lg text-lg group"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="text-sm text-gray-500 font-light mt-3">
              No credit card. 2 free generations.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
