'use client';

export function InputMethods() {
  const methods = [
    {
      icon: '🎥',
      title: 'Video Upload',
      description: 'Upload any video. YouTube links, screen recordings, client calls, tutorials. Echo transcribes, analyzes your tone, cadence, and word choice.',
      benefit: 'Your voice, captured forever',
      stat: 'Avg. 15min video = 3,000 words learned',
    },
    {
      icon: '🎙️',
      title: 'Voice Notes',
      description: 'Record a quick thought. A 2-minute ramble becomes a polished LinkedIn post, Twitter thread, or blog outline—all in your voice.',
      benefit: 'From brain to content, instantly',
      stat: 'Avg. 2min recording = 5 posts',
    },
    {
      icon: '📥',
      title: 'Import Existing Content',
      description: 'Sync YouTube, LinkedIn, your blog. Echo analyzes everything you have already created and learns your style from years of your work.',
      benefit: 'Your entire archive, weaponized',
      stat: '100 posts = Voice Temperature 🔥',
    },
  ];

  return (
    <section id="features" className="bg-bg-primary py-[120px]">
      <div className="max-w-[1200px] mx-auto px-12">
        <h2 className="text-section-title text-center mb-16">
          Three ways in 🎯 One voice out 🚀
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {methods.map((method, index) => (
            <div
              key={index}
              className="card animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-5xl mb-4">{method.icon}</div>
              <h3 className="text-card-title mb-3">{method.title}</h3>
              <p className="text-body mb-4">{method.description}</p>
              <p className="text-sm font-bold text-accent mb-2">{method.benefit}</p>
              <p className="text-small text-text-tertiary">{method.stat}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
