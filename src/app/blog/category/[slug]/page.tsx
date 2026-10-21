import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BlogBrowser } from '@/components/blog/BlogBrowser';
import { SubscribeCard } from '@/components/blog/SubscribeCard';
import { SITE_URL, getCategory, visibleCategories } from '../../posts';

export function generateStaticParams() {
  return visibleCategories().map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} | Blog`,
    description: category.description,
    alternates: { canonical: `${SITE_URL}/blog/category/${category.slug}` },
  };
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <header className="mb-10 max-w-2xl">
          <Link href="/blog" className="text-sm text-accent hover:underline">&larr; The EchoMe Blog</Link>
          <h1 className="text-4xl font-bold text-text-primary mt-4 mb-3">{category.name}</h1>
          <p className="text-lg text-text-secondary">{category.description}</p>
        </header>

        <Suspense>
          <BlogBrowser categorySlug={category.slug} />
        </Suspense>

        <div className="mt-16">
          <SubscribeCard />
        </div>
      </div>
    </div>
  );
}
