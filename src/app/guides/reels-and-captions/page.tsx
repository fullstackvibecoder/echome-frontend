import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reels & Caption Styles | EchoMe Guide',
  description: 'Choose from 8 caption styles for your video clips. Modern, Bold, Karaoke, and more. Burned-in captions ready for Instagram Reels, TikTok, and YouTube Shorts.',
  keywords: ['echome caption styles', 'video captions', 'reels', 'tiktok captions', 'instagram reels', 'caption design'],
  alternates: { canonical: 'https://tryechome.com/guides/reels-and-captions' },
};

export default function ReelsAndCaptionsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Reels & Caption Styles',
    description: 'Choose from 8 caption styles for your video clips. Burned-in captions ready for Instagram Reels, TikTok, and YouTube Shorts.',
    url: 'https://tryechome.com/guides/reels-and-captions',
    datePublished: '2026-04-15',
    dateModified: '2026-04-15',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Reels & Caption Styles', item: 'https://tryechome.com/guides/reels-and-captions' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">&larr; All Guides</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Reels &amp; Caption Styles
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Every video clip EchoMe generates comes with captions burned in. Choose from 8 distinct caption styles to match your brand and content type &mdash; then export at 1080p, ready for Instagram Reels, TikTok, or YouTube Shorts.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Open any Content Kit with video clips">
            <p>Navigate to your Content Library and open a Content Kit that includes video clips. Each kit generated from a video source will have clips ready to preview.</p>
          </Step>

          <Step number={2} title="Preview captions on each clip">
            <p>Each clip comes with captions burned in. You can see the caption preview directly on the clip card &mdash; no need to download first. The preview shows exactly how the captions will look in the final export.</p>
          </Step>

          <Step number={3} title="Choose from 8 caption styles">
            <p>EchoMe offers 8 caption styles, each designed for different content types:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Modern</strong> &mdash; Clean sans-serif text</li>
              <li><strong>Classic</strong> &mdash; Traditional subtitle styling</li>
              <li><strong>Bold</strong> &mdash; Large impact text</li>
              <li><strong>Minimal</strong> &mdash; Small lower-third placement</li>
              <li><strong>Highlight</strong> &mdash; Word-by-word highlight effect</li>
              <li><strong>Karaoke</strong> &mdash; Color-fill animation</li>
              <li><strong>Underline</strong> &mdash; Active word underlined</li>
              <li><strong>Word by Word</strong> &mdash; One word at a time</li>
            </ul>
            <p className="mt-2">Style previews are available at:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
              <li>modern.svg</li>
              <li>big-bold.svg</li>
              <li>clean-simple.svg</li>
              <li>color-pop.svg</li>
              <li>karaoke.svg</li>
              <li>one-at-a-time.svg</li>
              <li>subtitle-bar.svg</li>
              <li>underline.svg</li>
            </ul>
          </Step>

          <Step number={4} title="Change caption style per clip">
            <p>Click the style selector on any clip card to switch between caption styles. Each clip can use a different style &mdash; mix and match to suit your content.</p>
            <Tip>Modern and Bold work best for fast-paced content. Karaoke is great for music or spoken word. Minimal keeps the focus on the visuals.</Tip>
          </Step>

          <Step number={5} title="Export at 1080p">
            <p>The captions are burned directly into the video file at 1080p resolution. Download and post to Instagram Reels, TikTok, or YouTube Shorts &mdash; no extra editing needed.</p>
            <Tip>Caption position can be set to top, center, or bottom of the frame.</Tip>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to create captioned reels from your videos?</p>
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
