import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Creator Radar: Repurpose Other Creators\' Videos | EchoMe Guide',
  description: 'Follow creators in your niche from Creator Radar and repurpose their videos into original content written in your voice. Their ideas, your context, your words.',
  keywords: ['echome creator radar', 'repurpose content', 'follow creators', 'content repurposing', 'ai content'],
  alternates: { canonical: 'https://tryechome.com/guides/creator-radar' },
};

export default function CreatorRadarGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Creator Radar: Repurpose Other Creators\' Videos',
    description: 'Follow creators in your niche from Creator Radar and repurpose their videos into original content written in your voice. Their ideas, your context, your words.',
    url: 'https://tryechome.com/guides/creator-radar',
    datePublished: '2026-04-15',
    dateModified: '2026-04-18',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Creator Radar', item: 'https://tryechome.com/guides/creator-radar' },
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
          Creator Radar: Repurpose Other Creators&apos; Videos
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Follow creators in your niche and turn their latest videos into original content, written in your voice, grounded in your context. Same ideas, your words.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/following.png"
          alt="EchoMe Creator Radar"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Callout box */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary"><strong>Important:</strong> This is NOT copying. The output is original because the perspective is yours. EchoMe uses their ideas as a starting point, then writes everything through your voice, your style, and your framing.</p>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Go to Creator Radar">
            <p>Open <strong>Creator Radar</strong> from the sidebar under Discover. This is your feed for staying on top of what creators in your space are publishing.</p>
          </Step>

          <Step number={2} title="Follow creators in your niche">
            <p>Search for creators by name or paste their channel URL directly. Once you follow a creator, their new video content will appear in your Creator Radar feed automatically.</p>
          </Step>

          <Step number={3} title="New videos appear in your feed">
            <p>When a creator you follow posts new video content, it shows up in your Creator Radar feed. You&apos;ll see the video title, thumbnail, and publish date. No need to check YouTube manually.</p>
          </Step>

          <Step number={4} title="Hit Repurpose on any video">
            <p>Click Repurpose on any video in your feed. EchoMe generates a full Content Kit from their video, grounded in YOUR voice and YOUR context. The result uses your style, your framing, and your perspective.</p>
          </Step>

          <Step number={5} title="Review and edit">
            <p>Open the generated Content Kit just like any other. The clips, posts, blog drafts, and emails are all written as if you made the content yourself. Edit anything, export clips, and publish on your schedule.</p>
            <Tip>This is NOT copying. The output is original because the perspective is yours. Their ideas, your context, your voice.</Tip>
          </Step>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to turn trending content into your own?</p>
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
