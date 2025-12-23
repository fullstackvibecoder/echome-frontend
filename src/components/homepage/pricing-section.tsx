'use client';

import { useState } from 'react';

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  const tiers = [
    {
      name: 'Starter',
      monthlyPrice: 19,
      annualPrice: 16,
      description: 'Perfect for getting started',
      features: [
        '10 uploads per month',
        '50 generated posts',
        'LinkedIn + Twitter',
        'Basic voice learning',
        'Email support',
      ],
    },
    {
      name: 'Creator',
      monthlyPrice: 49,
      annualPrice: 41,
      description: 'For serious content creators',
      badge: 'MOST POPULAR',
      features: [
        '50 uploads per month',
        'Unlimited generated posts',
        'All 6 platforms',
        'Advanced voice learning',
        'Voice Temperature tracking',
        'Priority support',
        'Custom voice profiles',
      ],
    },
    {
      name: 'Studio',
      monthlyPrice: 99,
      annualPrice: 82,
      description: 'For teams and agencies',
      features: [
        'Unlimited uploads',
        'Unlimited posts',
        'All platforms',
        'Multi-user access',
        'Team voice profiles',
        'API access',
        'White-label option',
        'Dedicated support',
      ],
    },
  ];

  return (
    <section id="pricing" className="bg-bg-secondary py-[120px]">
      <div className="max-w-[1200px] mx-auto px-12">
        <h2 className="text-section-title text-center mb-4">
          Your voice, your way 🎨
        </h2>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-body ${!isAnnual ? 'text-text-primary font-bold' : 'text-text-muted'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-7 bg-bg-primary rounded-full transition-colors"
            aria-label="Toggle pricing period"
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-accent rounded-full transition-transform ${
                isAnnual ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-body ${isAnnual ? 'text-text-primary font-bold' : 'text-text-muted'}`}>
            Annual
          </span>
          {isAnnual && (
            <span className="text-sm font-bold text-accent">SAVE 17%</span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`card relative ${
                tier.badge ? 'border-2 border-accent' : ''
              } animate-fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {tier.badge && (
                <div className="absolute top-4 right-4 text-xs font-bold text-accent uppercase">
                  {tier.badge}
                </div>
              )}

              <h3 className="text-2xl font-display font-bold text-text-primary mb-2">
                {tier.name}
              </h3>

              <p className="text-small text-text-muted mb-6">{tier.description}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-display font-bold text-text-primary">
                    ${isAnnual ? tier.annualPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-sm text-text-muted">/month</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-text-tertiary mt-1">
                    Billed annually (${tier.annualPrice * 12}/year)
                  </p>
                )}
              </div>

              <button className="btn-primary w-full mb-6">
                Get Started
              </button>

              <div className="space-y-3">
                {tier.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-accent flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-body text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
