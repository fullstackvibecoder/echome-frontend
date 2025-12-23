'use client';

const features = [
  {
    icon: '🎯',
    title: 'Your Voice, Learned',
    description:
      'Train EchoMe on your content. We learn your tone, style, and unique voice.',
  },
  {
    icon: '⚡',
    title: 'Generate in Seconds',
    description:
      'Turn one idea into 6 platform-ready posts. Instagram, LinkedIn, blog, email, and more.',
  },
  {
    icon: '✨',
    title: 'Actually Sounds Like You',
    description:
      'Not generic AI slop. Real content that matches your personality and expertise.',
  },
  {
    icon: '🔗',
    title: 'Connect Everything',
    description:
      'Sync your YouTube, Instagram, LinkedIn. We learn from what you have already created.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-bg-primary">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-small text-accent font-semibold uppercase tracking-wide mb-4">
            How it works
          </p>
          <h2 className="text-subheading text-4xl md:text-5xl mb-4">
            Content that actually sounds like you
          </h2>
          <p className="text-body text-text-secondary max-w-2xl mx-auto">
            Stop spending hours creating content. Let EchoMe learn your voice and
            generate authentic posts in seconds.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center group hover:scale-105 transition-transform duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="font-display font-semibold text-xl mb-3 text-text-primary">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-body text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Visual Example (Optional placeholder) */}
        <div className="mt-16 p-8 bg-bg-secondary rounded-xl">
          <div className="aspect-video bg-gradient-to-br from-accent/20 to-accent-light/20 rounded-lg flex items-center justify-center">
            <p className="text-text-secondary text-lg">
              [ Demo Video or Screenshot Placeholder ]
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
