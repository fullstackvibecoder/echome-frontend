'use client';

import { UserPlus, Bell, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const steps = [
  {
    icon: UserPlus,
    title: 'Follow Creators',
    desc: 'Add creators you follow or respect. Same industry, same thinking.',
  },
  {
    icon: Bell,
    title: 'Get Notified',
    desc: 'When they post new video content, it shows up in your Creator Radar feed.',
  },
  {
    icon: Sparkles,
    title: 'Hit Repurpose',
    desc: 'EchoMe generates a full content kit from their video, filtered through your knowledge base.',
  },
  {
    icon: MessageSquare,
    title: 'Your Voice, Not Theirs',
    desc: 'The output uses your voice, your style, your framing. Same ideas, your words.',
  },
];

export function CreatorRadarSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-purple/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground">
              Turn Other People's Ideas
              <br />
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                Into Your Content
              </span>
            </h2>

            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
              Follow creators in your space. Repurpose their videos through your voice. It's idea synthesis at scale, not plagiarism.
            </p>
          </div>

          {/* Flow Grid with connecting arrows */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative flex items-center">
                  <div className="flex-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="w-12 h-12 mb-4 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-md">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2 text-lg">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center px-2">
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clarification Box */}
          <div className="bg-gradient-to-r from-primary/10 to-accent-purple/10 border border-primary/20 rounded-2xl p-8 text-center">
            <p className="text-2xl font-bold text-foreground mb-2">
              Same ideas, your words. Always.
            </p>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              You're not copying their content. You're synthesizing their ideas through your knowledge base, creating original output that sounds like you.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
