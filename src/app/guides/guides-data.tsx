/**
 * guides-data.tsx
 * Single source of truth for the guides index: card content, category
 * taxonomy, and the Start-here path. Consumed by page.tsx (JSON-LD) and
 * GuidesIndexClient.tsx (rendering + filtering) so the two never drift.
 */

import {
  Video,
  Mail,
  Monitor,
  Film,
  Youtube,
  Mic,
  Rocket,
  Package,
  Heart,
  Captions,
  CalendarDays,
  Users,
  BookOpen,
  Lock,
  CreditCard,
  Images,
} from 'lucide-react';
import type { ReactNode } from 'react';

export interface Guide {
  slug: string;
  icon: ReactNode;
  title: string;
  description: string;
  category: string;
  readTime: string;
  hasVideo: boolean;
  thumbnail?: string;
  /** One-line payoff shown on the Start-here card (only used for those slugs). */
  startHereHook?: string;
}

/** Ordered category sections on the index page. */
export const CATEGORY_ORDER = [
  'Start here',
  'Create content',
  'Teach Echo your voice',
  'Schedule and publish',
  'Tools and plans',
] as const;

/** The numbered first-touch path, in order. */
export const START_HERE_SLUGS = ['getting-started', 'platform-overview', 'build-your-voice'];

const thumbnails: Record<string, string> = {
  'getting-started': '/guide-screenshots/create-page.png',
  'platform-overview': '/guide-screenshots/create-page.png',
  'build-your-voice': '/guide-screenshots/build-your-voice.png',
  'knowledge-base': '/guide-screenshots/build-your-voice.png',
  'content-kits': '/guide-screenshots/content-kit-detail.png',
  carousels: '/guide-screenshots/carousel-editor.png',
  'video-content': '/guide-screenshots/create-page.png',
  'reels-and-captions': '/guide-screenshots/reel-maker.png',
  'youtube-to-content': '/guide-screenshots/create-page.png',
  'creator-radar': '/guide-screenshots/following.png',
  // Animated Loom thumbnail — autoplays on hover in most browsers and signals
  // "this guide has a video" without needing a separate badge. Loom requires
  // a salted token in the path (`-<token>-full-play.gif`); without it the
  // CDN returns 403. Token comes from scraping the /share/<id> page HTML.
  'scheduling-posts':
    'https://cdn.loom.com/sessions/thumbnails/6425ffcdd0c840228a714efeacd0465e-912442c0bd3c7ef4-full-play.gif',
  'content-calendar': '/guide-screenshots/scheduling-preparing-media.png',
};

