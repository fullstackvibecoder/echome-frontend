import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Zoom Recordings — Password-Protected Downloads | EchoMe Guide',
  description: 'EchoMe can process Zoom cloud recordings directly — including password-protected ones. Paste your share link and get a full content kit.',
  keywords: ['zoom recordings', 'zoom passcode', 'zoom to content', 'zoom cloud recording', 'echome zoom'],
  alternates: { canonical: 'https://tryechome.com/guides/zoom-recordings' },
};

export default function ZoomRecordingsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Zoom Recordings — Password-Protected Downloads',
    description: 'EchoMe can process Zoom cloud recordings directly — including password-protected ones. Paste your share link and get a full content kit.',
    url: 'https://tryechome.com/guides/zoom-recordings',
    datePublished: '2026-04-15',
    dateModified: '2026-04-15',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Zoom Recordings', item: 'https://tryechome.com/guides/zoom-recordings' },
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
          Zoom Recordings &mdash; Password-Protected Downloads
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          EchoMe can process Zoom cloud recordings directly &mdash; including password-protected ones. Paste your share link, enter the passcode if needed, and get a full content kit.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          2 min read
        </p>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Find your Zoom recording share link">
            <p>Get the share link from the Zoom email notification or from your Zoom account under Recordings. It looks like: <code className="text-xs bg-bg-secondary px-1.5 py-0.5 rounded">https://us02web.zoom.us/rec/share/...</code></p>
          </Step>

          <Step number={2} title="Paste the link into the Create page">
            <p>Go to the Create page and paste your Zoom share link directly into the input. EchoMe auto-detects Zoom recording links.</p>
          </Step>

          <Step number={3} title="Enter the passcode if required">
            <p>If the recording requires a passcode, a field automatically appears below the input. Enter the passcode from the Zoom invite email.</p>
          </Step>

          <Step number={4} title="Submit and let EchoMe process">
            <p>Hit submit &mdash; EchoMe authenticates with Zoom, downloads the recording, and processes it into a full content kit. Processing time depends on recording length.</p>
          </Step>

          <Step number={5} title="Review your content kit">
            <p>You get the same output as any other video source: clips with captions, social media posts, blog posts, email newsletters, and carousels. All written in your voice.</p>
          </Step>
        </section>

        {/* Tips */}
        <div className="space-y-3 mb-10">
          <Tip>Make sure you&apos;re using the &ldquo;Share&rdquo; link from Zoom, not the &ldquo;Play&rdquo; link. It looks like: https://us02web.zoom.us/rec/share/...</Tip>
          <Tip>Long recordings (30&ndash;60+ minutes) work great &mdash; EchoMe finds the best moments automatically.</Tip>
          <Tip>If you get a &ldquo;passcode didn&apos;t work&rdquo; error, double-check the passcode from the original Zoom invite email, not your Zoom account settings.</Tip>
        </div>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Have a Zoom recording? Try it now.</p>
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
