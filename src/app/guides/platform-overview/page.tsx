import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'EchoMe Platform Overview | Guide',
  description: 'A complete walkthrough of the EchoMe platform. Learn about the unified Create input, video processing, clip editing, caption customization, content generation, and building your voice profile.',
  alternates: { canonical: 'https://tryechome.com/guides/platform-overview' },
};

export default function PlatformOverviewGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'EchoMe Platform Overview',
    description: 'A complete walkthrough of the EchoMe platform. Learn about the unified Create input, video processing, clip editing, caption customization, content generation, and building your voice profile.',
    url: 'https://tryechome.com/guides/platform-overview',
    datePublished: '2026-04-01',
    dateModified: '2026-04-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    video: {
      '@type': 'VideoObject',
      name: 'EchoMe Platform Overview - Video Walkthrough',
      description: 'A complete video walkthrough of the EchoMe platform covering input methods, video processing, captions, content generation, and voice profile building.',
      thumbnailUrl: 'https://cdn.loom.com/sessions/thumbnails/136ee8a0709e44eaa5a2ba128d3ab624-with-play.gif',
      embedUrl: 'https://www.loom.com/embed/136ee8a0709e44eaa5a2ba128d3ab624',
      uploadDate: '2026-04-01',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Platform Overview', item: 'https://tryechome.com/guides/platform-overview' },
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
          EchoMe Platform Overview
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          A complete walkthrough of everything EchoMe can do &mdash; from uploading your first video to generating platform-ready content in your voice.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          10 min read &middot; Video walkthrough included
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
              title="EchoMe Platform Overview - Video Walkthrough"
            />
          </div>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="One input, every format">
            <p className="mb-2">The Create page has a single unified input. You can:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-text-primary">Paste a link</strong> &mdash; YouTube, Zoom, Loom, Vimeo, TikTok, or Riverside. EchoMe auto-detects the platform.</li>
              <li><strong className="text-text-primary">Type a topic</strong> &mdash; Describe an idea, paste an article, or write a prompt.</li>
              <li><strong className="text-text-primary">Drop a video file</strong> &mdash; Drag and drop directly onto the input.</li>
              <li><strong className="text-text-primary">Record a voice note</strong> &mdash; Use the mic button in the toolbar to speak your idea.</li>
            </ul>
            <Tip>All input methods produce the same quality output. Pick whichever fits your workflow.</Tip>
          </Step>

          <Step number={2} title="Video upload guidelines">
            <p className="mb-2">Keep your video files under 500MB for the fastest processing. Avoid 4K recordings &mdash; 1080p or 720p is ideal for EchoMe since it analyzes your speech, not pixel quality.</p>
            <p>Use <strong className="text-text-primary">HandBrake</strong> (free desktop app) or <strong className="text-text-primary">FreeConvert.com</strong> (browser-based) to compress before uploading.</p>
            <Tip>See the full compression guide at <a href="/guides/compress-video" className="text-accent hover:underline">How to Compress Videos for EchoMe</a>.</Tip>
          </Step>

          <Step number={3} title="Paste a video link instead">
            <p className="mb-2">Instead of uploading a file, you can paste a URL from any of these platforms:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>YouTube</li>
              <li>Vimeo</li>
              <li>Loom</li>
              <li>Zoom</li>
              <li>TikTok</li>
              <li>Riverside</li>
            </ul>
            <p className="mt-2">Just paste the URL into the Create input and hit submit. No separate upload step needed. If your Zoom recording requires a passcode, a field will appear below the input when you paste a Zoom link.</p>
            <Tip>YouTube links may be intermittent due to platform restrictions. If a YouTube link fails, try downloading the video and uploading the file directly.</Tip>
          </Step>

          <Step number={4} title="Video clip dashboard">
            <p className="mb-2">After processing, EchoMe automatically extracts the best clips from your video. Each clip receives a virality score so you can prioritize the strongest moments.</p>
            <p>When multiple speakers are detected, EchoMe generates both single-speaker and split-screen views so you can choose the best format for each platform.</p>
          </Step>

          <Step number={5} title="8 caption styles">
            <p className="mb-2">Choose from eight caption styles to match your brand:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Modern</li>
              <li>Big &amp; Bold</li>
              <li>Color Pop</li>
              <li>Karaoke</li>
              <li>Underline</li>
              <li>One at a Time</li>
              <li>Subtitle Bar</li>
              <li>Clean &amp; Simple</li>
            </ul>
            <p className="mt-2">Position captions at the top, center, or bottom of the frame. Preview everything in real-time before downloading.</p>
          </Step>

          <Step number={6} title="Written content for every platform">
            <p className="mb-2">EchoMe generates ready-to-post written content for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>LinkedIn</li>
              <li>Facebook</li>
              <li>Instagram</li>
              <li>X / Twitter</li>
              <li>Newsletter</li>
              <li>Blog</li>
            </ul>
            <p className="mt-2">Each post is written in your voice based on your voice profile. Copy and post directly, or schedule through your preferred tool.</p>
          </Step>

          <Step number={7} title="Your Voice">
            <p className="mb-2">Add sources via the unified input on the Your Voice page so Echo can match your style. You can:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-text-primary">Paste social links</strong> &mdash; Import content from YouTube or Instagram.</li>
              <li><strong className="text-text-primary">Drop files or paste URLs</strong> &mdash; Upload PDFs, articles, blog posts, or emails.</li>
              <li><strong className="text-text-primary">Record a voice note</strong> &mdash; Use the mic button in the toolbar. Just talk. Echo figures out the rest.</li>
            </ul>
            <p className="mt-2">The more content you add, the better the voice matching becomes. EchoMe learns your tone, vocabulary, sentence structure, and perspective over time.</p>
          </Step>

          <Step number={8} title="Content ideas from your voice profile">
            <p className="mb-2">Ask Echo for content ideas based on your knowledge base. Use prompts like:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>&quot;How close is the match?&quot;</li>
              <li>&quot;Describe my style&quot;</li>
              <li>&quot;What am I missing?&quot;</li>
            </ul>
            <p className="mt-2">Echo uses everything in your voice profile to suggest topics, angles, and formats that align with how you naturally communicate.</p>
          </Step>

          <Step number={9} title="Follow other creators">
            <p className="mb-2">The <strong className="text-text-primary">Following</strong> feature in the sidebar lets you follow other creators on EchoMe. When they post new videos, you can repurpose their content through your voice and context.</p>
            <p>The output sounds like you, not them. EchoMe applies your voice profile to transform their ideas into your style and perspective.</p>
          </Step>

          <Step number={10} title="Weekly office hours">
            <p>Join live every Wednesday at 11:30 AM ET for support, questions, and tips. Available on the Community page inside EchoMe.</p>
          </Step>
        </section>

        {/* Related guides */}
        <section className="mb-10 p-5 bg-bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Related guides</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/guides/compress-video" className="text-accent hover:underline">How to compress videos</a>
              <span className="text-text-secondary"> &mdash; Reduce file sizes before uploading for faster processing.</span>
            </li>
            <li>
              <a href="/guides/email-upload" className="text-accent hover:underline">How to upload emails</a>
              <span className="text-text-secondary"> &mdash; Import your emails so Echo learns how you communicate.</span>
            </li>
            <li>
              <a href="/guides/video-content" className="text-accent hover:underline">Creating video content</a>
              <span className="text-text-secondary"> &mdash; Get the most out of your video uploads.</span>
            </li>
            <li>
              <a href="/guides/build-your-voice" className="text-accent hover:underline">Building your voice profile</a>
              <span className="text-text-secondary"> &mdash; Train Echo to write in your voice.</span>
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
