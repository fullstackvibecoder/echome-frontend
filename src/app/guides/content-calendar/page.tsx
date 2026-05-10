import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Content Calendar — Schedule Your Posts | EchoMe Guide',
  description: 'See all your generated content organized by date. Drag posts to reschedule, preview before publishing, and plan a full week from a single video.',
  keywords: ['echome content calendar', 'schedule posts', 'content planning', 'social media calendar'],
  alternates: { canonical: 'https://tryechome.com/guides/content-calendar' },
};

export default function ContentCalendarGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Content Calendar — Schedule Your Posts',
    description: 'See all your generated content organized by date. Drag posts to reschedule, preview before publishing, and plan a full week from a single video.',
    url: 'https://tryechome.com/guides/content-calendar',
    datePublished: '2026-04-15',
    dateModified: '2026-05-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Content Calendar', item: 'https://tryechome.com/guides/content-calendar' },
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
          Content Calendar &mdash; Schedule Your Posts
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          EchoMe organizes all your generated content on a visual calendar. Drag posts to reschedule, preview and edit before publishing, and plan a full week of content from a single video upload.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          2 min read
        </p>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Go to Calendar in the sidebar">
            <p>Open the Calendar from the main sidebar navigation. Toggle between <strong>Week</strong> and <strong>Month</strong> view at the top. Each scheduled item shows up as a card colored by which Content Kit it came from, with platform icons telling you exactly what&rsquo;s scheduled per platform on that day.</p>
          </Step>

          <Step number={2} title="See everything organized by date">
            <p>Every piece of generated content &mdash; clips, carousels, written posts, newsletters &mdash; appears at its scheduled date. Each card has small platform dots so you can see at a glance which platforms are firing on which day.</p>
            <Tip>The calendar populates from your Content Kits the moment you schedule a post or use AI Schedule. New generation = new posts on your calendar.</Tip>
          </Step>

          <Step number={3} title="Drag in the week view to reschedule">
            <p>On the week view you can drag any scheduled card to a different day &mdash; EchoMe re-times every platform in that fanout together. Great for shuffling a plan after the week starts.</p>
          </Step>

          <Step number={4} title="Click any card to preview, retry, or cancel">
            <p>Click a card to open its detail view. From there:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Cancel</strong> a scheduled or preparing post before it goes out.</li>
              <li><strong>Retry</strong> a failed post if a platform-side issue (Meta verification, rate limit) cleared after the first attempt.</li>
              <li><strong>Dismiss</strong> a failed or completed row to clear it from the calendar without losing the audit record.</li>
            </ul>
            <p className="mt-2">If the calendar header shows a red <strong>N failed</strong> counter, click it &mdash; you&rsquo;ll get a side panel listing every failed post with <strong>Dismiss all</strong> to clear stale issues in one click.</p>
          </Step>

          <Step number={5} title="Connect your social accounts and auto-post">
            <p>Settings &rarr; Connections lets you connect Instagram, LinkedIn, and Facebook directly. Auto-posting unlocks at Echo Studio ($87/mo); on Free and Echo you can still schedule posts and get email reminders at the scheduled time. Threads piggybacks on Instagram&rsquo;s cross-post setting; X/TikTok use copy-and-open links.</p>
            <Tip>Use the AI Schedule button on any content kit to roll out a full week of staggered posts with one click.</Tip>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to plan your content week?</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free &mdash; 5 Generations</a>
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
