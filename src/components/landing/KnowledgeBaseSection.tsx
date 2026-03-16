'use client';

import { Youtube, Link2, Mail, Mic } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const sources = [
  {
    icon: Youtube,
    title: 'YouTube Channel',
    desc: 'Paste a link. Your back catalog gets transcribed and indexed.',
  },
  {
    icon: Link2,
    title: 'Blog / Website',
    desc: 'Paste a URL. Published writing gets pulled in automatically.',
  },
  {
    icon: Mail,
    title: 'Sent Emails',
    desc: 'Export from Gmail. Your real writing patterns, word choices, tone.',
  },
  {
    icon: Mic,
    title: 'Voice Recording',
    desc: 'Just talk. The system transcribes and stores it.',
  },
];

export function KnowledgeBaseSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-foreground">
              The Context
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                {' '}Behind Your Voice
              </span>
            </h2>

            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
              You&apos;ve already created the content. Echo reads it, indexes your language and ideas, and uses that context every time it writes for you.
            </p>
          </div>

          {/* Sources Grid - 2x2 for visual differentiation */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {sources.map((source) => (
              <div key={source.title} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent-purple/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all h-full">
                  <div className="w-12 h-12 mb-4 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center">
                    <source.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{source.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{source.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* KB Explanation */}
          <div className="bg-gradient-to-r from-foreground to-foreground rounded-2xl p-8 md:p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Why Does It Sound Like You?</h3>
            <p className="text-white/70 max-w-3xl mx-auto leading-relaxed text-lg">
              Every generation pulls from pieces of your actual writing. Your ideas, your phrasing, your perspective. That&apos;s the difference between content <span className="text-white font-semibold">from</span> you and content <span className="text-white font-semibold">about</span> you.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
