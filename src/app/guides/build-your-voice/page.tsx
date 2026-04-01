import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Build Your Voice Profile in EchoMe | Guide',
  description: 'Train EchoMe to write in your voice. Upload videos, import social media, add emails and blog posts to your Knowledge Base. The more you add, the more it sounds like you.',
  keywords: ['ai content in my voice', 'train ai writing style', 'personal brand content generator', 'ai that sounds like me', 'voice matching AI', 'knowledge base for AI writing'],
  alternates: { canonical: 'https://tryechome.com/guides/build-your-voice' },
};

export default function BuildYourVoiceGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Build Your Voice Profile in EchoMe',
    description: 'Train EchoMe to write in your voice. Upload videos, import social media, add emails and blog posts to your Knowledge Base. The more you add, the more it sounds like you.',
    url: 'https://tryechome.com/guides/build-your-voice',
    datePublished: '2026-04-01',
    dateModified: '2026-04-01',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Build Your Voice', item: 'https://tryechome.com/guides/build-your-voice' },
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
          How to Build Your Voice Profile in EchoMe
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Your Knowledge Base is what makes EchoMe different from every other AI writing tool. It learns your tone, vocabulary, sentence structure, and communication style from your existing content. The more you feed it, the more the output sounds like you wrote it yourself.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          5 min read
        </p>

        {/* Callout box */}
        <div className="mb-10 p-5 bg-accent/5 border border-accent/20 rounded-xl">
          <p className="text-sm text-text-secondary">For a full video walkthrough of this feature, watch the <a href="/guides/platform-overview" className="text-accent font-medium hover:underline">platform overview guide</a>.</p>
        </div>

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="What is the Knowledge Base?">
            <p>The Knowledge Base (called &quot;Build Your Voice&quot; in the app) is where EchoMe stores and analyzes your content. It maps your unique voice across dimensions like phrases, style, naturalness, and voice match. Think of it as teaching an AI how you think and communicate.</p>
          </Step>

          <Step number={2} title="Connect your socials">
            <p>Import content from YouTube or Instagram. Paste a channel URL or profile link. EchoMe pulls your posts and analyzes them for voice patterns. Your social posts are some of the best training data because they show how you naturally communicate.</p>
          </Step>

          <Step number={3} title="Import your writing">
            <p>Upload PDFs, Word docs, or text files. Import blog posts by pasting your blog URL &mdash; EchoMe auto-discovers RSS feeds. Import sent emails via <a href="/guides/email-upload" className="text-accent hover:underline">Google Takeout</a>. Or paste any text directly.</p>
          </Step>

          <Step number={4} title="Record a voice note">
            <p>Click &quot;Start Talking&quot; and speak naturally about any topic for 2+ minutes. EchoMe transcribes and analyzes your speaking patterns. This captures cadence, rhythm, and word choice that written content sometimes misses.</p>
          </Step>

          <Step number={5} title="How voice matching works">
            <p>EchoMe analyzes your content across 5 dimensions: phrases you use, writing style, cleanliness, naturalness, and voice match. Your voice strength score (0&ndash;100) shows how well Echo can replicate your voice. Each source you add strengthens the profile.</p>
          </Step>

          <Step number={6} title="Tips for best results">
            <ul className="list-disc list-inside space-y-1">
              <li>Add at least 3 different content sources &mdash; variety helps.</li>
              <li>Emails are gold because they show how you really communicate.</li>
              <li>Include both long-form (blog posts, articles) and short-form (social posts, emails).</li>
              <li>Voice recordings capture patterns that text alone misses.</li>
              <li>Update regularly as your voice evolves.</li>
            </ul>
          </Step>

          <Step number={7} title="Checking your voice strength">
            <p>Go to Build Your Voice in the sidebar. Your voice strength shows as a score with a visual waveform. Ask Echo about your voice:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>&quot;How close is the match?&quot;</li>
              <li>&quot;Describe my style&quot;</li>
              <li>&quot;What am I missing?&quot;</li>
            </ul>
            <p className="mt-2">Use these prompts to identify gaps in your training data.</p>
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
