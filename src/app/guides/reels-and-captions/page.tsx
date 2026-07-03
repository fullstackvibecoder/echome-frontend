import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

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
    dateModified: '2026-07-03',
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
      <JsonLd data={jsonLd} />
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/guides" className="text-sm text-accent hover:underline">&larr; All Guides</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Reels &amp; Caption Styles
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Manage all your reels in the dedicated Reel Maker page. Choose from 8 distinct caption styles to match your brand and content type, then export at 1080p, ready for Instagram Reels, TikTok, or YouTube Shorts.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/reel-maker.png"
          alt="EchoMe Reel Maker"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Beta callout */}
        <div className="mb-10 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-200"><strong>Beta access:</strong> The Reel Maker is currently in admin-only beta. The Reels tab in the sidebar and the <code>?tab=reels</code> URL are gated to admin accounts. Request access via the chat widget if you want to try it.</p>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Open the Reel Maker">
            <p>Once you have beta access, open the <strong className="text-text-primary">Reels</strong> tab inside <strong className="text-text-primary">Your Library</strong> (<code>/app/library?tab=reels</code>). Your reels are organized in a status-grouped grid (Rendering, Drafts, Ready, and Earlier) so you can quickly find what you need.</p>
          </Step>

          <Step number={2} title="Create new reels from the create bar">
            <p>Use the compact create bar at the top of the Reel Maker to start a new reel. You can also access the <strong className="text-text-primary">B-Roll Wizard</strong> directly from the create bar to add cinematic b-roll footage to your clips.</p>
          </Step>

          <Step number={3} title="Choose from 8 caption styles">
            <p>EchoMe offers 8 caption styles, each designed for different content types:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Modern</strong>: Clean sans-serif text</li>
              <li><strong>Big &amp; Bold</strong>: Large impact text</li>
              <li><strong>Color Pop</strong>: Word-by-word highlight effect</li>
              <li><strong>Karaoke</strong>: Color-fill animation</li>
              <li><strong>Underline</strong>: Active word underlined</li>
              <li><strong>One at a Time</strong>: One word at a time</li>
              <li><strong>Subtitle Bar</strong>: Traditional subtitle styling</li>
              <li><strong>Clean &amp; Simple</strong>: Small lower-third placement</li>
            </ul>
          </Step>

          <Step number={4} title="Change caption style per clip">
            <p>Click the style selector on any clip card to switch between caption styles. Each clip can use a different style, mix and match to suit your content.</p>
            <Tip>Modern and Big &amp; Bold work best for fast-paced content. Karaoke is great for music or spoken word. Clean &amp; Simple keeps the focus on the visuals.</Tip>
          </Step>

          <Step number={5} title="Drag to position. Drag a corner to resize.">
            <p>Open any clip in the editor. Drag the caption block anywhere on the video and it stays. Drag the corner handle and the text scales to fit. Click any transcript line on the right to fix a typo. The caption updates live, the video preview jumps to that moment, and your edit gets baked into the next download.</p>
            <Tip>The post caption (the text that goes alongside the video on Instagram/LinkedIn/etc.) is also editable inline. Click into it, type, save. It&rsquo;s ready when you hit Schedule or Post Now.</Tip>
          </Step>

          <Step number={6} title="Export at source resolution">
            <p>The captions are burned directly into the video file. Output resolution matches your source, up to 1080p. EchoMe never upscales. Single-speaker view follows whoever&rsquo;s talking; split-screen view shows both speakers stacked. Download and post to Instagram Reels, TikTok, or YouTube Shorts. No extra editing needed.</p>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to create captioned reels from your videos?</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free: 5 Content Kits</a>
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
