'use client';

import { Youtube, Link2, Mail, Mic } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const sources = [
  {
    icon: Youtube,
    title: 'YouTube Channel',
    desc: 'Paste your channel link. Every old video gets transcribed and indexed.',
  },
  {
    icon: Link2,
    title: 'Blog / Website',
    desc: 'Paste your URL. All published writing gets pulled in.',
  },
  {
    icon: Mail,
    title: 'Sent Emails (MBOX)',
    desc: 'Export from Gmail via takeout.google.com. Your writing patterns, word choices, tone.',
  },
  {
    icon: Mic,
    title: 'Voice Recording',
    desc: 'Hit record in the app. Just talk. The system transcribes and stores it.',
  },
];

export function KnowledgeBaseSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#00D4FF]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-[#1C1C1E]">
              How Echo Learns
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                {' '}Your Voice
              </span>
            </h2>

            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
              Upload your past content. Echo indexes your words, tone, and patterns to build a voice model. The more you add, the better it sounds like you.
            </p>
          </div>

          {/* Sources Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {sources.map((source) => (
              <div key={source.title} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all h-full">
                  <div className="w-12 h-12 mb-4 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center">
                    <source.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-[#1C1C1E] mb-2 text-lg">{source.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{source.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* KB Explanation */}
          <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-2xl p-8 md:p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">What Are "Chunks"?</h3>
            <p className="text-white/70 max-w-3xl mx-auto leading-relaxed text-lg">
              Pieces of your past content that get recalled when generating new output. That's why Echo sounds like <span className="text-white font-semibold">you</span>, not a template.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
