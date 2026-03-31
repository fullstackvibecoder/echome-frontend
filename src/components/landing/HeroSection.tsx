'use client';

import { ArrowRight, Play, Upload } from 'lucide-react';
import { HeroDemoVideo } from './HeroDemoVideo';

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 pointer-events-none" />

      {/* Single ambient gradient for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto pt-24 pb-16 w-full relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-6 opacity-0 animate-fade-in"
            style={{ animationDelay: '0ms' }}
          >
            <Upload className="w-4 h-4 text-primary" />
            <span className="text-white/90 font-medium text-sm">For creators who already have a body of work</span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-4 leading-[1.1] opacity-0 animate-fade-in"
            style={{ animationDelay: '200ms' }}
          >
            <span className="text-white">It Already Knows</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
              How You Think.
            </span>
          </h1>

          {/* One-line value prop */}
          <p
            className="text-lg md:text-xl text-white/80 font-light mb-8 max-w-2xl opacity-0 animate-fade-in"
            style={{ animationDelay: '300ms' }}
          >
            EchoMe reads your past content, learns your voice, and generates new work that sounds like it came from you.
          </p>

          {/* CTAs - ABOVE the demo */}
          <div
            className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-3 opacity-0 animate-fade-in"
            style={{ animationDelay: '400ms' }}
          >
            <a
              href="/auth/signup"
              className="px-10 py-5 bg-gradient-to-r from-primary to-primary-dark text-white
                         rounded-xl font-bold hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 transition-all
                         shadow-lg text-xl flex items-center gap-2 group w-full sm:w-auto justify-center"
            >
              Start Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#demo"
              className="text-white/80 hover:text-white font-medium text-lg flex items-center gap-2 transition-colors group"
            >
              <Play className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              Watch Demo
            </a>
          </div>

          {/* Trust signal - right under CTA */}
          <p
            className="text-sm text-white/70 font-normal mb-10 opacity-0 animate-fade-in"
            style={{ animationDelay: '500ms' }}
          >
            No credit card. 2 free generations.
          </p>

          {/* Social proof bar */}
          <div
            className="flex flex-wrap items-center justify-center gap-6 mb-10 opacity-0 animate-fade-in"
            style={{ animationDelay: '550ms' }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur border border-white/15 rounded-full">
              <span className="text-primary font-bold text-base">Context-aware</span>
              <span className="text-white/80 text-base">not prompt-driven</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur border border-white/15 rounded-full">
              <span className="text-accent-purple font-bold text-base">Your voice</span>
              <span className="text-white/80 text-base">not generic AI</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur border border-white/15 rounded-full">
              <span className="text-primary font-bold text-base">Learns</span>
              <span className="text-white/80 text-base">from what you&apos;ve already made</span>
            </div>
          </div>

          {/* Product Demo Video */}
          <div id="demo" className="w-full opacity-0 animate-fade-in" style={{ animationDelay: '600ms' }}>
            <HeroDemoVideo />
          </div>
        </div>
      </div>
    </section>
  );
}
