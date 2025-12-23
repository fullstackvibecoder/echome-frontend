'use client';

export function HeroSection() {
  return (
    <section className="relative min-h-[700px] bg-gradient-to-b from-bg-primary to-bg-secondary">
      <div className="max-w-[1200px] mx-auto px-12 py-[120px] flex flex-col items-center justify-center text-center">
        {/* Headline */}
        <h1 className="text-hero mb-6 animate-fade-in">
          Unmute Yourself.
        </h1>

        {/* Subheading */}
        <p className="text-subheading max-w-[700px] mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          Your voice has been trapped in videos, locked in audio files, buried in thoughts. Not anymore. Turn everything you know into content that sounds like you—because it learns from you.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <button className="btn-primary">
            Enter Your Echosystem
          </button>
          <button className="btn-secondary">
            See Echo in Action (45s)
          </button>
        </div>

        {/* Optional Video Placeholder */}
        <div className="w-full max-w-[800px] aspect-video bg-bg-secondary border border-border rounded-lg flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
            <p className="text-small text-text-muted">Watch the 45-second demo</p>
          </div>
        </div>
      </div>
    </section>
  );
}
