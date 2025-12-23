'use client';

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    avatar: '👩‍💼',
    quote:
      'EchoMe finally makes my content sound like me, not a robot. Game changer.',
  },
  {
    name: 'Marcus Johnson',
    role: 'LinkedIn Influencer',
    avatar: '👨‍💻',
    quote:
      'I went from 2 hours per post to 10 minutes. My engagement is up 3x.',
  },
  {
    name: 'Priya Patel',
    role: 'Startup Founder',
    avatar: '👩‍🚀',
    quote:
      'This is what AI content should be - authentic, personal, and actually helpful.',
  },
];

export function SocialProof() {
  return (
    <section className="py-20 px-6 bg-bg-secondary">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-small text-accent font-semibold uppercase tracking-wide mb-4">
            Trusted by creators
          </p>
          <h2 className="text-subheading text-4xl md:text-5xl mb-4">
            Join 500+ creators already using EchoMe
          </h2>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="card hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Avatar */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-4xl">{testimonial.avatar}</div>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {testimonial.name}
                  </h3>
                  <p className="text-small text-text-secondary">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              {/* Quote */}
              <p className="text-body text-text-secondary italic">
                "{testimonial.quote}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
