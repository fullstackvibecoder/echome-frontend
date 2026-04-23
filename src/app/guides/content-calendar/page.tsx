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
    dateModified: '2026-04-15',
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
            <p>Open the Calendar from the main sidebar navigation. The calendar view shows your content organized by date in a familiar weekly or monthly layout.</p>
          </Step>

          <Step number={2} title="See all your content organized by date">
            <p>Every piece of generated content &mdash; posts, clips, carousels, newsletters &mdash; appears on the calendar at its scheduled date. Get a bird&rsquo;s-eye view of your entire content pipeline.</p>
            <Tip>The calendar automatically populates with content from your latest Content Kits. New generation = new posts on your calendar.</Tip>
          </Step>

          <Step number={3} title="Drag posts to different dates">
            <p>Need to reschedule? Drag any post to a new date. The calendar updates instantly. Rearrange your content plan without leaving the view.</p>
          </Step>

          <Step number={4} title="Click any post to preview and edit">
            <p>Click on a post to open the full preview. Edit the copy, swap images, or adjust the platform before publishing. Everything is editable right from the calendar.</p>
          </Step>

          <Step number={5} title="Export your calendar or connect integrations">
            <p>Export your content calendar for external tools. Direct integrations with social media platforms are coming soon &mdash; for now, copy posts and download clips from the calendar view.</p>
            <Tip>Use the calendar to plan a full week of content from a single video upload.</Tip>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to plan your content week?</p>
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
