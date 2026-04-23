import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Building Your Knowledge Base | EchoMe Guide',
  description: 'Your knowledge base is what makes EchoMe sound like you. Learn how to add content sources, train your voice, and improve your voice strength score.',
  keywords: ['echome knowledge base', 'voice training', 'content context', 'ai voice matching', 'voice profile'],
  alternates: { canonical: 'https://tryechome.com/guides/knowledge-base' },
};

export default function KnowledgeBaseGuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Building Your Knowledge Base',
    description: 'Your knowledge base is what makes EchoMe sound like you. Learn how to add content sources, train your voice, and improve your voice strength score.',
    url: 'https://tryechome.com/guides/knowledge-base',
    datePublished: '2026-04-15',
    dateModified: '2026-04-15',
    author: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: 'https://tryechome.com' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
        { '@type': 'ListItem', position: 3, name: 'Knowledge Base', item: 'https://tryechome.com/guides/knowledge-base' },
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
          Building Your Knowledge Base
        </h1>
        <p className="text-lg text-text-secondary mb-2">
          Your knowledge base is what makes EchoMe sound like you. It&apos;s the &ldquo;context&rdquo; in &ldquo;Context is King.&rdquo; The more content you add, the better EchoMe understands your voice, your ideas, and how you communicate.
        </p>
        <p className="text-sm text-text-secondary/70 mb-8">
          3 min read
        </p>

        {/* Hero image */}
        <img
          src="/guide-screenshots/build-your-voice.png"
          alt="EchoMe Build Your Voice"
          className="w-full rounded-xl border border-border mb-8"
        />

        {/* Steps */}
        <section className="space-y-8 mb-10">
          <Step number={1} title="Go to Build Your Voice in the sidebar">
            <p>Open the sidebar and click <strong className="text-text-primary">Build Your Voice</strong>. This is where all your content sources live &mdash; everything EchoMe uses to learn how you write and speak.</p>
          </Step>

          <Step number={2} title="Add content using the unified input">
            <p>The page features a single unified input where you can paste YouTube links, blog URLs, drop documents, or type text directly. Each source gives EchoMe more context about your voice, style, and ideas.</p>
          </Step>

          <Step number={3} title="Upload emails from Gmail">
            <p>Import emails directly from Gmail to teach EchoMe how you communicate in professional settings. See the <a href="/guides/email-upload" className="text-accent hover:underline">Email Upload guide</a> for detailed steps.</p>
          </Step>

          <Step number={4} title="The more you add, the better">
            <p>EchoMe gets better at matching your voice with every piece of content you add. Your tone, vocabulary, sentence structure, and ideas all become part of your voice profile.</p>
          </Step>

          <Step number={5} title="Check your voice strength score">
            <p>Your voice strength score (0&ndash;100) improves as you add more content. Check it on your profile to see how well EchoMe knows your voice. Higher scores mean more accurate voice matching across all generated content.</p>
          </Step>
        </section>

        {/* Tips */}
        <div className="space-y-3 mb-10">
          <Tip>Quality matters more than quantity. 5 well-written blog posts teach EchoMe more than 50 random emails.</Tip>
          <Tip>Your knowledge base is private. EchoMe never shares your content with other users.</Tip>
        </div>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-text-secondary mb-4">Ready to build your voice profile?</p>
          <a href="/auth/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors">Start Free &mdash; 2 Generations</a>
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
