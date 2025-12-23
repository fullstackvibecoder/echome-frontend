'use client';

import { useState } from 'react';

export function BottomCTA() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle email submission
    console.log('Email submitted:', email);
  };

  return (
    <section className="relative bg-gradient-to-b from-transparent via-accent/10 to-bg-primary py-20">
      <div className="max-w-[600px] mx-auto px-12 text-center">
        <h2 className="text-section-title mb-6">
          Ready to unmute yourself?
        </h2>

        <p className="text-body text-text-tertiary mb-8">
          Join 12,847 creators who have found their voice
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
            className="flex-1 h-12 px-4 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button type="submit" className="btn-primary">
            Enter Your Echosystem
          </button>
        </form>

        <p className="text-xs text-text-muted mt-4">
          No credit card required. Start for free.
        </p>
      </div>
    </section>
  );
}
