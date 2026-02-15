'use client';

import Link from 'next/link';
import { ArrowRight, Play, Upload } from 'lucide-react';
import { HeroShowcaseV4 } from './HeroShowcaseV4';

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
            <div
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-8 opacity-0 animate-fade-in"
              style={{ animationDelay: '0ms' }}
            >
              <Upload className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-white/90 font-medium text-sm">For creators who've already made the content</span>
            </div>

            {/* Headline */}
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-[1.1] opacity-0 animate-fade-in"
              style={{ animationDelay: '200ms' }}
            >
              <span className="text-white">Upload a Video.</span>
              <br />
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent">
                Get a Content Kit.
              </span>
            </h1>

            {/* Proof Point Stat */}
            <div
              className="flex items-center justify-center lg:justify-start gap-6 mb-6 opacity-0 animate-fade-in"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#00D4FF]">15</span>
                  <span className="text-lg font-medium text-white/70">pieces</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#B794F6]">3</span>
                  <span className="text-lg font-medium text-white/70">minutes</span>
                </div>
              </div>
            </div>

            {/* Subtitle — mechanical and specific */}
            <p
              className="text-xl md:text-2xl text-gray-300 mb-8 font-light leading-relaxed max-w-xl mx-auto lg:mx-0 opacity-0 animate-fade-in"
              style={{ animationDelay: '500ms' }}
            >
              Drop in any video — Zoom recording, podcast, phone clip, unedited raw footage. In 2–5 minutes: extracted clips with captions, tweet-style carousels, social posts, and a populated content calendar. All matched to your voice using a knowledge base built from your YouTube transcripts, blog posts, sent emails, and voice recordings.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-6 opacity-0 animate-fade-in"
              style={{ animationDelay: '700ms' }}
            >
              <Link
                href="/auth/signup"
                className="px-10 py-5 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white
                           rounded-xl font-bold hover:shadow-2xl hover:shadow-[#00D4FF]/25 hover:scale-105 transition-all
                           shadow-lg text-xl flex items-center gap-2 group w-full sm:w-auto justify-center"
              >
                Start Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#output-showcase"
                className="text-white/80 hover:text-white font-medium text-lg flex items-center gap-2 transition-colors group"
              >
                <Play className="w-5 h-5 text-[#00D4FF] group-hover:scale-110 transition-transform" />
                See Example Output
              </Link>
            </div>

            {/* Trust signal */}
            <p
              className="text-sm text-white/60 font-light max-w-xl mx-auto lg:mx-0 opacity-0 animate-fade-in"
              style={{ animationDelay: '900ms' }}
            >
              → One video becomes a week of content
            </p>
          </div>

          {/* Right Column — Transformation flow */}
          <HeroShowcaseV4 />
        </div>
      </div>
    </section>
  );
}
