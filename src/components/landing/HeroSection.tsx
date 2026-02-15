'use client';

import Link from 'next/link';
import { ArrowRight, Play, Upload } from 'lucide-react';
import { HeroShowcaseV2 } from './HeroShowcaseV2';

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#1C1C1E] to-gray-900" />

      {/* Single ambient gradient for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D4FF]/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto py-20 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-8 animate-fade-in">
              <Upload className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-white/90 font-medium text-sm">For creators who've already made the content</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1]">
              <span className="text-white">Upload a Video.</span>
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                Get a Content Kit.
              </span>
            </h1>

            {/* Subtitle — mechanical and specific */}
            <p className="text-xl md:text-2xl text-gray-300 mb-8 font-light leading-relaxed max-w-xl mx-auto lg:mx-0">
              Drop in any video — Zoom recording, podcast, phone clip, unedited raw footage. In 2–5 minutes: extracted clips with captions, tweet-style carousels, social posts, and a populated content calendar. All matched to your voice using a knowledge base built from your YouTube transcripts, blog posts, sent emails, and voice recordings.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-6">
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
                href="#how"
                className="px-8 py-4 bg-white/10 backdrop-blur border border-white/20
                           text-white rounded-xl font-bold hover:bg-white/20 transition-all
                           text-lg flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                See It Work
              </Link>
            </div>

            {/* Trust signal */}
            <p className="text-sm text-white/60 font-light max-w-xl mx-auto lg:mx-0">
              → One video becomes a week of content
            </p>
          </div>

          {/* Right Column — Layered showcase */}
          <HeroShowcaseV2 />
        </div>
      </div>
    </section>
  );
}
