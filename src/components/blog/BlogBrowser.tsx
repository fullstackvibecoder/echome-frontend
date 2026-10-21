'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { authors, getCategory, posts, visibleCategories, type BlogPost } from '@/app/blog/posts';
import { PostCard } from './PostCard';

function matches(post: BlogPost, query: string): boolean {
  const haystack = [
    post.title,
    post.subtitle,
    post.tags.join(' '),
    getCategory(post.category)?.name ?? '',
    authors[post.author].name,
  ]
    .join(' ')
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

interface BlogBrowserProps {
  // Set on /blog/category/[slug]; undefined on the main blog page.
  categorySlug?: string;
}

export function BlogBrowser({ categorySlug }: BlogBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  const scoped = categorySlug ? posts.filter((p) => p.category === categorySlug) : posts;
  const trimmed = query.trim();
  const results = trimmed ? scoped.filter((p) => matches(p, trimmed)) : scoped;

  function updateQuery(value: string) {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set('q', value);
    else params.delete('q');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const pills = [{ slug: '', name: 'All' }, ...visibleCategories()];
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const caseStudies = posts.filter((p) => p.category === 'case-studies');
  const showSections = !categorySlug && !trimmed;

  return (
    <div>
      {/* Search + categories */}
      <div className="flex flex-col gap-4 mb-10">
        <label className="relative block">
          <span className="sr-only">Search the blog</span>
          <Search className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search posts, topics, people"
            className="w-full rounded-xl border border-border bg-transparent pl-11 pr-10 py-3 text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent"
          />
          {query && (
            <button
              type="button"
              onClick={() => updateQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
        <nav aria-label="Blog categories" className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {pills.map((c) => {
            const active = (categorySlug ?? '') === c.slug;
            const href = c.slug ? `/blog/category/${c.slug}` : '/blog';
            return (
              <Link
                key={c.slug || 'all'}
                href={trimmed ? `${href}?q=${encodeURIComponent(trimmed)}` : href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-text-primary text-bg-primary border-text-primary'
                    : 'border-border text-text-secondary hover:border-accent hover:text-text-primary'
                }`}
              >
                {c.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {showSections ? (
        <>
          {/* Featured */}
          <section className="mb-14">
            <PostCard post={featured} variant="hero" priority />
          </section>

          {/* Case Studies */}
          <section className="mb-14">
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Case Studies</h2>
                <p className="text-sm text-text-secondary mt-1">{getCategory('case-studies')?.description}</p>
              </div>
              <Link href="/blog/category/case-studies" className="text-sm text-accent hover:underline whitespace-nowrap ml-4">
                See all &rarr;
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {caseStudies.map((p) => (
                <PostCard key={p.slug} post={p} variant="grid" />
              ))}
            </div>
          </section>

          {/* Latest */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Latest</h2>
            <div>
              {posts.map((p) => (
                <PostCard key={p.slug} post={p} variant="row" />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section>
          {trimmed && (
            <p className="text-sm text-text-secondary mb-2">
              {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{trimmed}&rdquo;
            </p>
          )}
          {results.length > 0 ? (
            <div>
              {results.map((p) => (
                <PostCard key={p.slug} post={p} variant="row" />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-text-secondary">
              Nothing here yet. Try another search, or{' '}
              <Link href="/blog" className="text-accent hover:underline">see all posts</Link>.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
