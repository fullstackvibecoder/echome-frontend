'use client';

import Link from 'next/link';
import { ArrowRight, Play, Video } from 'lucide-react';
import { HeroTransformAnimation } from './HeroTransformAnimation';

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900" />

      <div className="max-w-7xl mx-auto py-20 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-8 animate-fade-in">
              <Video className="w-4 h-4 text-[#FF6B9D]" />
              <span className="text-white/90 font-medium text-sm">Video-First Content Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1]">
              <span className="text-white">One Video.</span>
              <br />
              <span className="text-white">One Week of </span>
              <span className="bg-gradient-to-r from-[#00D4FF] via-[#B794F6] to-[#FF6B9D] bg-clip-text text-transparent">
                Content.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
              All in your authentic voice.
            </p>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-medium max-w-xl mx-auto lg:mx-0">
              Upload any video and Echo transforms it into clips, carousels, posts, and emails —
              all matching your unique voice.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white
                           rounded-xl font-bold hover:shadow-2xl hover:shadow-[#00D4FF]/25 hover:scale-105 transition-all
                           shadow-lg text-lg flex items-center gap-2 group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/examples"
                className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20
                           text-white rounded-xl font-bold hover:bg-white/20 transition-all
                           text-lg flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                See It Work
              </Link>
            </div>
          </div>

          {/* Right Column — Animated transformation */}
          <HeroTransformAnimation />
        </div>
      </div>
    </section>
  );
}
