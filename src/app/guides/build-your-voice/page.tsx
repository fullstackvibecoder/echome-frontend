import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'How EchoMe Reads Your Voice | Guide',
  description: 'EchoMe writes in your voice by reading what you have already published. Drop videos, social media, emails, and blog posts into your Knowledge Base. The more it reads, the more it sounds like you.',
  keywords: ['ai content in my voice', 'train ai writing style', 'personal brand content generator', 'ai that sounds like me', 'voice matching AI', 'knowledge base for AI writing'],
  alternates: { canonical: 'https://tryechome.com/guides/build-your-voice' },
};

export default function BuildYourVoiceGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How EchoMe Reads Your Voice',
    description: 'Train EchoMe to write in your voice. Upload videos, import social media, add emails and blog posts to your Knowledge Base. The more you add, the more it sounds like you.',
    url: 'https://tryechome.com/guides/build-your-voice',
    datePublished: '2026-04-01',
    dateModified: '2026-10-31',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Your Voice', item: 'https://tryechome.com/guides/build-your-voice' },
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
          How EchoMe Reads Your Voice
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Your Knowledge Base is what makes EchoMe different from every other AI writing tool. It learns your tone, vocabulary, sentence structure, and communication style from your existing content. The more you feed it, the more the output sounds like you wrote it yourself.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          5 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/build-your-voice.png"
          alt="EchoMe Your Voice"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Callout box */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary">For a full video walkthrough of this feature, watch the <a href="/guides/platform-overview" className="text-accent font-medium hover:underline">platform overview guide</a>.</p>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="What is Your Voice?">
            <p>Your Voice is where EchoMe stores and analyzes your content. It maps your unique voice across five dimensions: signature phrases, avoid phrases, writing style, AI-phrase cleanliness, and semantic similarity to your past content. Think of it as teaching an AI how you think and communicate.</p>
            <p className="mt-2">To open it, use the voice profile strip on the Create page, or go straight to <strong>/app/voice</strong>. There is no sidebar link for it.</p>
            <Tip>When you sign up, EchoMe runs a &quot;Work Before The Work&quot; pass that automatically builds your starting voice profile and knowledge base from your existing content. Paid users get this refreshed every Monday to keep both current. You can keep adding sources below at any time.</Tip>
          </Step>

          <Step number={2} title="Use the Echo bar to add content">
            <p>You add content through the Echo bar on the Create page. It says <em>&quot;Talk, type, or drop a file.&quot;</em> Paste a YouTube channel URL, Instagram profile link, or blog URL, type or paste text, or attach a file with the <strong>paperclip</strong>. Echo shows what it plans to do. Check that it says <strong>Adding to your Voice</strong>, then click <strong>Add to Voice</strong>.</p>
            <Tip>Uploading or linking any of your own videos trains both your voice profile and your knowledge base at the same time. You get stronger voice matching and better content recall from a single ingest.</Tip>
          </Step>

          <Step number={3} title="Import your writing">
            <p>Attach PDFs, Word docs, or text files with the paperclip. PDFs and Word docs can be up to 500MB, and .txt or .md files up to 1MB. Import blog posts by pasting your blog URL. EchoMe auto-discovers RSS feeds, with a sitemap fallback for static blogs (Hugo, Astro) that don&apos;t expose an RSS feed. Import sent emails via <a href="/guides/email-upload" className="text-accent hover:underline">Google Takeout</a>. Or paste any text directly.</p>
            <Tip>Email import is included on every plan. Echo keeps up to 100 emails from each upload.</Tip>
          </Step>

          <Step number={4} title="Add your spoken voice">
            <p>Two ways. Click the <strong>mic button</strong> in the Echo bar (&quot;Record your voice&quot;) and speak for up to 2 minutes. EchoMe turns it into text in the bar so you can add it. Or attach an audio file (mp3, m4a, wav, ogg, or flac, up to 250MB). EchoMe transcribes it and learns from how you speak. This captures cadence, rhythm, and word choice that written content sometimes misses.</p>
          </Step>

          <Step number={5} title="How voice matching works">
            <p>EchoMe scores your content across five dimensions:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Signature phrases</strong>: the words and phrases you reach for naturally</li>
              <li><strong>Avoid phrases</strong>: words and phrases you&apos;ve explicitly told Echo to skip</li>
              <li><strong>Writing style</strong>: sentence length, rhythm, formality, contractions</li>
              <li><strong>AI-phrase cleanliness</strong>: how clear the output is of generic AI giveaways</li>
              <li><strong>Semantic similarity</strong>: how close the output is to your past content in meaning</li>
            </ul>
            <p className="mt-2">Your voice strength score (0&ndash;100) shows how well Echo can replicate your voice. Each source you add strengthens the profile.</p>
          </Step>

          <Step number={6} title="Train it as you use it (thumbs up/down)">
            <p>Every generated piece (LinkedIn post, blog draft, carousel slide) has a thumbs widget. Thumbs up the outputs that sound like you, thumbs down the ones that don&rsquo;t. The system trains on both: for 30 days, the patterns you flagged as off get excluded from future generations. The voice gets closer to yours every week you use it.</p>
          </Step>

          <Step number={7} title="Tips for best results">
            <ul className="list-disc list-inside space-y-1">
              <li>Add at least 3 different content sources. Variety helps.</li>
              <li>Emails are gold because they show how you really communicate.</li>
              <li>Include both long-form (blog posts, articles) and short-form (social posts, emails).</li>
              <li>Voice recordings capture patterns that text alone misses.</li>
              <li>Update regularly as your voice evolves.</li>
            </ul>
          </Step>

          <Step number={8} title="Checking your voice strength">
            <p>Open <strong>Your Voice</strong>. The header shows your voice strength as a tier (Seed, Growing, Strong, or Signature), a 0&ndash;100 score, and a small waveform. Click <strong>Sources</strong> at the bottom of the page to see what Echo has read and where you&apos;re thin. To ask Echo about your voice, use the Echo bar. Questions like &quot;how close is the match?&quot;, &quot;describe my style&quot;, or &quot;what am I missing?&quot; work well to identify gaps in your training data.</p>
          </Step>
        </section>

        {/* Related guides */}
        <section className="mb-10 p-5 bg-bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Related guides</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="/guides/youtube-to-content" className="text-accent hover:underline">Turn YouTube Videos into Social Media Content</a></li>
            <li><a href="/guides/email-upload" className="text-accent hover:underline">How to Upload Emails to Your Knowledge Base</a></li>
            <li><a href="/guides/compress-video" className="text-accent hover:underline">How to Reduce Video File Sizes for EchoMe</a></li>
          </ul>
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
