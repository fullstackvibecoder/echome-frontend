'use client';

export function ComparisonSection() {
  const oldWay = [
    { icon: '😫', text: 'Spend 3 hours repurposing one video' },
    { icon: '🤖', text: 'Content sounds like generic AI slop' },
    { icon: '🔁', text: 'Rewrite the same ideas over and over' },
    { icon: '📉', text: 'Burnout from constant content creation' },
  ];

  const echoWay = [
    { icon: '⚡', text: '3 minutes to generate 15+ posts' },
    { icon: '🎯', text: 'Content sounds exactly like you wrote it' },
    { icon: '🧠', text: 'Echo pulls from your entire knowledge base' },
    { icon: '🚀', text: 'Scale your voice without scaling your time' },
  ];

  return (
    <section className="bg-bg-primary py-[120px]">
      <div className="max-w-[1200px] mx-auto px-12">
        <h2 className="text-section-title text-center mb-16">
          Stop Rewriting. Start Repurposing.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Old Way */}
          <div className="card border-2 border-error/30 animate-fade-in">
            <h3 className="text-2xl font-display font-bold text-text-primary mb-6 text-center">
              The Old Way
            </h3>
            <div className="space-y-4">
              {oldWay.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <p className="text-body pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EchoMe Way */}
          <div className="card border-2 border-accent/30 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h3 className="text-2xl font-display font-bold text-text-primary mb-6 text-center">
              The EchoMe Way
            </h3>
            <div className="space-y-4">
              {echoWay.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <p className="text-body pt-1">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
