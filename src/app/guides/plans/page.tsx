import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Understanding EchoMe Plans | EchoMe Guide',
  description: 'Start free, upgrade when you need more. Compare Echo, Echo Studio, Echo Pro, and EchoTeams plans — pricing, features, and what each tier includes.',
  keywords: ['echome pricing', 'echome plans', 'echo pro', 'echo studio', 'echoteams', 'ai content pricing'],
  alternates: { canonical: 'https://tryechome.com/guides/plans' },
};

export default function PlansGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Understanding EchoMe Plans',
    description: 'Start free, upgrade when you need more. Compare Echo, Echo Studio, Echo Pro, and EchoTeams plans — pricing, features, and what each tier includes.',
    url: 'https://tryechome.com/guides/plans',
    datePublished: '2026-04-15',
    dateModified: '2026-04-15',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Plans', item: 'https://tryechome.com/guides/plans' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">&larr; All Guides</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Understanding EchoMe Plans
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Start free, upgrade when you need more. Every plan gives you the full EchoMe experience &mdash; the difference is how much you can create.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Plan sections */}
        <section className="space-y-8 mb-10">
          <PlanSection title="Free Tier">
            <p>3 lifetime generations, no credit card required. You get the full pro experience for those 3 generations &mdash; clips, captions, posts, newsletters, blog posts, voice matching, and <strong>auto-posting to Instagram, LinkedIn &amp; Facebook</strong>. Try everything before you commit.</p>
          </PlanSection>

          <PlanSection title="Echo &mdash; $37/mo">
            <ul className="list-disc list-inside space-y-1">
              <li>2hr video length</li>
              <li>5 clips per video</li>
              <li>Voice matching</li>
              <li>3 Creator Radar slots</li>
              <li>1080p exports</li>
              <li>Content calendar with email reminders at your scheduled times (auto-posting unlocks at Studio)</li>
            </ul>
          </PlanSection>

          <PlanSection title="Echo Studio &mdash; $87/mo">
            <ul className="list-disc list-inside space-y-1">
              <li>5hr video length</li>
              <li>10 clips per video</li>
              <li>Deep voice matching</li>
              <li>10 Creator Radar slots</li>
              <li>Email import (50)</li>
              <li>Auto-post to Instagram, LinkedIn &amp; Facebook</li>
            </ul>
          </PlanSection>

          <PlanSection title="Echo Teams &mdash; $47/voice/mo (2-voice min)">
            <ul className="list-disc list-inside space-y-1">
              <li>Per-voice scaling &mdash; pay only for what you use</li>
              <li>2-voice minimum, no upper cap</li>
              <li>Per-voice knowledge bases &amp; profile context</li>
              <li>Shared usage pool across voices</li>
              <li>Unlimited video length</li>
              <li>15 clips per video</li>
              <li>Email import (100), priority support</li>
              <li>Auto-post to Instagram, LinkedIn &amp; Facebook</li>
            </ul>
            <p className="mt-2">Total cost = $47 &times; the number of voices on your plan. 2 voices = $94/mo, 5 voices = $235/mo, etc.</p>
          </PlanSection>
        </section>

        {/* Annual billing note */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary">All plans offer annual billing that saves ~17%. Pay yearly and get more for less.</p>
        </div>

        {/* Tip */}
        <div className="mb-10">
          <Tip>Not sure which plan? Start with Echo ($37/mo) &mdash; you can upgrade anytime and your content carries over.</Tip>
        </div>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to pick a plan?</p>
          <a href="/app/billing" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">View Plans &amp; Pricing</a>
          <p className="text-xs text-text-secondary/70 mt-3">Start free &mdash; no credit card required.</p>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-8 text-center text-xs text-text-secondary">
          <p>Need help? Use the chat widget in the bottom-right corner of any EchoMe page.</p>
        </footer>
      </div>
    </div>
  );
}

function PlanSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 bg-bg-secondary border border-border rounded-xl">
      <h3 className="font-semibold text-text-primary mb-2">{title}</h3>
      <div className="text-sm text-text-secondary">{children}</div>
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
