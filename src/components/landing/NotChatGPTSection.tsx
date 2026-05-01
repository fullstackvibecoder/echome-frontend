'use client';

import { MessageSquare, Video, ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';
import { SectionCTA } from './SectionCTA';

export function NotChatGPTSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 relative overflow-hidden">
        {/* Single subtle gradient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          {/* Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white">
              Not
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                {' '}ChatGPT
              </span>
            </h2>

            <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed">
              ChatGPT writes from prompts. Echo writes from context - your history, your voice, your ideas. No prompt engineering. No &ldquo;act like me&rdquo; instructions.
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* ChatGPT - muted */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-2xl p-8 opacity-80">
              <div className="w-12 h-12 mb-6 bg-white/5 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white/40" />
              </div>
              <h3 className="text-xl font-bold text-white/70 mb-4">ChatGPT</h3>
              <div className="space-y-3 text-white/50 text-sm">
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  You write prompts
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  Generic output
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  No memory of your style
                </p>
                <p className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  Sounds like AI
                </p>
              </div>
            </div>

            {/* EchoMe - highlighted winner */}
            <div className="relative bg-gradient-to-br from-primary/15 to-accent-purple/15 border-2 border-primary/40 rounded-2xl p-8 shadow-[0_0_40px_-10px_rgba(0,212,255,0.3)]">
              <div className="w-14 h-14 mb-6 bg-gradient-to-br from-primary to-accent-purple rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Video className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">EchoMe</h3>
              <div className="space-y-3 text-white">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </span>
                  You give it your work
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </span>
                  Output grounded in your history
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </span>
                  Learns from everything you&apos;ve created
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-3 h-3 text-primary" />
                  </span>
                  Sounds like you wrote it
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-2xl font-bold text-white mb-2">
              The system already knows your voice.
            </p>
            <p className="text-lg text-white/60 mb-8">
              Upload your work. It handles the rest.
            </p>
            <SectionCTA headline="" buttonText="Start Free" trust="5 free generations. No credit card." />
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
