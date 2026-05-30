import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Working with Content Kits — Edit, Export, Share | EchoMe Guide',
  description: 'Learn how to edit posts, export captioned clips in 8 styles, and share content from your EchoMe Content Kits.',
  keywords: ['echome content kit', 'edit content', 'export clips', 'caption styles', 'carousel'],
  alternates: { canonical: 'https://tryechome.com/guides/content-kits' },
};

export default function ContentKitsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Working with Content Kits — Edit, Export, Share',
    description: 'Learn how to edit posts, export captioned clips in 8 styles, and share content from your EchoMe Content Kits.',
    url: 'https://tryechome.com/guides/content-kits',
    datePublished: '2026-04-15',
    dateModified: '2026-05-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Content Kits', item: 'https://tryechome.com/guides/content-kits' },
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
          Working with Content Kits &mdash; Edit, Export, Share
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Your Content Kit is a complete set of ready-to-publish content generated from a single input. Here&apos;s how to navigate, edit, export, and share everything inside it.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          4 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/content-kit-detail.png"
          alt="EchoMe Content Kit Detail"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Find your kit in Your Library">
            <p>Open <strong>Your Library</strong> from the sidebar. Your kits are organized by status: Ready to Publish, Processing, and Earlier. The most recent kits appear at the top.</p>
          </Step>

          <Step number={2} title="Open a kit">
            <p>Click any kit to open it. Inside, your content is organized into two main sections: <strong className="text-text-primary">Visual Content</strong> and <strong className="text-text-primary">Written Content</strong>.</p>
          </Step>

          <Step number={3} title="Browse Visual Content">
            <p>The Visual Content section contains your video clips with captions and carousel slides. Each piece is displayed in an OutputCard with a clean preview. Download captioned clips in 1080p, ready for any platform. Each clip is optimized for vertical (9:16) short-form content. If the original video had multiple speakers, split-screen versions are available too.</p>
          </Step>

          <Step number={4} title="Browse Written Content">
            <p>The Written Content section contains your LinkedIn posts, Instagram captions, X/Twitter posts, blog drafts, and email newsletters. Each OutputCard shows a preview of the content with options to edit, copy, or export.</p>
            <Tip>Each piece of content is written in your voice &mdash; trained from your previous uploads and knowledge base.</Tip>
          </Step>

          <Step number={5} title="Edit any post">
            <p>Click on any piece of written content to edit it directly. LinkedIn, Instagram, Twitter, blog, and email content are all editable inline. Make it yours, then save.</p>
            <Tip>Thumbs up the outputs that sound like you, thumbs down the ones that don&apos;t. The system trains on both &mdash; for 30 days, the patterns you flagged as off get excluded from future generations.</Tip>
          </Step>

          <Step number={6} title="Edit captions and clip text in the clip editor">
            <p>Open any clip and you&rsquo;ll get the full editor. Pick from 8 caption styles, drag the caption block anywhere on the video, drag a corner handle to resize the text, and click any transcript line to fix a mis-transcription &mdash; the preview jumps to that moment so you can see your edit live. The post caption that goes alongside the clip is also editable inline.</p>
          </Step>

          <Step number={7} title="Share or copy">
            <p>Copy any text to clipboard with one click. Download video clips directly. Share content to your platforms or save it in Your Library for later publishing.</p>
            <Tip>Use the carousel slides for LinkedIn carousels and Instagram posts &mdash; they&apos;re generated automatically from your content.</Tip>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to explore your kits?</p>
          <a href="/app/library" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Open Your Library</a>
          <p className="text-xs text-text-secondary/70 mt-3">Log in to view your generated content.</p>
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
