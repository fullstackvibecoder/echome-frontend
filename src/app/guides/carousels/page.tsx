import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Editing Carousels: Text, Photos, Style, Download | EchoMe Guide',
  description:
    'Edit carousel slides in EchoMe: change slide text, put a photo on any slide, restyle with five design presets (Branded, Quote Card, Tweet Card, Stats Card, My Image), and download single slides or a full zip.',
  keywords: [
    'echome carousel editor',
    'edit carousel slides',
    'carousel design presets',
    'quote card',
    'tweet card',
    'stats card',
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
    headline: 'Editing Carousels: Text, Photos, Style, Download',
    description:
      'Edit carousel slides in EchoMe: change text, put a photo on any slide, restyle with five design presets, and download single slides or a full zip.',
    url: 'https://tryechome.com/guides/carousels',
    datePublished: '2026-04-23',
    dateModified: '2026-10-21',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    video: {
      '@type': 'VideoObject',
      name: 'How to Edit a Carousel Slide Deck - Video Walkthrough',
      description: 'Video walkthrough of the EchoMe carousel editor: editing slide text, swapping photos, restyling, and downloading.',
      thumbnailUrl: 'https://cdn.loom.com/sessions/thumbnails/6b1e6f5fff584fcf8b77bc72642f6040-1be782097d623e3c.gif',
      embedUrl: 'https://www.loom.com/embed/6b1e6f5fff584fcf8b77bc72642f6040',
      contentUrl: 'https://www.loom.com/share/6b1e6f5fff584fcf8b77bc72642f6040',
      uploadDate: '2026-10-21',
    },
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
          Editing Carousels: Text, Photos, Style, Download
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Every Content Kit generates a set of carousel slides ready for Instagram and LinkedIn. You can edit the text on each slide, put your own photo on any slide, restyle the whole set with one click, and download single slides or the full set as a zip.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          4 min read &middot; Video walkthrough included
        </p>

        {/* Video embed */}
        <div className="mb-10 rounded-xl overflow-hidden border border-border">
          <div style={{ position: 'relative', paddingBottom: '74.96%', height: 0 }}>
            <iframe
              src="https://www.loom.com/embed/6b1e6f5fff584fcf8b77bc72642f6040"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title="How to Edit a Carousel Slide Deck - Video Walkthrough"
            />
          </div>
        </div>

        {/* Hero image: the carousel editor in use */}
        <img
          src="/guide-screenshots/carousel-editor.png"
          alt="EchoMe Carousel Editor on slide 2, showing the Headline and Body fields and a background photo picked for that slide"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Open the carousel editor">
            <p>
              From your Content Kit detail page, find the <strong className="text-text-primary">Carousel</strong> tile in the Visual Content section (it shows a stack-of-slides preview with a slide count). Click it to open the Carousel Editor.
            </p>
            <Tip>If you don&apos;t see a carousel tile, the kit is still generating. Carousels are produced in the background and appear as soon as they&apos;re ready, no refresh needed.</Tip>
          </Step>

          <Step number={2} title="Navigate between slides">
            <p>
              Use the left and right arrows on the slide preview to move between slides. You can also click any thumbnail in the strip underneath the preview to jump directly to that slide. The current slide number (e.g. <code className="px-1 py-0.5 bg-bg-secondary rounded text-xs">1 / 10</code>) shows below the preview.
            </p>
          </Step>

          <Step number={3} title="Edit slide text">
            <p>
              The <strong className="text-text-primary">Slide N content</strong> section on the right (or below the preview on mobile) splits each slide into fields like <strong className="text-text-primary">Headline</strong> and <strong className="text-text-primary">Body</strong>. Click into a field and edit. Changes save on their own and the preview updates a moment later. Keep slides short: 1&ndash;2 sentences per slide reads best on a phone.
            </p>
            <Tip>On the cover and last slide, the <strong className="text-text-primary">Red word</strong> picker lets you mark one word in red so the hook pops. Click the word again to remove it.</Tip>
          </Step>

          <Step number={4} title="Put a photo on any slide">
            <p>
              Under <strong className="text-text-primary">Background photo</strong>, click a photo to put it on the slide you&apos;re looking at. You can upload your own, reuse a saved photo, grab a still frame from your video, or use your profile photo. Move to another slide and pick a different photo to give each slide its own.
            </p>
            <Tip>Want the same photo everywhere? After picking one, click <strong className="text-text-primary">Apply this photo to all</strong>.</Tip>
          </Step>

          <Step number={5} title="Restyle with a design preset">
            <p>Under <strong className="text-text-primary">Carousel Style</strong>, pick one of five presets and EchoMe re-renders every slide in that style in a few seconds:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong className="text-text-primary">Branded</strong>: photo background with bold typography. The default look for personal-brand carousels.</li>
              <li><strong className="text-text-primary">Quote Card</strong>: clean serif text on cream. Best for thought-leadership quotes.</li>
              <li><strong className="text-text-primary">Tweet Card</strong>: Twitter-style dark card. Best for hot takes and short hooks.</li>
              <li><strong className="text-text-primary">Stats Card</strong>: big stat on warm white. Best for data-led carousels.</li>
              <li><strong className="text-text-primary">My Image</strong>: pick any image for the cover and last slides — upload your own, reuse a saved photo, grab a still frame from your original video, or use your profile photo. Body slides keep the template look.</li>
            </ul>
            <p className="mt-3">The <strong className="text-text-primary">Current Style</strong> button below the presets indicates which one is active. Click any other preset to restyle.</p>
            <Tip>Restyling replaces the backgrounds on all slides at once. Text edits you&apos;ve made are preserved, only the design changes.</Tip>
          </Step>

          <Step number={6} title="Edit the Instagram post caption">
            <p>
              The <strong className="text-text-primary">Post caption</strong> section at the bottom of the editor pairs with this carousel. Edit it inline; it saves automatically. The copy icon beside the label copies it to your clipboard. To publish, use the posting controls at the bottom of the editor: pick your platforms, then <strong className="text-text-primary">Post now</strong> or <strong className="text-text-primary">Schedule</strong>.
            </p>
            <Tip>If the caption field is empty, EchoMe falls back to the kit-level Instagram caption generated for this Content Kit.</Tip>
          </Step>

          <Step number={7} title="Download single slide or full set">
            <p>
              The <strong className="text-text-primary">Slide</strong> download button (bottom of the editor, above the posting controls) exports the currently visible slide as a PNG. <strong className="text-text-primary">All (N)</strong> (where N is your carousel&apos;s slide count) exports every slide as a zip file, ready to upload to Instagram or LinkedIn in order. You can trim a carousel down to 3 slides or build it up to 20 from the slide strip.
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
            <li><strong className="text-text-primary">Match the background to the mood.</strong> A still frame from your video works for personal/behind-the-scenes content. Quote Card works for business advice. Tweet Card works for strong opinions and hot takes.</li>
            <li><strong className="text-text-primary">Caption and carousel should complement, not duplicate.</strong> The caption is where you expand on what the slides can&apos;t fit: context, story, and the call to action.</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to edit a carousel?</p>
          <a href="/app/library" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">
            Open Your Library
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
