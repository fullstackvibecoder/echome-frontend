'use client';

export function SocialProof() {
  const stats = [
    {
      value: '12,847',
      label: 'Voices Amplified',
    },
    {
      value: '2.3M+',
      label: 'Echoes Created',
    },
    {
      value: '47min',
      label: 'Saved Per Echo',
    },
  ];

  return (
    <section className="bg-bg-primary py-16">
      <div className="max-w-[1200px] mx-auto px-12">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-text-primary font-karla font-bold text-4xl mb-2">
                {stat.value}
              </div>
              <div className="text-text-muted font-karla text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