export const guides: Guide[] = [
  // ---- Start here ----
  {
    slug: 'getting-started',
    icon: <Rocket className="w-6 h-6" />,
    title: 'Getting Started: Your First Content Kit',
    description:
      'Go from sign-up to your first Content Kit in minutes. Upload a video, paste a link, or type a prompt to generate posts, clips, and carousels.',
    category: 'Start here',
    readTime: '3 min',
    hasVideo: false,
    startHereHook: 'Sign up, drop one thing in, get your first Content Kit.',
  },
  {
    slug: 'platform-overview',
    icon: <Monitor className="w-6 h-6" />,
    title: 'EchoMe Platform Overview',
    description:
      'A complete walkthrough of the platform. One unified input for links, files, and topics, video processing, clip editing, captions, content generation, and building your voice.',
    category: 'Start here',
    readTime: '8 min',
    hasVideo: true,
    startHereHook: 'See everything the platform does in one walkthrough.',
  },
  {
    slug: 'build-your-voice',
    icon: <Mic className="w-6 h-6" />,
    title: 'How EchoMe Reads Your Voice',
    description:
      'EchoMe writes in your voice by reading what you have already published. Drop videos, social media, emails, blog posts.',
    category: 'Start here',
    readTime: '5 min',
    hasVideo: false,
    startHereHook: 'Teach Echo to write like you, not like AI.',
  },

  // ---- Create content ----
  {
    slug: 'video-content',
    icon: <Film className="w-6 h-6" />,
    title: 'Creating and Managing Video Content',
    description:
      'Use the unified conversational input to upload videos, paste links, or describe a topic and generate a full content kit from a single input.',
    category: 'Create content',
    readTime: '5 min',
    hasVideo: true,
  },
  {
    slug: 'youtube-to-content',
    icon: <Youtube className="w-6 h-6" />,
    title: 'Turn YouTube Videos into Content',
    description:
      'Paste any YouTube link into the unified input and get clips, carousels, LinkedIn posts, Instagram content, newsletters, and more. All in your voice.',
    category: 'Create content',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'zoom-recordings',
    icon: <Lock className="w-6 h-6" />,
    title: 'Zoom Recordings: Password-Protected Downloads',
    description:
      'Import password-protected Zoom cloud recordings directly into EchoMe. Paste the link, enter the password, and process like any other video.',
    category: 'Create content',
    readTime: '2 min',
    hasVideo: false,
  },
  {
    slug: 'content-kits',
    icon: <Package className="w-6 h-6" />,
    title: 'Working with Content Kits',
    description:
      'Explore everything inside a Content Kit: Visual Content and Written Content sections with clips, social posts, carousels, and transcripts.',
    category: 'Create content',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'carousels',
    icon: <Images className="w-6 h-6" />,
    title: 'Editing Carousels: Text, Style, Layout, Download',
    description:
      'Edit slide text, drag to reposition, restyle the whole set with Quote Card / Tweet Card / My Image / Video Frame, and download single slides or a zip.',
    category: 'Create content',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'reels-and-captions',
    icon: <Captions className="w-6 h-6" />,
    title: 'Reels & Caption Styles',
    description:
      'Manage your reels in the Reel Maker, choose from 8 caption styles, and export clips optimized for Instagram Reels, TikTok, and YouTube Shorts.',
    category: 'Create content',
    readTime: '3 min',
    hasVideo: false,
  },
  {
    slug: 'teleprompter',
    icon: <Video className="w-6 h-6" />,
    title: 'Built-in Teleprompter',
    description:
      'Record talking-head video against a script EchoMe wrote in your voice. WPM control, voice tracking, pause-on-silence, 9:16/16:9 framing.',
    category: 'Create content',
    readTime: '4 min',
    hasVideo: false,
  },
  {
    slug: 'creator-radar',
    icon: <Heart className="w-6 h-6" />,
    title: "Creator Radar: Repurpose Creators' Videos",
    description:
      'Follow creators in your niche from Creator Radar and repurpose their videos into original posts written in your voice. Stay active without filming new videos.',
    category: 'Create content',
    readTime: '3 min',
    hasVideo: false,
  },

  // ---- Teach Echo your voice ----
  {
    slug: 'knowledge-base',
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Building Your Knowledge Base',
    description:
      'Add text, URLs, documents, emails, and voice samples to your Knowledge Base. The more context EchoMe has, the better your voice match.',
    category: 'Teach Echo your voice',
    readTime: '3 min',
    hasVideo: false,
  },
  {
    slug: 'email-upload',
    icon: <Mail className="w-6 h-6" />,
    title: 'How to Upload Emails to EchoMe',
    description:
      'Export your sent emails from Gmail using Google Takeout and upload them to train your voice profile. Only takes a few minutes.',
    category: 'Teach Echo your voice',
    readTime: '3 min',
    hasVideo: true,
  },
  {
    slug: 'team-voices',
    icon: <Users className="w-6 h-6" />,
    title: 'Team Voices: Multiple Voice Profiles',
    description:
      'Manage multiple voice profiles for your team or clients. Each profile has its own Knowledge Base and generates content in its own voice.',
    category: 'Teach Echo your voice',
    readTime: '3 min',
    hasVideo: false,
  },

  // ---- Schedule and publish ----
  {
    slug: 'scheduling-posts',
    icon: <CalendarDays className="w-6 h-6" />,
    title: 'Scheduling & Auto-Posting',
    description:
      'Connect Instagram, LinkedIn, Facebook, Threads, YouTube, and Bluesky and auto-publish your content at the time you choose. Manage everything from the Content Calendar.',
    category: 'Schedule and publish',
    readTime: '4 min',
    hasVideo: true,
  },
  {
    slug: 'content-calendar',
    icon: <CalendarDays className="w-6 h-6" />,
    title: 'Content Calendar: Overview',
    description:
      'A tour of the Content Calendar: week, month, and list layouts, filters, drag-to-reschedule, and how events group by Content Kit.',
    category: 'Schedule and publish',
    readTime: '2 min',
    hasVideo: false,
  },

  // ---- Tools and plans ----
  {
    slug: 'compress-video',
    icon: <Video className="w-6 h-6" />,
    title: 'How to Reduce Video File Sizes',
    description:
      'Free tools and step-by-step instructions to compress your videos before uploading. Keep quality, shrink the file, faster uploads.',
    category: 'Tools and plans',
    readTime: '3 min',
    hasVideo: true,
  },
  {
    slug: 'plans',
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Understanding EchoMe Plans',
    description:
      'Compare Free, Echo, Echo Studio, and Echo Teams plans. See what is included in each tier and how to upgrade or downgrade.',
    category: 'Tools and plans',
    readTime: '3 min',
    hasVideo: false,
  },
].map((g) => ({ ...g, thumbnail: thumbnails[g.slug] }));
