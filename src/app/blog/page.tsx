import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BlogBrowser } from '@/components/blog/BlogBrowser';
import { SubscribeCard } from '@/components/blog/SubscribeCard';
import { SITE_URL } from './posts';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Case studies, office hours recaps and how-tos from people turning real conversations into content with EchoMe.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/blog`,
    title: 'The EchoMe Blog',
    description: 'Case studies, office hours recaps and how-tos from people turning real conversations into content.',
    images: [{ url: `${SITE_URL}/blog/giovanna-office-hours.webp`, width: 1600, height: 901 }],
  },
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10 sm:mb-12 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">The EchoMe Blog</h1>
          <p className="text-lg text-text-secondary">
            Case studies, office hours recaps and how-tos from people turning real conversations into content.
          </p>
        </header>

        <Suspense>
          <BlogBrowser />
        </Suspense>

        <div className="mt-16">
          <SubscribeCard />
        </div>
      </div>
    </div>
  );
}
