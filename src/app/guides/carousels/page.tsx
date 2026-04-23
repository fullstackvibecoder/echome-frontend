import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Editing Carousels — Text, Style, Layout, Download | EchoMe Guide',
  description:
    'Edit carousel slides in EchoMe: change slide text, drag to reposition, restyle with four design presets (Quote Card, Text on Color, your image, video frame), and download single slides or a full zip.',
  keywords: [
    'echome carousel editor',
    'edit carousel slides',
    'carousel design presets',
    'quote card',
    'video snapshot background',
    'instagram carousel',
    'linkedin carousel',
  ],
  alternates: { canonical: 'https://tryechome.com/guides/carousels' },
};

export default function CarouselsGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Editing Carousels — Text, Style, Layout, Download',
    description:
      'Edit carousel slides in EchoMe: change text, drag to reposition, restyle with four design presets, and download single slides or a full zip.',
    url: 'https://tryechome.com/guides/carousels',
    datePublished: '2026-04-23',
    dateModified: '2026-04-23',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Carousels', item: 'https://tryechome.com/guides/carousels' },
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
          Editing Carousels &mdash; Text, Style, Layout, Download
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Every Content Kit generates a set of carousel slides ready for Instagram and LinkedIn. You can edit the text on each slide, reposition it, restyle the whole set with one click, and download single slides or the full set as a zip.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          4 min read
        </p>

        {/* Hero image: the carousel editor in use */}
        <img
          src="/guide-screenshots/carousel-editor.png"
          alt="EchoMe Carousel Editor showing the slide preview, text editor, style presets, and post caption"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Open the carousel editor">
            <p>
              From your Content Kit detail page, find the <strong className="text-text-primary">Carousel</strong> tile in the Visual Content section (it shows a stack-of-slides preview with a slide count). Click it to open the Carousel Editor.
            </p>
            <Tip>If you don&apos;t see a carousel tile, the kit is still generating. Carousels are produced in the background and appear as soon as they&apos;re ready &mdash; no refresh needed.</Tip>
          </Step>

          <Step number={2} title="Navigate between slides">
            <p>
              Use the left and right arrows on the slide preview to move between slides. You can also click any thumbnail in the strip underneath the preview to jump directly to that slide. The current slide number (e.g. <code className="px-1 py-0.5 bg-bg-secondary rounded text-xs">1 / 10</code>) shows below the preview.
            </p>
          </Step>

          <Step number={3} title="Edit slide text">
            <p>
              The <strong className="text-text-primary">Slide N Text</strong> field on the right (or below the preview on mobile) shows the current slide&apos;s text. Click into it and edit. Keep slides short &mdash; 1&ndash;2 sentences per slide reads best on a phone. Long paragraphs will overflow.
            </p>
          </Step>

          <Step number={4} title="Reposition text by dragging">
            <p>
              You&apos;ll see the hint <em>&ldquo;Drag the text on the preview to reposition&rdquo;</em> under the text field. Click and drag the text box directly on the slide preview to move it anywhere on the canvas. Use this when the default centered placement fights the background image.
            </p>
          </Step>

          <Step number={5} title="Restyle with a design preset">
            <p>Under <strong className="text-text-primary">Carousel Style</strong>, pick one of four presets and EchoMe re-renders every slide in that style in a few seconds:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-text-primary">Quote Card</strong> &mdash; clean tweet-style text card. Best for thought-leadership quotes.</li>
              <li><strong className="text-text-primary">Text on Color</strong> &mdash; bold text over a color-gradient background. Best for attention-grabbing hooks.</li>
              <li><strong className="text-text-primary">My Image</strong> &mdash; upload your own background image. EchoMe places the slide text over it with a dark overlay for readability.</li>
              <li><strong className="text-text-primary">Video Frame</strong> &mdash; use a still frame from your original video as the slide background. EchoMe auto-extracts several candidate frames; pick one.</li>
            </ul>
            <p className="mt-3">The <strong className="text-text-primary">Current Style</strong> button below the presets indicates which one is active. Click any other preset to restyle.</p>
            <Tip>Restyling replaces the backgrounds on all slides at once. Text edits you&apos;ve made are preserved &mdash; only the design changes.</Tip>
          </Step>

          <Step number={6} title="Edit the Instagram post caption">
            <p>
              The <strong className="text-text-primary">Post caption</strong> section at the bottom of the editor pairs with this carousel. Edit it inline; it saves automatically. Use <strong className="text-text-primary">Copy caption</strong> to copy it to your clipboard, or <strong className="text-text-primary">Open Instagram</strong> to jump straight to Instagram with the caption ready to paste.
            </p>
            <Tip>If the caption field is empty, EchoMe falls back to the kit-level Instagram caption generated for this Content Kit.</Tip>
          </Step>

          <Step number={7} title="Download single slide or full set">
            <p>
              <strong className="text-text-primary">Download Slide</strong> exports the currently visible slide as a PNG. <strong className="text-text-primary">All (10)</strong> &mdash; or however many slides your carousel has &mdash; exports every slide as a zip file, ready to upload to Instagram or LinkedIn in order.
            </p>
            <Tip>Both Instagram and LinkedIn preserve slide order when you upload multiple images at once. Drag them into the uploader in slide-number order.</Tip>
          </Step>
        </section>

        {/* Best practices */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-text-primary mb-3">Tips from real use</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
            <li><strong className="text-text-primary">Slide 1 is the hook.</strong> Most of your audience decides whether to swipe based on the first slide alone. Edit it last, after the rest of the carousel is settled, so you know what you&apos;re hooking them into.</li>
            <li><strong className="text-text-primary">Read the carousel on a phone.</strong> The editor preview is desktop-sized. Slides that look fine on a laptop can feel cramped on mobile. Download a slide and open it on your phone before publishing.</li>
            <li><strong className="text-text-primary">Match the background to the mood.</strong> Video Frame works for personal/behind-the-scenes content. Quote Card works for business advice. Text on Color works for strong opinions and hot takes.</li>
            <li><strong className="text-text-primary">Caption and carousel should complement, not duplicate.</strong> The caption is where you expand on what the slides can&apos;t fit &mdash; context, story, and the call to action.</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to edit a carousel?</p>
          <a href="/app/content-kit" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">
            Open Content Kits
          </a>
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
