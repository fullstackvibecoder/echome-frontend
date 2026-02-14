'use client';

import { Youtube, Mail, FileText, Mic, Database } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const sources = [
  {
    icon: Youtube,
    title: 'YouTube Channel',
    desc: 'All your old videos',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: FileText,
    title: 'Blog Posts',
    desc: 'Your writing style',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Mail,
    title: 'Email Inbox',
    desc: 'How you communicate',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: Mic,
    title: 'Voice Memos',
    desc: 'How you speak',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

export function KnowledgeBaseSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-gradient-to-br from-[#00D4FF]/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-[#B794F6]/5 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00D4FF]/10 to-[#B794F6]/10 rounded-full border border-[#00D4FF]/20 mb-6">
              <Database className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-bold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                Your Knowledge Base
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-[#1C1C1E]">
              You've Already Created
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                The Content
              </span>
            </h2>

            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
              Most creators have 20-50+ videos sitting in Drive, YouTube unlisted, Zoom recordings, old webinars.
              That's your content goldmine. Echo turns it into months of posts.
            </p>
          </div>

          {/* Sources Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            {sources.map((source) => (
              <div key={source.title} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF]/20 to-[#B794F6]/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all h-full text-center">
                  <div className={`w-12 h-12 mx-auto ${source.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <source.icon className={`w-6 h-6 ${source.color}`} />
                  </div>
                  <h3 className="font-bold text-[#1C1C1E] mb-1">{source.title}</h3>
                  <p className="text-sm text-gray-500">{source.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 md:p-10">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <p className="text-5xl font-black bg-gradient-to-r from-[#00D4FF] to-[#0099CC] bg-clip-text text-transparent mb-2">
                  47 videos
                </p>
                <p className="text-gray-600 font-light">Average creator library</p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-black bg-gradient-to-r from-[#B794F6] to-[#9F7AEA] bg-clip-text text-transparent mb-2">
                  376 pieces
                </p>
                <p className="text-gray-600 font-light">Content waiting inside</p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-black bg-gradient-to-r from-[#FF6B9D] to-[#FFD93D] bg-clip-text text-transparent mb-2">
                  6 months
                </p>
                <p className="text-gray-600 font-light">Of posting proliferated</p>
              </div>
            </div>
          </div>

          {/* KB Explanation */}
          <div className="mt-12 bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-2xl p-8 md:p-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Your Knowledge Base = Your Voice Engine</h3>
            <p className="text-white/70 max-w-3xl mx-auto leading-relaxed">
              The chunks (pieces of your content) are stored and recalled to influence new outputs.
              That's why Echo sounds like <span className="text-white font-semibold">you</span>, not ChatGPT.
              The more you add, the better it gets.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
