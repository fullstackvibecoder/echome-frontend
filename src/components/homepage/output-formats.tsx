'use client';

export function OutputFormats() {
  const formats = [
    {
      platform: 'LinkedIn Post',
      icon: '💼',
      format: '1,200 characters, professional tone',
      stat: '3.2x more engagement',
    },
    {
      platform: 'Twitter Thread',
      icon: '🐦',
      format: '8-tweet thread, punchy style',
      stat: '5x more retweets',
    },
    {
      platform: 'Instagram Caption',
      icon: '📸',
      format: '220 characters + 15 hashtags',
      stat: '2.1x more saves',
    },
    {
      platform: 'Blog Post',
      icon: '📝',
      format: '800-1,500 words, SEO-optimized',
      stat: '67% faster publishing',
    },
    {
      platform: 'YouTube Description',
      icon: '📺',
      format: 'Timestamped, keyword-rich',
      stat: '41% more clicks',
    },
    {
      platform: 'Email Newsletter',
      icon: '✉️',
      format: '400-600 words, CTA-driven',
      stat: '29% higher open rate',
    },
  ];

  return (
    <section className="bg-bg-secondary py-[120px]">
      <div className="max-w-[1200px] mx-auto px-12">
        <div className="text-center mb-12">
          <h2 className="text-section-title mb-4">
            Then the magic happens ✨
          </h2>
          <p className="text-lg text-text-tertiary">
            One Video Becomes All of This
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {formats.map((format, index) => (
            <div
              key={index}
              className="card animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="text-4xl mb-3">{format.icon}</div>
              <h3 className="text-xl font-display font-bold text-text-primary mb-2">
                {format.platform}
              </h3>
              <p className="text-body text-sm mb-3">{format.format}</p>
              <p className="text-sm font-bold text-accent">{format.stat}</p>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-border">
          {[
            { value: '1', label: 'Video Input' },
            { value: '6', label: 'Content Formats' },
            { value: '15+', label: 'Platform Posts' },
            { value: '3min', label: 'Processing' },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl font-display font-bold text-accent mb-2">
                {stat.value}
              </div>
              <div className="text-small text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
