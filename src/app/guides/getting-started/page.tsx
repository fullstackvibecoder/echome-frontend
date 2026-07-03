import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Getting Started: Your First Content Kit | EchoMe Guide',
  description: 'Sign up for free, paste a link or drop a video, and get your first Content Kit in minutes. Clips, captions, posts, blog drafts, and more, all in your voice.',
  keywords: ['echome getting started', 'first content kit', 'ai content creation', 'how to use echome'],
  alternates: { canonical: 'https://tryechome.com/guides/getting-started' },
};

export default function GettingStartedGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Getting Started: Your First Content Kit',
    description: 'Sign up for free, paste a link or drop a video, and get your first Content Kit in minutes. Clips, captions, posts, blog drafts, and more, all in your voice.',
    url: 'https://tryechome.com/guides/getting-started',
    datePublished: '2026-04-15',
    dateModified: '2026-07-03',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Getting Started', item: 'https://tryechome.com/guides/getting-started' },
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
          Getting Started: Your First Content Kit
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          EchoMe turns one piece of content into a full kit: clips with captions, LinkedIn posts, Instagram captions, blog drafts, emails, and carousels. Here&apos;s how to create your first one.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/create-page.png"
          alt="EchoMe Create Page"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Sign up for free">
            <p>Create your EchoMe account. It&apos;s free, no credit card required. You get 5 full content generations to try everything out before deciding on a plan. At signup, EchoMe automatically builds your starting knowledge base so your first kit reflects your context right away.</p>
          </Step>

          <Step number={2} title="Go to the Create page">
            <p>From the sidebar, click Create. You&apos;ll land on one composer: type a topic, paste a link, drop a file with the paperclip icon (or drag it anywhere on the page), or tap the mic and talk. Paste a YouTube or Instagram link and Echo asks what to do with it: cut clips and write content now, save it to clip later, or add it to Your Voice. Paste a Zoom, Loom, or Vimeo recording link and Echo cuts clips and writes content right away.</p>
            <Tip>If a Zoom recording needs a passcode, Echo asks for it during processing, not when you paste the link.</Tip>
          </Step>

          <Step number={3} title="Wait 2-5 minutes for processing">
            <p>Once you submit, EchoMe gets to work. Here&apos;s what happens behind the scenes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Audio is transcribed with speaker detection</li>
              <li>The best clips are extracted and scored by strength</li>
              <li>Written content is generated across 8 formats: LinkedIn, Instagram, X, TikTok, email, YouTube description, blog, and video script</li>
            </ul>
            <p className="mt-2">You&apos;ll get a notification when your Content Kit is ready.</p>
          </Step>

          <Step number={4} title="Review your Content Kit">
            <p>Open your kit to see everything EchoMe created from a single input. Content is organized into two sections:</p>
            <p className="mt-2"><strong className="text-text-primary">Visual Content:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Short-form clips with captions</li>
              <li>Carousel slides</li>
            </ul>
            <p className="mt-2"><strong className="text-text-primary">Written Content:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>LinkedIn post</li>
              <li>Instagram caption</li>
              <li>X post</li>
              <li>TikTok caption</li>
              <li>Blog draft</li>
              <li>Email newsletter</li>
              <li>YouTube description</li>
              <li>Video script</li>
            </ul>
            <p className="mt-2">Each piece is written in your voice, grounded in your context.</p>
          </Step>

          <Step number={5} title="Edit, export, and publish">
            <p>Click any piece of content to edit it directly. Download clips in 1080p with your chosen caption style. Copy text to clipboard. Everything is saved in <strong>Your Library</strong> for later.</p>
          </Step>
        </section>

        {/* Tips */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl space-y-3">
          <p className="text-sm text-text-secondary"><strong>Tip:</strong> Your first generation trains EchoMe on your voice. The more content you feed it, the better it sounds like you.</p>
        </div>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to create your first Content Kit?</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free: 5 Generations</a>
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
