'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/json-ld';

const faqCategories = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is EchoMe?',
        a: 'EchoMe is an AI content creation platform that turns your videos into ready-to-post content that sounds like you wrote it. Upload a video, paste a YouTube link, or type a prompt, and EchoMe generates social posts, captioned clips, carousel slides, and more — all matched to your unique voice and writing style.',
      },
      {
        q: 'How do I create my first content?',
        a: 'Sign up with your email or Google account, then choose one of three input methods: upload a video file, paste a YouTube link, or use Quick Create to type or speak your idea. EchoMe processes your input and generates a complete Content Kit with clips, social posts, and carousels. Your first 3 generations are free — no credit card required.',
      },
      {
        q: 'What input types does EchoMe accept?',
        a: 'EchoMe accepts video files (MP4, MOV, WebM up to 4GB), YouTube links (standard, shorts, and youtu.be formats), typed or pasted text prompts, and voice recordings. You can also repurpose existing posts from one platform to another.',
      },
      {
        q: 'Is EchoMe free to use?',
        a: 'Yes. EchoMe includes a free plan with 3 free generations, voice matching, 1 platform per generation, and standard templates. No credit card is required to get started. Paid plans start at $37/month for more processing hours, clips, and features.',
      },
    ],
  },
  {
    category: 'Video & Content',
    questions: [
      {
        q: 'What video sources are supported?',
        a: 'EchoMe supports direct file uploads in MP4, MOV, and WebM formats, as well as YouTube link imports (standard links, shorts, and youtu.be links). Videos between 2 and 60 minutes work best for clip extraction, with a maximum file size of 4GB on most plans.',
      },
      {
        q: 'How long does processing take?',
        a: 'Most videos are fully processed in 3 to 8 minutes. Longer videos (30+ minutes) or YouTube imports with retries may take up to 15 minutes. You can navigate away during processing — EchoMe will notify you when your Content Kit is ready.',
      },
      {
        q: 'Can I use password-protected Zoom recordings?',
        a: 'Yes. EchoMe supports password-protected Zoom cloud recordings. When you paste a Zoom recording link, you will be prompted to enter the recording password. EchoMe downloads and processes the recording the same way as any other video source.',
      },
      {
        q: "What's included in a Content Kit?",
        a: 'Every Content Kit includes video clips with auto-generated captions scored by engagement potential, social posts written in your voice for LinkedIn, Twitter, and Instagram, carousel slides in square and portrait formats, and a full transcript of your video. Each clip comes with a thumbnail, transcript, and suggested caption.',
      },
      {
        q: 'What caption styles are available?',
        a: 'EchoMe offers multiple caption styles including Modern, Big and Bold, Color Pop, Karaoke, Underline, One at a Time, Subtitle Bar, and Clean and Simple. All captions are synced at the word level for precise timing. You can position captions at the bottom, center, or top of your clips.',
      },
    ],
  },
  {
    category: 'Voice & Knowledge',
    questions: [
      {
        q: 'How does voice matching work?',
        a: 'Your voice profile is built from everything in your Knowledge Base. EchoMe analyzes your writing patterns, vocabulary, sentence structure, tone, and perspective across all your content sources. The more content you provide — blog posts, social media, emails, voice recordings — the stronger and more authentic the voice match becomes.',
      },
      {
        q: 'What is the Knowledge Base?',
        a: 'The Knowledge Base is where EchoMe learns how you communicate. You can add content by pasting text directly, importing URLs from blog posts or articles, uploading documents (PDF, DOCX, TXT), importing email archives (MBOX), or recording voice samples. Each source helps EchoMe understand a different dimension of your communication style.',
      },
      {
        q: 'How do I improve my voice match score?',
        a: 'Add at least 5 to 10 content sources to your Knowledge Base for a strong voice match. Use a variety of source types — past blog posts, social media content, emails, and voice recordings. The more varied your sources, the better EchoMe captures your full range. Your Knowledge Base screen shows a voice strength indicator to track your progress.',
      },
    ],
  },
  {
    category: 'Creator Radar',
    questions: [
      {
        q: 'What is Creator Radar?',
        a: 'Creator Radar lets you discover and repurpose content from other creators in your niche. Browse trending videos, find relevant content, and turn it into your own posts — rewritten in your voice with your perspective. It is a way to stay active on social media even when you do not have new videos of your own.',
      },
      {
        q: 'Is repurposing the same as copying?',
        a: 'No. EchoMe does not copy or plagiarize content. When you repurpose a video through Creator Radar, EchoMe uses the video as a topic source and generates entirely new content written in your voice with your unique perspective. The output is original content inspired by the topic, not a rewrite of someone else\'s words.',
      },
    ],
  },
  {
    category: 'Plans & Billing',
    questions: [
      {
        q: 'What plans are available?',
        a: 'EchoMe offers a free plan (3 generations, no credit card required), Echo ($37/mo), Echo Studio ($87/mo), and Echo Teams ($47/voice/mo with a 2-voice minimum, scales up from there). Paid plans offer increasing processing hours, clips per video, Knowledge Base slots, export quality, and Creator Library access.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time from your Settings page. Billing is handled securely through Stripe. EchoMe does not store your card details on its servers. There are no long-term contracts or cancellation fees.',
      },
      {
        q: 'What happens to my content if I downgrade?',
        a: 'Your existing content remains accessible in your Library after a downgrade. You keep everything you have already generated. However, your generation limits, export quality, and Knowledge Base slots will adjust to match your new plan. You can always upgrade again to restore full access.',
      },
    ],
  },
];

const allQuestions = faqCategories.flatMap((cat) => cat.questions);

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allQuestions.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
};

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
    { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://tryechome.com/faq' },
  ],
};

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenIndex((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Back link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to EchoMe
          </Link>
        </div>

        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground mb-10">
          Find answers to common questions about EchoMe&apos;s AI content creation platform.
        </p>

        {/* FAQ sections */}
        <div className="space-y-10">
          {faqCategories.map((category) => (
            <section key={category.category}>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {category.category}
              </h2>
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {category.questions.map((item, qIdx) => {
                  const key = `${category.category}-${qIdx}`;
                  const isOpen = openIndex === key;
                  return (
                    <div key={key} className="bg-card">
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-medium text-foreground">
                          {item.q}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-card border border-border rounded-xl text-center">
          <p className="text-muted-foreground text-sm mb-2">
            Still have questions?
          </p>
          <a
            href="mailto:support@tryechome.com"
            className="text-accent font-semibold hover:underline"
          >
            Contact support@tryechome.com
          </a>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-12 text-center text-xs text-muted-foreground">
          <div className="flex justify-center gap-4">
            <Link href="/support" className="hover:text-accent transition-colors">
              Support
            </Link>
            <Link href="/guides" className="hover:text-accent transition-colors">
              Guides
            </Link>
            <Link href="/privacy" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-accent transition-colors">
              Terms of Service
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
