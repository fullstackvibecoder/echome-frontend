'use client';

import Link from 'next/link';

export function CTASection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-bg-primary to-bg-secondary">
      <div className="max-w-4xl mx-auto text-center">
        {/* Headline */}
        <h2 className="text-subheading text-4xl md:text-5xl mb-6">
          Ready to create content that sounds like{' '}
          <span className="text-accent">you</span>?
        </h2>

        {/* Subtext */}
        <p className="text-body text-text-secondary mb-8 max-w-2xl mx-auto">
          Join hundreds of creators who've stopped sounding like AI and started
          sounding like themselves.
        </p>

        {/* CTA Button */}
        <Link href="/auth/signup" className="btn-primary text-lg px-8 py-4 inline-block">
          Start for Free
        </Link>

        <p className="text-small text-text-secondary mt-4">
          No credit card required • Free forever plan
        </p>
      </div>
    </section>
  );
}
