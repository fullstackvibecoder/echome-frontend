import type { Metadata } from 'next';
import Link from 'next/link';
import { Video, Mail, Monitor, Film, Youtube, Mic, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guides | EchoMe',
  description:
    'Step-by-step guides and video walkthroughs to help you get the most out of EchoMe. Platform overview, video content, YouTube repurposing, voice profile building, email uploads, and file compression.',
  openGraph: {
    title: 'EchoMe Guides',
    description: 'Video walkthroughs and step-by-step guides for EchoMe.',
    url: 'https://tryechome.com/guides',
  },
  alternates: {
    canonical: 'https://tryechome.com/guides',
  },
};

const guides = [
  {
    slug: 'platform-overview',
    icon: <Monitor className="w-6 h-6" />,
    title: 'EchoMe Platform Overview',
    description:
      'A complete walkthrough of the platform. Three input methods, video processing, clip editing, captions, content generation, and building your voice.',
    category: 'Getting Started',
    readTime: '8 min',
    hasVideo: true,
  },
  {
    slug: 'build-your-voice',
    icon: <Mic className="w-6 h-6" />,
    title: 'How to Build Your Voice Profile',
    description:
      'Train EchoMe to write in your voice. Upload videos, import social media, add emails and blog posts to your Knowledge Base.',
    category: 'Getting Started',
    readTime: '5 min',
    hasVideo: false,
  },
  {
    slug: 'video-content',
    icon: <Film className="w-6 h-6" />,
    title: 'Creating and Managing Video Content',
    description:
      'Upload videos, use external links, edit clips with captions, and generate a full content kit from a single video.',
    category: 'Features',
    readTime: '5 min',
    hasVideo: true,
  },
  {
    slug: 'youtube-to-content',
    icon: <Youtube className="w-6 h-6" />,
    title: 'Turn YouTube Videos into Content',
    description:
      'Paste any YouTube link and get clips, carousels, LinkedIn posts, Instagram content, newsletters, and more. All in your voice.',
    category: 'Features',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'email-upload',
    icon: <Mail className="w-6 h-6" />,
    title: 'How to Upload Emails to EchoMe',
    description:
      'Export your sent emails from Gmail using Google Takeout and upload them to train your voice profile. Only takes a few minutes.',
    category: 'Getting Started',
    readTime: '3 min',
    hasVideo: true,
  },
  {
    slug: 'compress-video',
    icon: <Video className="w-6 h-6" />,
    title: 'How to Reduce Video File Sizes',
    description:
      'Free tools and step-by-step instructions to compress your videos before uploading. Keep quality, shrink the file, faster uploads.',
    category: 'Getting Started',
    readTime: '3 min',
    hasVideo: true,
  },
];

export default function GuidesIndexPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'EchoMe Guides',
    description: 'Step-by-step guides and video walkthroughs for EchoMe.',
    url: 'https://tryechome.com/guides',
    isPartOf: { '@type': 'WebSite', name: 'EchoMe', url: 'https://tryechome.com' },
    hasPart: guides.map((g) => ({
      '@type': 'Article',
      name: g.title,
      url: `https://tryechome.com/guides/${g.slug}`,
      description: g.description,
    })),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://tryechome.com' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://tryechome.com/guides' },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-4">
          <a href="/" className="text-sm text-accent hover:underline">&larr; Back to EchoMe</a>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
          Guides
        </h1>
        <p className="text-lg text-text-secondary mb-10">
          Step-by-step walkthroughs to help you get the most out of EchoMe. Each guide includes a video and written instructions.
        </p>

        {/* Guide cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group block p-6 bg-bg-secondary border border-border rounded-xl hover:border-accent hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  {guide.icon}
                </div>
                <span className="text-xs text-text-secondary bg-bg-primary px-2 py-0.5 rounded-full">
                  {guide.category}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
                {guide.title}
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                {guide.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{guide.readTime} read</span>
                  {guide.hasVideo && (
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" /> Video included
                    </span>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>

        {/* For realtors CTA */}
        <div className="p-6 bg-bg-secondary border border-border rounded-xl text-center">
          <p className="text-text-secondary text-sm mb-2">Are you a real estate agent?</p>
          <Link href="/realtors" className="text-accent font-semibold hover:underline">
            See how EchoMe works for real estate &rarr;
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6 mt-12 text-center text-xs text-text-secondary">
          <p>Need more help? Use the chat widget in the bottom-right corner of any EchoMe page.</p>
        </footer>
      </div>
    </div>
  );
}
