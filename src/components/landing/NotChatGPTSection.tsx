'use client';

import { X, Check, Sparkles } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const comparisons = [
  {
    label: 'Voice Learning',
    chatgpt: 'Generic voice for everyone',
    echo: 'Learns YOUR voice from YOUR videos',
  },
  {
    label: 'Memory',
    chatgpt: 'No memory of your style',
    echo: 'Knowledge Base with 894+ chunks',
  },
  {
    label: 'Content Source',
    chatgpt: 'You prompt, it guesses',
    echo: 'Analyzes hours of your content',
  },
  {
    label: 'Output Quality',
    chatgpt: 'Sounds like AI every time',
    echo: 'Sounds like YOU wrote it',
  },
  {
    label: 'Improvement',
    chatgpt: 'Starts from zero each time',
    echo: 'Gets better with every video',
  },
];

export function NotChatGPTSection() {
  return (
    <AnimatedSection>
      <section className="py-24 px-6 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00D4FF]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#FF6B9D]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-bold text-white">The Difference</span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-white">
              Why This Isn't
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">
                Just ChatGPT
              </span>
            </h2>

            <p className="text-xl text-gray-300 font-light max-w-2xl mx-auto">
              ChatGPT is a blank slate every time. Echo builds a knowledge base from your content
              and gets better the more you use it.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl mb-12">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/10 bg-white/5">
              <div className="text-white/60 font-semibold text-sm"></div>
              <div className="text-center">
                <p className="text-white font-bold text-lg mb-1">ChatGPT</p>
                <p className="text-white/50 text-xs">Generic AI</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg mb-1 bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                  EchoMe
                </p>
                <p className="text-white/50 text-xs">Video-First Platform</p>
              </div>
            </div>

            {/* Comparison Rows */}
            {comparisons.map((item, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-3 gap-4 p-6 ${
                  idx !== comparisons.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="flex items-center">
                  <p className="text-white/80 font-medium">{item.label}</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-white/60 text-sm text-center">{item.chatgpt}</p>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-white text-sm font-medium text-center">{item.echo}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 md:p-10 text-center">
            <div className="mb-4">
              <div className="flex justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-xl text-white font-light leading-relaxed max-w-3xl mx-auto mb-4">
              "I uploaded 12 of my YouTube videos. Echo wrote a LinkedIn post that my team thought I wrote.
              That's when I knew this was different."
            </p>
            <p className="text-white/60 text-sm">— Sarah Chen, Content Creator with 23 videos uploaded</p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
