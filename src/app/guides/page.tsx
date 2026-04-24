import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import {
  Video,
  Mail,
  Monitor,
  Film,
  Youtube,
  Mic,
  ArrowRight,
  Rocket,
  Package,
  Heart,
  Captions,
  CalendarDays,
  Users,
  BookOpen,
  Lock,
  CreditCard,
  TrendingUp,
  Images,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guides',
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

const guideThumbnails: Record<string, string> = {
  'getting-started': '/guide-screenshots/create-page.png',
  'platform-overview': '/guide-screenshots/create-page.png',
  'build-your-voice': '/guide-screenshots/build-your-voice.png',
  'knowledge-base': '/guide-screenshots/build-your-voice.png',
  'content-kits': '/guide-screenshots/content-kit-detail.png',
  'carousels': '/guide-screenshots/carousel-editor.png',
  'video-content': '/guide-screenshots/create-page.png',
  'reels-and-captions': '/guide-screenshots/reel-maker.png',
  'youtube-to-content': '/guide-screenshots/create-page.png',
  'creator-radar': '/guide-screenshots/following.png',
  'scheduling-posts': '/guide-screenshots/scheduling-clip-post-actions.png',
  'content-calendar': '/guide-screenshots/scheduling-preparing-media.png',
};

const guides = [
  // Getting Started
  {
    slug: 'getting-started',
    icon: <Rocket className="w-6 h-6" />,
    title: 'Getting Started: Your First Content Kit',
    description:
      'Go from sign-up to your first Content Kit in minutes. Upload a video, paste a link, or type a prompt to generate posts, clips, and carousels.',
    category: 'Getting Started',
    readTime: '3 min',
    hasVideo: false,
  },
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
    slug: 'knowledge-base',
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Building Your Knowledge Base',
    description:
      'Add text, URLs, documents, emails, and voice samples to your Knowledge Base. The more context EchoMe has, the better your voice match.',
    category: 'Getting Started',
    readTime: '3 min',
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
  // Features
  {
    slug: 'content-kits',
    icon: <Package className="w-6 h-6" />,
    title: 'Working with Content Kits',
    description:
      'Explore everything inside a Content Kit — Visual Content and Written Content sections with clips, social posts, carousels, and transcripts.',
    category: 'Content',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'carousels',
    icon: <Images className="w-6 h-6" />,
    title: 'Editing Carousels — Text, Style, Layout, Download',
    description:
      'Edit slide text, drag to reposition, restyle the whole set with Quote Card / Text on Color / My Image / Video Frame, and download single slides or a zip.',
    category: 'Content',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'video-content',
    icon: <Film className="w-6 h-6" />,
    title: 'Creating and Managing Video Content',
    description:
      'Use the unified conversational input to upload videos, paste links, or describe a topic and generate a full content kit from a single input.',
    category: 'Features',
    readTime: '5 min',
    hasVideo: true,
  },
  {
    slug: 'reels-and-captions',
    icon: <Captions className="w-6 h-6" />,
    title: 'Reels & Caption Styles',
    description:
      'Manage your reels in the Reel Maker, choose from 8 caption styles, and export clips optimized for Instagram Reels, TikTok, and YouTube Shorts.',
    category: 'Content',
    readTime: '3 min',
    hasVideo: false,
  },
  {
    slug: 'youtube-to-content',
    icon: <Youtube className="w-6 h-6" />,
    title: 'Turn YouTube Videos into Content',
    description:
      'Paste any YouTube link into the unified input and get clips, carousels, LinkedIn posts, Instagram content, newsletters, and more. All in your voice.',
    category: 'Features',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'zoom-recordings',
    icon: <Lock className="w-6 h-6" />,
    title: 'Zoom Recordings: Password-Protected Downloads',
    description:
      'Import password-protected Zoom cloud recordings directly into EchoMe. Paste the link, enter the password, and process like any other video.',
    category: 'Video',
    readTime: '2 min',
    hasVideo: false,
  },
  {
    slug: 'creator-radar',
    icon: <Heart className="w-6 h-6" />,
    title: "Following: Repurpose Creators' Videos",
    description:
      'Follow creators in your niche and repurpose their videos into original posts written in your voice. Stay active without filming new videos.',
    category: 'Features',
    readTime: '3 min',
    hasVideo: false,
  },
  {
    slug: 'scheduling-posts',
    icon: <CalendarDays className="w-6 h-6" />,
    title: 'Scheduling & Auto-Posting to IG, LinkedIn & Facebook',
    description:
      'Connect Instagram, LinkedIn, and Facebook and auto-publish your content at the time you choose. Manage everything from the Content Calendar.',
    category: 'Features',
    readTime: '4 min',
    hasVideo: true,
  },
  {
    slug: 'content-calendar',
    icon: <CalendarDays className="w-6 h-6" />,
    title: 'Content Calendar: Overview',
    description:
      'A tour of the Content Calendar view — week and month layouts, filters, drag-to-reschedule, and how events group by Content Kit.',
    category: 'Features',
    readTime: '2 min',
    hasVideo: false,
  },
  {
    slug: 'trends',
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Trends: What's Working in Your Niche",
    description:
      'See which topics and formats are performing best in your niche. Use trend data to guide your content strategy.',
    category: 'Features',
    readTime: '2 min',
    hasVideo: false,
  },
  {
    slug: 'team-voices',
    icon: <Users className="w-6 h-6" />,
    title: 'Team Voices: Multiple Voice Profiles',
    description:
      'Manage multiple voice profiles for your team or clients. Each profile has its own Knowledge Base and generates content in its own voice.',
    category: 'Teams',
    readTime: '3 min',
    hasVideo: false,
  },
  // Account
  {
    slug: 'plans',
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Understanding EchoMe Plans',
    description:
      'Compare Free, Echo, Echo Studio, and Echo Pro plans. See what is included in each tier and how to upgrade or downgrade.',
    category: 'Account',
    readTime: '3 min',
    hasVideo: false,
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
      <JsonLd data={jsonLd} />

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
              className="group block bg-bg-secondary border border-border rounded-xl hover:border-accent hover:shadow-lg transition-all overflow-hidden"
            >
              {guideThumbnails[guide.slug] && (
                <img
                  src={guideThumbnails[guide.slug]}
                  alt={guide.title}
                  className="w-full h-36 object-cover object-top border-b border-border"
                />
              )}
              <div className="p-6">
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
