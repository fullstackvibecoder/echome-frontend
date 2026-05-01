import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Turn YouTube Videos into Social Media Content | EchoMe Guide',
  description: 'Paste any YouTube link into EchoMe and get clips, carousels, LinkedIn posts, Instagram content, newsletters, and more. All in your voice.',
  keywords: ['turn youtube video into social media posts', 'youtube to linkedin post', 'repurpose youtube content', 'youtube content repurposing tool', 'youtube to instagram carousel', 'AI video to social media'],
  alternates: { canonical: 'https://tryechome.com/guides/youtube-to-content' },
};

export default function YouTubeToContentGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Turn YouTube Videos into Social Media Content',
    description: 'Paste any YouTube link into EchoMe and get clips, carousels, LinkedIn posts, Instagram content, newsletters, and more. All in your voice.',
    url: 'https://tryechome.com/guides/youtube-to-content',
    datePublished: '2026-04-01',
    dateModified: '2026-04-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'YouTube to Content', item: 'https://tryechome.com/guides/youtube-to-content' },
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
          Turn YouTube Videos into Social Media Content
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          You already have hours of content on YouTube. EchoMe turns any public YouTube video into a full content kit: clips with captions, Instagram carousels, LinkedIn posts, X threads, email newsletters, and blog posts. All written in your voice.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          4 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/create-page.png"
          alt="EchoMe Create Page"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Callout box */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary">For a full video walkthrough of this feature, watch the <a href="/guides/platform-overview" className="text-accent font-medium hover:underline">platform overview guide</a>.</p>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Paste any YouTube link">
            <p>Go to the Create page and paste your YouTube URL directly into the unified conversational input. EchoMe auto-detects YouTube links &mdash; just hit submit. Works with any public YouTube video: watch pages, share links, and shorts. The unified input accepts YouTube links alongside any other content type.</p>
          </Step>

          <Step number={2} title="EchoMe downloads and transcribes">
            <p>EchoMe fetches the video and transcribes the audio automatically. No manual transcription needed. Processing takes 5&ndash;15 minutes depending on video length.</p>
            <Tip>YouTube links may be intermittent. For reliable results, download the video and <a href="/guides/compress-video" className="text-accent hover:underline">compress it first</a>.</Tip>
          </Step>

          <Step number={3} title="AI extracts the best clips">
            <p>EchoMe analyzes your transcript and identifies the most engaging moments. Each clip gets a virality score. If the video has multiple speakers (interviews, podcasts), split-screen clips are generated automatically.</p>
          </Step>

          <Step number={4} title="8 caption styles">
            <p>Every clip gets captions. Choose from 8 styles: Modern, Bold, Color Pop, Karaoke, Underline, One at a Time, Subtitle Bar, and Clean. Position captions at the top, center, or bottom. Download single or split-screen versions.</p>
          </Step>

          <Step number={5} title="Full written content kit">
            <p>From one YouTube video, EchoMe generates:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>LinkedIn posts</li>
              <li>Instagram captions</li>
              <li>X/Twitter threads</li>
              <li>Facebook posts</li>
              <li>Email newsletters</li>
              <li>Blog posts</li>
            </ul>
            <p className="mt-2">All written in your voice based on your knowledge base.</p>
          </Step>

          <Step number={6} title="Download and share">
            <p>Copy any post to clipboard. Download video clips. Schedule content to your calendar. Everything is saved in your Content Library for later.</p>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Have a YouTube video? Try it now.</p>
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
