import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Reduce Video File Sizes for EchoMe | Guide',
  description: 'Free tools and step-by-step instructions to compress your video files before uploading to EchoMe. Keep quality, shrink the file.',
  alternates: { canonical: 'https://tryechome.com/guides/compress-video' },
};

export default function CompressVideoGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Reduce Video File Sizes for Uploading to EchoMe',
    description: 'Free tools and step-by-step instructions to compress your video files before uploading to EchoMe.',
    url: 'https://tryechome.com/guides/compress-video',
    datePublished: '2026-04-01',
    dateModified: '2026-04-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    video: {
      '@type': 'VideoObject',
      name: 'How to Reduce Video File Sizes for EchoMe - Video Walkthrough',
      description: 'Video walkthrough of free tools to compress video files before uploading to EchoMe.',
      thumbnailUrl: 'https://cdn.loom.com/sessions/thumbnails/0268f787bbfe47a683712c79a1b1cb13-with-play.gif',
      embedUrl: 'https://www.loom.com/embed/0268f787bbfe47a683712c79a1b1cb13',
      uploadDate: '2026-04-01',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Compress Video', item: 'https://tryechome.com/guides/compress-video' },
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
          How to Reduce Video File Sizes for EchoMe
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Uploading a 2GB+ video file will be slow, may time out, and won&apos;t produce better results. Here&apos;s how to compress your videos to under 500MB without losing quality &mdash; for free.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read &middot; Video walkthrough included
        </p>

        {/* Video embed */}
        <div className="mb-10 rounded-xl overflow-hidden border border-border">
          <div style={{ position: 'relative', paddingBottom: '64.98%', height: 0 }}>
            <iframe
              src="https://www.loom.com/embed/0268f787bbfe47a683712c79a1b1cb13"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              title="How to Reduce Video File Sizes for EchoMe - Video Walkthrough"
            />
          </div>
        </div>

        {/* Why this matters */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Why file size matters</h2>
          <p className="text-text-secondary mb-3">
            A 50-minute Zoom recording can be anywhere from 200MB to 10GB depending on how it was recorded. EchoMe doesn&apos;t need that raw quality &mdash; it&apos;s analyzing your <strong className="text-text-primary">speech patterns and ideas</strong>, not pixel-perfect video.
          </p>
          <p className="text-text-secondary">
            Compressing a video from 2GB to 300MB takes a couple of minutes and makes your upload faster, more reliable, and produces the exact same results. <strong className="text-text-primary">Aim for under 500MB.</strong>
          </p>
        </section>

        {/* Pro tip: use a URL instead */}
        <section className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Even better: paste a URL instead</h2>
          <p className="text-sm text-text-secondary">
            If your video is already on YouTube, Vimeo, Loom, or TikTok, just paste the link into EchoMe. No upload needed &mdash; EchoMe will pull the content directly. This is the fastest and most reliable option.
          </p>
        </section>

        {/* Recommended tools */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Free compression tools</h2>

          <div className="space-y-4">
            <ToolCard
              name="HandBrake"
              type="Desktop app (Mac / Windows / Linux)"
              description="The gold standard for video compression. Open source, preset-based, and supports modern codecs like H.265. It looks old-school, but it works incredibly well."
              bestFor="Large files (500MB+), batch processing, maximum control over output quality."
              link="https://handbrake.fr"
            />

            <ToolCard
              name="VLC Media Player"
              type="Desktop app (Mac / Windows / Linux)"
              description="You probably already have VLC installed as a video player. It can also compress videos: go to Media > Convert/Save, pick your file, and choose a smaller output profile."
              bestFor="Quick one-off compressions when you already have VLC installed."
              link="https://www.videolan.org"
            />

            <ToolCard
              name="FreeConvert.com"
              type="Browser-based (no install)"
              description="Upload your video in the browser, adjust quality settings, and download the compressed version. No software to install. Free tier handles files up to 1GB."
              bestFor="Files under 1GB when you don't want to install anything."
              link="https://www.freeconvert.com/video-compressor"
            />

            <ToolCard
              name="VideoSmaller.com"
              type="Browser-based (no install)"
              description="Dead-simple interface. Upload, pick a compression level, download. Free tier handles files up to 500MB."
              bestFor="Quick compressions under 500MB with zero friction."
              link="https://www.videosmaller.com"
            />
          </div>
        </section>

        {/* Quick guide */}
        <section className="space-y-8 mb-10">
          <h2 className="text-xl font-semibold text-text-primary">Quick guide (using HandBrake)</h2>

          <Step number={1} title="Download and open HandBrake">
            <p>Install HandBrake from handbrake.fr. Open it and drag your video file onto the window, or click <strong>Open Source</strong> to browse for it.</p>
          </Step>

          <Step number={2} title="Pick a preset">
            <p>In the Presets panel, choose <strong>&quot;Fast 720p30&quot;</strong> or <strong>&quot;Fast 1080p30&quot;</strong>. For talking-head content (podcasts, Zoom calls, interviews), 720p is more than enough and will dramatically reduce file size.</p>
            <Tip>EchoMe analyzes your speech, not your video resolution. 720p is plenty.</Tip>
          </Step>

          <Step number={3} title="Start the encode">
            <p>Click <strong>Start</strong>. HandBrake will compress your video. A 2GB file typically shrinks to 200-400MB in a few minutes.</p>
          </Step>

          <Step number={4} title="Upload to EchoMe">
            <p>Take your compressed file and upload it to EchoMe. It&apos;ll upload faster, process faster, and produce the same quality results.</p>
          </Step>
        </section>

        {/* Common mistakes */}
        <section className="mb-10 p-5 bg-bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Common mistakes to avoid</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><strong className="text-text-primary">Uploading raw recordings:</strong> Screen recorders and cameras often save in bloated formats. A 30-minute Zoom call shouldn&apos;t be 5GB &mdash; compress it first.</li>
            <li><strong className="text-text-primary">Retrying failed uploads:</strong> If a large file fails to upload, don&apos;t try again with the same file. Compress it first, then retry.</li>
            <li><strong className="text-text-primary">Thinking bigger = better:</strong> EchoMe extracts your voice patterns from the audio. A 4K video gives the same results as 720p but takes 10x longer to upload.</li>
            <li><strong className="text-text-primary">Forgetting about URLs:</strong> If your video is already on YouTube or Vimeo, just paste the link. No upload needed at all.</li>
          </ul>
        </section>

        {/* Size reference */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text-primary mb-3">File size reference</h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-secondary">
                  <th className="text-left px-4 py-2 font-medium text-text-primary">Video length</th>
                  <th className="text-left px-4 py-2 font-medium text-text-primary">Raw size (typical)</th>
                  <th className="text-left px-4 py-2 font-medium text-text-primary">After compression</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-t border-border">
                  <td className="px-4 py-2">10 minutes</td>
                  <td className="px-4 py-2">500MB &ndash; 2GB</td>
                  <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">50 &ndash; 150MB</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">30 minutes</td>
                  <td className="px-4 py-2">1.5GB &ndash; 5GB</td>
                  <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">150 &ndash; 350MB</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-2">60 minutes</td>
                  <td className="px-4 py-2">3GB &ndash; 10GB</td>
                  <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">300 &ndash; 500MB</td>
                </tr>
              </tbody>
            </table>
          </div>
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

function ToolCard({ name, type, description, bestFor, link }: {
  name: string;
  type: string;
  description: string;
  bestFor: string;
  link: string;
}) {
  return (
    <div className="p-4 bg-bg-secondary rounded-xl border border-border">
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-text-primary">{name}</h3>
        <span className="text-xs text-text-secondary bg-bg-primary px-2 py-0.5 rounded-full">{type}</span>
      </div>
      <p className="text-sm text-text-secondary mb-2">{description}</p>
      <p className="text-xs text-text-secondary"><strong className="text-text-primary">Best for:</strong> {bestFor}</p>
      <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-accent hover:underline">
        {link.replace('https://www.', '').replace('https://', '')} &rarr;
      </a>
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
