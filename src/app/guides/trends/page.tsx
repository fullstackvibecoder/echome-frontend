import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trends — What\'s Working in Your Niche | EchoMe Guide',
  description: 'See trending topics and content formats in your niche. Use trends to stay relevant and generate content around what\'s working right now.',
  keywords: ['echome trends', 'content trends', 'trending topics', 'social media trends', 'niche content'],
  alternates: { canonical: 'https://tryechome.com/guides/trends' },
};

export default function TrendsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Trends — What\'s Working in Your Niche',
    description: 'See trending topics and content formats in your niche. Use trends to stay relevant and generate content around what\'s working right now.',
    url: 'https://tryechome.com/guides/trends',
    datePublished: '2026-04-15',
    dateModified: '2026-04-15',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Trends', item: 'https://tryechome.com/guides/trends' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">&larr; All Guides</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Trends &mdash; What&apos;s Working in Your Niche
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Stop guessing what to post. EchoMe Trends shows you what&apos;s working in your niche right now &mdash; trending topics, formats, and inspiration you can turn into content instantly.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          2 min read
        </p>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Go to Trends in the sidebar">
            <p>Open the sidebar and click Trends. You&apos;ll see a live feed of what&apos;s trending in your niche based on platform data.</p>
          </Step>

          <Step number={2} title="See trending topics and formats">
            <p>Browse trending topics and content formats that are performing well right now. Each trend shows you what&apos;s resonating with audiences in your space.</p>
          </Step>

          <Step number={3} title="Click any trend for examples">
            <p>Click into any trend to see examples and inspiration. See how other creators are covering the topic and what formats are getting the most engagement.</p>
          </Step>

          <Step number={4} title="Turn trends into content">
            <p>Use trending topics as input &mdash; paste them into the Create page to generate content around what&apos;s working right now. EchoMe writes it in your voice, so it never feels like you&apos;re copying.</p>
          </Step>
        </section>

        {/* Tip */}
        <div className="mb-10">
          <Tip>Trends are updated regularly based on platform data. Use them to stay relevant without spending hours researching.</Tip>
        </div>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">See what&apos;s trending in your niche.</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free &mdash; 2 Generations</a>
          <p className="text-xs text-text-secondary/70 mt-3">No credit card required.</p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-8 text-center text-xs text-text-secondary">
          <p>Need help? Use the chat widget in the bottom-right corner of any EchoMe page.</p>
        </footer>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
        <div className="text-sm text-text-secondary">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200">
      <strong>Tip:</strong> {children}
    </div>
  );
}
