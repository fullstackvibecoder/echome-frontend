'use client';

import { useState } from 'react';

export function VoiceTemperature() {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  const levels = [
    {
      emoji: '❄️',
      label: 'Cold',
      description: 'Just starting. Echo is learning your baseline.',
      uploads: '0-10 uploads',
    },
    {
      emoji: '🌤️',
      label: 'Warming',
      description: 'Echo recognizes your patterns and common phrases.',
      uploads: '11-30 uploads',
    },
    {
      emoji: '☀️',
      label: 'Warm',
      description: 'Echo captures your tone and can mimic your style.',
      uploads: '31-75 uploads',
    },
    {
      emoji: '🔥',
      label: 'Hot',
      description: 'Echo knows your vocabulary, references, and nuances.',
      uploads: '76-150 uploads',
    },
    {
      emoji: '🚀',
      label: 'On Fire',
      description: 'Echo is you. Content is indistinguishable from your writing.',
      uploads: '150+ uploads',
    },
  ];

  return (
    <section className="bg-bg-secondary py-[120px]">
      <div className="max-w-[1200px] mx-auto px-12">
        <div className="text-center mb-12">
          <h2 className="text-section-title mb-4">
            Voice Temperature 🌡️
          </h2>
          <p className="text-lg text-text-tertiary">
            The more you upload, the hotter your voice gets
          </p>
        </div>

        {/* Temperature Scale */}
        <div className="relative mb-16">
          {/* Progress Bar Background */}
          <div className="h-3 bg-bg-primary rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 via-orange-500 to-accent w-full" />
          </div>

          {/* Temperature Levels */}
          <div className="grid grid-cols-5 gap-4">
            {levels.map((level, index) => (
              <div
                key={index}
                className="text-center cursor-pointer transition-all"
                onMouseEnter={() => setActiveLevel(index)}
                onMouseLeave={() => setActiveLevel(null)}
              >
                <div
                  className={`text-5xl mb-2 transition-transform ${
                    activeLevel === index ? 'scale-125' : 'scale-100'
                  }`}
                >
                  {level.emoji}
                </div>
                <div className="text-sm font-bold text-text-primary mb-1">
                  {level.label}
                </div>
                <div className="text-xs text-text-muted">{level.uploads}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Level Description */}
        {activeLevel !== null && (
          <div className="card text-center max-w-[600px] mx-auto animate-fade-in">
            <p className="text-lg text-text-secondary">
              {levels[activeLevel].description}
            </p>
          </div>
        )}

        {/* Supporting Text */}
        <div className="text-center mt-12">
          <p className="text-lg text-text-secondary">
            Your knowledge base grows with every upload ✨
          </p>
        </div>
      </div>
    </section>
  );
}
