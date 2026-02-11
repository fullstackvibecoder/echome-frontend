'use client';

import { ArrowRight } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const steps = [
  {
    num: 1,
    title: 'Upload',
    desc: 'Drop in any video, podcast, or document.',
    gradient: 'from-[#FF6B9D] to-[#FFD93D]',
  },
  {
    num: 2,
    title: 'Echo Processes',
    desc: 'AI matches your voice and creates content.',
    gradient: 'from-[#B794F6] to-[#9F7AEA]',
  },
  {
    num: 3,
    title: 'Get Your Kit',
    desc: 'Clips, carousels, posts — ready to publish.',
    gradient: 'from-[#00D4FF] to-[#0099CC]',
  },
];

export function HowItWorks() {
  return (
    <AnimatedSection>
      <section id="how" className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[#00D4FF]/5 to-[#B794F6]/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-[#1C1C1E]">
              Video In.
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                {' '}Content Kit Out.
              </span>
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
              Upload once. Echo extracts highlights, generates platform-native content, and matches your voice automatically.
            </p>
          </div>

          {/* 3-Step Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {steps.map((step) => (
              <div key={step.num} className="relative group">
                <div className={`absolute -inset-1 bg-gradient-to-r ${step.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity`} />
                <div className="relative bg-white rounded-2xl p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all h-full text-center">
                  <div
                    className={`w-14 h-14 mx-auto bg-gradient-to-br ${step.gradient} rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg mb-5`}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Time Savings Bar */}
          <div className="bg-gradient-to-r from-[#1C1C1E] to-[#2a2a2c] rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-white mb-2">From Hours to Minutes</h3>
                <p className="text-white/60">What used to take 10+ hours now happens automatically.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-400 line-through">10hrs</p>
                  <p className="text-xs text-white/50">Manual work</p>
                </div>
                <ArrowRight className="w-6 h-6 text-[#00D4FF]" />
                <div className="text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">5min</p>
                  <p className="text-xs text-white/50">With Echo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
