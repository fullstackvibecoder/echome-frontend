'use client';

export function WhatMakesDifferent() {
  const differentiators = [
    {
      icon: '🧠',
      title: 'It Learns You First',
      description: 'Other tools use generic AI. Echo builds a neural map of your voice before creating anything. Every upload strengthens your unique profile.',
      benefit: 'Content that sounds like you wrote it. Because Echo learned from you.',
    },
    {
      icon: '🎯',
      title: 'Echosystem™, Not Templates',
      description: 'Templates force you into boxes. Your Echosystem adapts to you. It knows when you are technical vs. casual, passionate vs. analytical. It matches your mood, not a formula.',
      benefit: 'Your voice evolves. So does your Echo.',
    },
    {
      icon: '🚀',
      title: 'Voice Temperature 🌡️',
      description: 'The more you upload, the hotter your Voice Temperature gets. Cold = starting out. On Fire = Echo knows you better than you know yourself. Gamified growth.',
      benefit: 'Turn your knowledge into a competitive advantage.',
    },
  ];

  return (
    <section className="bg-bg-primary py-[120px]">
      <div className="max-w-[1200px] mx-auto px-12">
        <h2 className="text-section-title text-center mb-16">
          What Makes Echo Different 💎
        </h2>

        <div className="space-y-8">
          {differentiators.map((item, index) => (
            <div
              key={index}
              className="card flex flex-col md:flex-row gap-6 items-start animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-5xl flex-shrink-0">{item.icon}</div>
              <div className="flex-1">
                <h3 className="text-2xl font-display font-bold text-text-primary mb-3">
                  {item.title}
                </h3>
                <p className="text-body mb-4">{item.description}</p>
                <p className="text-sm font-bold text-accent">{item.benefit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
