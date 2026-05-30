import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Built-in Teleprompter | EchoMe Guide',
  description: 'Record talking-head video against a script EchoMe wrote in your voice. Built-in teleprompter with WPM control, voice tracking, font sizing, mirror mode, and a 9:16 / 16:9 aspect toggle.',
  keywords: ['echome teleprompter', 'teleprompter app', 'record video script', 'talking head video', 'voicetrack teleprompter'],
  alternates: { canonical: 'https://tryechome.com/guides/teleprompter' },
};

export default function TeleprompterGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Built-in Teleprompter',
    description: 'Record talking-head video against a script EchoMe wrote in your voice. Built-in teleprompter with WPM control, voice tracking, and pause-on-silence.',
    url: 'https://tryechome.com/guides/teleprompter',
    datePublished: '2026-05-01',
    dateModified: '2026-05-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Teleprompter', item: 'https://tryechome.com/guides/teleprompter' },
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
          Built-in Teleprompter
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Every content kit you generate from a text or voice idea includes a video script. The built-in teleprompter lets you read that script aloud while your camera records — no separate teleprompter app, no extra editing app, no copy-paste between tools.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          4 min read
        </p>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Open a content kit with a script">
            <p>From <strong className="text-text-primary">Your Library</strong>, open any content kit that originated from a text or voice idea (video uploads don&rsquo;t generate a fresh script — the source video already is one). On the kit detail page, switch to the <strong className="text-text-primary">Video Script</strong> tab in the inline content editor.</p>
            <Tip>The teleprompter button also appears on the YouTube and TikTok script tabs whenever those have content.</Tip>
          </Step>

          <Step number={2} title="Hit Record with Teleprompter">
            <p>The button opens a full-screen recording modal. Your browser will ask for camera and microphone access — allow both. The script appears as an overlay; the camera fills the rest of the screen.</p>
          </Step>

          <Step number={3} title="Pick your layout">
            <p>Two layout modes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Camera-first (default)</strong> — camera fills the screen, script floats in the top third near the lens. Best for short scripts and natural eye-line.</li>
              <li><strong>Big script</strong> — script dominates the viewport at ~1.7&times; font, camera shrinks to a 120&times;180 corner thumbnail. Best for long YouTube scripts where readability matters more than eye-line.</li>
            </ul>
          </Step>

          <Step number={4} title="Tune the speed and look">
            <p>Settings row at the bottom:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>WPM slider</strong> &mdash; 80 to 220 words per minute. Drag mid-recording and the scroll adjusts live.</li>
              <li><strong>Font size</strong> &mdash; S / M / L. Pair with the layout toggle for distance reading.</li>
              <li><strong>Font family</strong> &mdash; Sans / Serif / Mono.</li>
              <li><strong>Mirror</strong> &mdash; flips the camera horizontally if your front cam shows you reversed.</li>
              <li><strong>Width</strong> &mdash; narrow the script box to reduce side-to-side eye sweep.</li>
              <li><strong>Zoom</strong> &mdash; 1&times; to ~3&times;. Hardware zoom on supported cameras (most Android back cameras, some iOS); CSS preview-only fallback when not.</li>
              <li><strong>9:16 / 16:9</strong> &mdash; portrait or landscape framing.</li>
            </ul>
          </Step>

          <Step number={5} title="Smart scrolling (optional)">
            <p>Three scroll modes when your browser supports the Web Speech API (Chrome, Edge, Safari):</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Manual</strong> — constant WPM, you control the pace.</li>
              <li><strong>Auto-pause</strong> — scroll pauses when you stop talking, resumes when you speak. Good for natural beats and reading slowly.</li>
              <li><strong>VoiceTrack</strong> — script position follows what you actually say. Skip a sentence, paraphrase, or pause without losing your place.</li>
            </ul>
            <p className="mt-2">Firefox doesn&rsquo;t expose the Web Speech API, so those modes are hidden there.</p>
          </Step>

          <Step number={6} title="Record + review">
            <p>Hit the red record button to start. A 3-2-1 countdown gives you a beat. The script begins scrolling on its own. You can use the up/down arrows on the right edge to nudge by a couple of lines, or pause/resume mid-take.</p>
            <p className="mt-2">When you stop, the review screen lets you preview the take, retake, download (with or without burned-in captions), or upload to Echo.</p>
          </Step>

          <Step number={7} title="What happens after Upload to Echo">
            <p>Recordings land in <strong className="text-text-primary">Your Library</strong> as a new clip on the same content kit you started from:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Under 3 minutes</strong> — the recording becomes a single clip on your kit. Caption it and schedule it like any other clip.</li>
              <li><strong>3 minutes or more</strong> — the recording becomes a clip on your kit AND triggers a fresh content kit derived from it (clip-finder cuts + per-platform social posts written from your transcript).</li>
              <li><strong>Clip-finder finds nothing useful</strong> — we redeliver the full recording as a single clip rather than ship an empty kit.</li>
            </ul>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to record your first take?</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free &mdash; 5 Content Kits</a>
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
      <div className="flex-1 text-text-secondary">
        <h2 className="text-lg font-semibold text-text-primary mb-1">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm text-accent bg-accent/5 border border-accent/20 rounded-md px-3 py-2">
      <strong>Tip:</strong> {children}
    </p>
  );
}
