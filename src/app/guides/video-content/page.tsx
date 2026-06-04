import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Creating and Managing Video Content in EchoMe | Guide',
  description: 'Learn how to upload videos, use external video links, edit clips with captions, and generate a full content kit from a single video in EchoMe.',
  alternates: { canonical: 'https://tryechome.com/guides/video-content' },
};

export default function VideoContentGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Creating and Managing Video Content in EchoMe',
    description: 'Learn how to upload videos, use external video links, edit clips with captions, and generate a full content kit from a single video in EchoMe.',
    url: 'https://tryechome.com/guides/video-content',
    datePublished: '2026-04-01',
    dateModified: '2026-04-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    video: {
      '@type': 'VideoObject',
      name: 'Creating and Managing Video Content in EchoMe - Video Walkthrough',
      description: 'Video walkthrough of uploading videos, using video links, editing clips, and generating content in EchoMe.',
      thumbnailUrl: 'https://cdn.loom.com/sessions/thumbnails/136ee8a0709e44eaa5a2ba128d3ab624-with-play.gif',
      embedUrl: 'https://www.loom.com/embed/136ee8a0709e44eaa5a2ba128d3ab624',
      uploadDate: '2026-04-01',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Video Content', item: 'https://tryechome.com/guides/video-content' },
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
          Creating and Managing Video Content in EchoMe
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Upload a video or paste a link, and EchoMe will transcribe it, extract clips with captions, and generate a full content kit &mdash; posts, newsletters, and blog drafts tailored to each platform.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          5 min read &middot; Video walkthrough included
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/create-page.png"
          alt="EchoMe Create Page"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Video embed */}
        <div className="mb-10 rounded-xl overflow-hidden border border-border">
          <div style={{ position: 'relative', paddingBottom: '64.98%', height: 0 }}>
            <iframe
              src="https://www.loom.com/embed/136ee8a0709e44eaa5a2ba128d3ab624"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title="Creating and Managing Video Content in EchoMe - Video Walkthrough"
            />
          </div>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Sign in and navigate to Create">
            <p>
              New users will follow the onboarding flow after signing up. Returning users go straight to the Create page. You&apos;ll see a single unified input where you can paste a link (YouTube, Zoom, Loom, Vimeo), type a topic, drop a video file, or record a voice note using the mic button inside the input bar.
            </p>
          </Step>

          <Step number={2} title="Uploading videos">
            <p>
              Drag and drop your video file directly onto the input area, or use the paperclip attach button inside the input bar. The hard cap is 2GB per upload, but anything under 500MB is noticeably faster and more reliable. Avoid 4K footage &mdash; 1080p or 720p works great and uploads much faster.
            </p>
            <p className="mt-2">
              If your file is too large, see our <a href="/guides/compress-video" className="text-accent hover:underline">compression guide</a> for free tools to shrink it.
            </p>
            <Tip>EchoMe analyzes your speech, not your video resolution. 720p is plenty and uploads much faster.</Tip>
          </Step>

          <Step number={3} title="Using video links">
            <p>
              Instead of uploading a file, paste a <strong className="text-text-primary">YouTube, Vimeo, Loom, Zoom, or TikTok</strong> URL into the unified input and hit Submit. No file upload needed &mdash; EchoMe pulls the content directly.
            </p>
            <p className="mt-2">
              <strong className="text-text-primary">Note:</strong> YouTube links may be intermittent due to platform restrictions. If a YouTube link fails, try downloading the video first and uploading the file.
            </p>
          </Step>

          <Step number={4} title="Processing and Your Library">
            <p>
              After upload, EchoMe processes your video: transcribing, finding key moments, extracting clips, adding captions, and generating written content. Monitor progress on the kit detail page. Once complete, your content appears in <strong className="text-text-primary">Your Library</strong>.
            </p>
          </Step>

          <Step number={5} title="Editing video clips">
            <p>
              View your extracted clips along with strength scores. <strong className="text-text-primary">Single speaker view</strong> shows one frame. <strong className="text-text-primary">Split-screen view</strong> is auto-generated when multiple speakers are detected, such as in interviews or podcasts. Download the Single or Split version of each clip.
            </p>
          </Step>

          <Step number={6} title="Customizing captions">
            <p>
              Choose from 8 caption styles: <strong className="text-text-primary">Modern, Big &amp; Bold, Color Pop, Karaoke, Underline, One at a Time, Subtitle Bar,</strong> and <strong className="text-text-primary">Clean &amp; Simple</strong>. Position captions at the top, center, or bottom of the frame. Toggle captions on or off, and preview changes in real-time.
            </p>
          </Step>

          <Step number={7} title="Written content and scheduling">
            <p>
              EchoMe generates posts for <strong className="text-text-primary">LinkedIn, Facebook, Instagram, X/Twitter, Newsletter,</strong> and <strong className="text-text-primary">Blog</strong>. Each platform gets tailored content matching its format and audience expectations. Copy to clipboard, use <strong className="text-text-primary">Post Now</strong> or <strong className="text-text-primary">Schedule</strong> on each platform, or add to your calendar.
            </p>
          </Step>

          <Step number={8} title="Your videos shape your voice">
            <p>
              Every video you upload also feeds your voice profile. The more it reads, the better EchoMe matches your tone, vocabulary, and style. Check your voice strength on the <strong className="text-text-primary">Your Voice</strong> page.
            </p>
          </Step>
        </section>

        {/* Common mistakes */}
        <section className="mb-10 p-5 bg-bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Common mistakes to avoid</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><strong className="text-text-primary">Uploading 4K raw footage:</strong> Compress your video first. EchoMe analyzes speech, not pixels. A 720p file gives the same results and uploads in a fraction of the time.</li>
            <li><strong className="text-text-primary">Retrying a failed upload without compressing:</strong> If a large file fails, don&apos;t upload the same file again. Compress it first using a <a href="/guides/compress-video" className="text-accent hover:underline">free tool</a>, then retry.</li>
            <li><strong className="text-text-primary">Forgetting you can paste a link instead of uploading:</strong> If your video is already on YouTube, Vimeo, Loom, Zoom, or TikTok, just paste the URL. No file upload needed at all.</li>
          </ul>
        </section>

        {/* Related guides */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Related guides</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/guides/compress-video" className="text-accent hover:underline">How to Reduce Video File Sizes for EchoMe</a>
            </li>
            <li>
              <a href="/guides/email-upload" className="text-accent hover:underline">Uploading Content via Email</a>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <a
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors"
          >
            Go to EchoMe &rarr;
          </a>
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
