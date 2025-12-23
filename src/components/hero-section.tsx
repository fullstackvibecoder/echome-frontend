'use client';

import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center px-6 py-24 bg-gradient-to-b from-bg-secondary to-bg-primary">
      <div className="max-w-5xl mx-auto text-center animate-fade-in">
        {/* Headline */}
        <h1 className="text-display text-6xl md:text-7xl lg:text-8xl mb-6">
          Content, in{' '}
          <span className="text-accent">your voice</span>
        </h1>

        {/* Subheading */}
        <p className="text-subheading text-xl md:text-2xl text-text-secondary mb-8 max-w-3xl mx-auto">
          Stop sounding like ChatGPT.{' '}
          <span className="text-text-primary font-semibold">
            Start sounding like you.
          </span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4">
            Start Creating
          </Link>
          <button className="btn-secondary text-lg px-8 py-4">
            Watch Demo
          </button>
        </div>

        {/* Social Proof */}
        <p className="text-small text-text-secondary">
          Join <span className="font-semibold text-accent">500+</span> creators
          already using EchoMe
        </p>
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-light/10 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
}
