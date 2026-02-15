'use client';

import { MessageSquare, Video, ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

export function NotChatGPTSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900 relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4FF]/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white">
              Not
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                {' '}ChatGPT
              </span>
            </h2>

            <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
              ChatGPT generates content from prompts. Echo generates content from your videos, filtered through your knowledge base. No prompt engineering required.
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* ChatGPT */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <div className="w-12 h-12 mb-6 bg-white/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white/60" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">ChatGPT</h3>
              <div className="space-y-3 text-white/70">
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-white/40" />
                  You write prompts
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-white/40" />
                  Generic output
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-white/40" />
                  No memory of your style
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-white/40" />
                  Sounds like AI
                </p>
              </div>
            </div>

            {/* EchoMe */}
            <div className="bg-gradient-to-br from-[#00D4FF]/10 to-[#B794F6]/10 border-2 border-[#00D4FF]/30 rounded-2xl p-8">
              <div className="w-12 h-12 mb-6 bg-gradient-to-br from-[#00D4FF] to-[#B794F6] rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">EchoMe</h3>
              <div className="space-y-3 text-white">
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#00D4FF]" />
                  You upload video
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#00D4FF]" />
                  Voice-matched output from your KB
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#00D4FF]" />
                  Learns from everything you've created
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#00D4FF]" />
                  Sounds like you wrote it
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-2xl font-bold text-white mb-2">
              No prompt engineering. No "act like me" instructions.
            </p>
            <p className="text-lg text-white/60">
              Just upload. The system already knows your voice.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
