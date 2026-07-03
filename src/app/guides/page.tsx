import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { guides } from './guides-data';
import { GuidesIndexClient } from './GuidesIndexClient';

export const metadata: Metadata = {
  title: 'Guides',
  description:
    'Step-by-step guides and video walkthroughs to help you get the most out of EchoMe. Platform overview, video content, YouTube repurposing, voice profile building, email uploads, and file compression.',
  openGraph: {
    title: 'EchoMe Guides',
    description: 'Video walkthroughs and step-by-step guides for EchoMe.',
    url: 'https://tryechome.com/guides',
  },
  alternates: {
    canonical: 'https://tryechome.com/guides',
  },
};

export default function GuidesIndexPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'EchoMe Guides',
    description: 'Step-by-step guides and video walkthroughs for EchoMe.',
    url: 'https://tryechome.com/guides',
    isPartOf: { '@type': 'WebSite', name: 'EchoMe', url: 'https://tryechome.com' },
    hasPart: guides.map((g) => ({
      '@type': 'Article',
      name: g.title,
      url: `https://tryechome.com/guides/${g.slug}`,
      description: g.description,
    })),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={jsonLd} />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-4">
          <Link href="/" className="text-sm text-accent hover:underline">&larr; Back to EchoMe</Link>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Guides
        </h1>
        <p className="text-lg text-text-secondary mb-8">
          Step-by-step walkthroughs to help you get the most out of EchoMe. Search, browse by category, or start with the first-timer path.
        </p>

        <GuidesIndexClient />

        {/* For realtors CTA */}
        <div className="p-6 bg-bg-secondary border border-border rounded-xl text-center">
          <p className="text-text-secondary text-sm mb-2">Are you a real estate agent?</p>
          <Link href="/realtors" className="text-accent font-semibold hover:underline">
            See how EchoMe works for real estate &rarr;
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-12 text-center text-xs text-text-secondary">
          <p>Need more help? Use the chat widget in the bottom-right corner of any EchoMe page.</p>
        </footer>
      </div>
    </div>
  );
}
