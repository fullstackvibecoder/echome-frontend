'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { HeroDemoVideo } from './HeroDemoVideo';

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Dark background */}
      <div className="absolute inset-0 bg-gray-900 pointer-events-none" />

      {/* Ambient background blobs */}
      <div className="absolute top-0 right-0 -z-0 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -z-0 w-[400px] h-[400px] bg-accent-purple/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content Left */}
          <div className="flex flex-col space-y-10">
            <div className="space-y-6">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 opacity-0 animate-fade-in"
                style={{ animationDelay: '0ms' }}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-bold text-xs tracking-widest uppercase">Content Transformation</span>
              </div>

              {/* Headline */}
              <h1
                className="font-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight opacity-0 animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                It Already Knows How{' '}
                <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                  You Think.
                </span>
              </h1>

              {/* Value prop */}
              <p
                className="text-base sm:text-xl text-white/70 leading-relaxed max-w-xl opacity-0 animate-fade-in"
                style={{ animationDelay: '300ms' }}
              >
                Stop starting from zero. EchoMe transforms your raw videos into a full week of social media posts in your unique voice.
              </p>
            </div>

            {/* CTAs */}
            <div
              className="flex flex-wrap items-center gap-6 opacity-0 animate-fade-in"
              style={{ animationDelay: '400ms' }}
            >
              <a
                href="/auth/signup"
                className="px-10 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                           rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all
                           shadow-lg shadow-primary/30 flex items-center gap-3 group"
              >
                Start Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#output-showcase"
                className="px-8 py-4 rounded-full font-bold text-lg text-white hover:bg-white/5 transition-all flex items-center gap-3"
              >
                See Examples
              </a>
            </div>

            {/* Social Proof */}
            <div
              className="flex flex-wrap items-center gap-4 pt-2 opacity-0 animate-fade-in"
              style={{ animationDelay: '500ms' }}
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gradient-to-br from-primary/60 to-accent-purple/60" />
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gradient-to-br from-accent-purple/60 to-primary/60" />
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gradient-to-br from-primary/40 to-accent-purple/80" />
                </div>
                <div className="text-sm">
                  <p className="text-white font-bold">250+ Creators</p>
                  <p className="text-white/50">Scaling their voice effortlessly</p>
                </div>
              </div>
              <a href="https://www.bestin2026.com/articles/echome-review-2026" target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://www.bestin2026.com/api/badge?title=EchoMe&theme=dark" alt="EchoMe - Best in 2026" width={160} height={40} className="opacity-70 hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>

          {/* Visual Right: Video with floating cards */}
          <div
            id="demo"
            className="relative opacity-0 animate-fade-in"
            style={{ animationDelay: '500ms' }}
          >
            <HeroDemoVideo />
          </div>
        </div>
      </div>
    </section>
  );
}
