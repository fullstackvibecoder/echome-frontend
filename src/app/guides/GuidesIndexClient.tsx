'use client';

/**
 * GuidesIndexClient.tsx
 * Interactive guides index: search, category pills, and a numbered
 * "Start here" path for first-touch users. The server page.tsx owns
 * metadata + JSON-LD; this component owns presentation and filtering.
 * Guide data lives in guides-data.tsx (shared with the server page so
 * JSON-LD and the rendered list can never drift apart).
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Video } from 'lucide-react';
import { guides, START_HERE_SLUGS, CATEGORY_ORDER, type Guide } from './guides-data';

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block bg-bg-secondary border border-border rounded-xl hover:border-accent hover:shadow-lg transition-all overflow-hidden"
    >
      {guide.thumbnail && (
        <img
          src={guide.thumbnail}
          alt={guide.title}
          className="w-full h-36 object-cover object-top border-b border-border"
        />
      )}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            {guide.icon}
          </div>
          <span className="text-xs text-text-secondary bg-bg-primary px-2 py-0.5 rounded-full">
            {guide.category}
          </span>
        </div>

        <h2 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
          {guide.title}
        </h2>
        <p className="text-sm text-text-secondary mb-4">{guide.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span>{guide.readTime} read</span>
            {guide.hasVideo && (
              <span className="flex items-center gap-1">
                <Video className="w-3 h-3" /> Video included
              </span>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}

export function GuidesIndexClient() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const startHere = START_HERE_SLUGS
    .map((slug) => guides.find((g) => g.slug === slug))
    .filter((g): g is Guide => Boolean(g));

  const q = query.trim().toLowerCase();
  const filtered = guides.filter((g) => {
    if (activeCategory && g.category !== activeCategory) return false;
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q)
    );
  });

  const browsing = !q && !activeCategory;

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides. Try 'YouTube', 'schedule', or 'carousel'."
          aria-label="Search guides"
          className="w-full rounded-xl border border-border bg-bg-secondary py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-accent focus:outline-none"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            activeCategory === null
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          All
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              activeCategory === cat
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {browsing ? (
        <>
          {/* Start here — a real sequence, so it gets numbers */}
          <section className="mb-14">
            <h2 className="text-xl font-semibold text-text-primary mb-1">Start here</h2>
            <p className="text-sm text-text-secondary mb-5">
              New to EchoMe? These three, in order, take you from sign-up to content in your voice.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {startHere.map((guide, i) => (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="group flex flex-col rounded-xl border border-border bg-bg-secondary p-5 hover:border-accent hover:shadow-lg transition-all"
                >
                  <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-text-secondary">{guide.startHereHook}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Category sections */}
          {CATEGORY_ORDER.map((cat) => {
            const inCat = guides.filter((g) => g.category === cat);
            if (inCat.length === 0) return null;
            return (
              <section key={cat} className="mb-14">
                <h2 className="text-xl font-semibold text-text-primary mb-5">{cat}</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {inCat.map((guide) => (
                    <GuideCard key={guide.slug} guide={guide} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <section className="mb-16">
          <p className="text-sm text-text-secondary mb-5">
            {filtered.length === 0
              ? 'No guides match. Try a different word, or clear the filters.'
              : `${filtered.length} ${filtered.length === 1 ? 'guide' : 'guides'}`}
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {filtered.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
