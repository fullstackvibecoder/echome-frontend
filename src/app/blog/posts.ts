import type { Metadata } from 'next';

export const SITE_URL = 'https://tryechome.com';

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
}

// Order here is the order of the category pills. Categories with no posts are
// hidden from the pills, except Case Studies, which always has its own section.
export const categories: BlogCategory[] = [
  {
    slug: 'case-studies',
    name: 'Case Studies',
    description: 'Real results from real EchoMe users, and the reasons behind them.',
  },
  {
    slug: 'office-hours',
    name: 'Office Hours',
    description: 'Recaps of our weekly live office hours: what we showed, what you asked, what we fixed.',
  },
  {
    slug: 'how-to',
    name: 'How-To',
    description: 'Step-by-step ways to get more out of EchoMe.',
  },
  {
    slug: 'product-updates',
    name: 'Product Updates',
    description: 'What changed in EchoMe and why.',
  },
];

export interface BlogAuthor {
  name: string;
  role: string;
  avatar: string;
  bio: string;
}

export const authors = {
  ara: {
    name: 'Ara Mamourian',
    role: 'Founder, EchoMe',
    avatar: '/blog/author-ara.webp',
    bio: 'Ara builds EchoMe and runs the weekly office hours. He thinks the best content you will ever post is something you already said.',
  },
} satisfies Record<string, BlogAuthor>;

export type AuthorId = keyof typeof authors;

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  readTime: string;
  category: string; // BlogCategory.slug
  tags: string[];
  author: AuthorId;
  cover: { src: string; alt: string; width: number; height: number };
  featured?: boolean;
}

// Newest first.
export const posts: BlogPost[] = [
  {
    slug: 'giovanna-3000-views-overnight',
    title: 'Almost 3,000 views overnight from a video she had already made',
    subtitle:
      'Giovanna Cavarra was not getting views. Then she posted a short clip cut from a real video. Why it worked, and why EchoMe should not get the credit for the views.',
    date: '2026-10-21',
    readTime: '4 min',
    category: 'case-studies',
    tags: ['video clips', 'real estate', 'short-form video', 'authenticity'],
    author: 'ara',
    cover: {
      src: '/blog/giovanna-office-hours.webp',
      alt: 'Giovanna Cavarra speaking on the EchoMe weekly office hours call',
      width: 1600,
      height: 901,
    },
    featured: true,
  },
  {
    slug: 'office-hours-2026-10-21',
    title: 'Office hours recap: one video, a full week of content',
    subtitle:
      'What we covered on the October 21 call: turning one video into clips, carousels and posts, teaching Echo your voice, the teleprompter, and two carousel fixes.',
    date: '2026-10-21',
    readTime: '6 min',
    category: 'office-hours',
    tags: ['office hours', 'video clips', 'carousels', 'voice profile', 'teleprompter'],
    author: 'ara',
    cover: {
      src: '/blog/create-hub.webp',
      alt: 'The EchoMe Create screen, where you drop in a video, a link or an idea',
      width: 1600,
      height: 805,
    },
  },
];

export function getPost(slug: string): BlogPost {
  const post = posts.find((p) => p.slug === slug);
  if (!post) throw new Error(`Unknown blog post: ${slug}`);
  return post;
}

export function getCategory(slug: string): BlogCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export function visibleCategories(): BlogCategory[] {
  return categories.filter((c) => c.slug === 'case-studies' || posts.some((p) => p.category === c.slug));
}

export function relatedPosts(slug: string, limit = 3): BlogPost[] {
  const post = getPost(slug);
  const others = posts.filter((p) => p.slug !== slug);
  const sameCategory = others.filter((p) => p.category === post.category);
  const rest = others.filter((p) => p.category !== post.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function postMetadata(slug: string): Metadata {
  const post = getPost(slug);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const image = { url: `${SITE_URL}${post.cover.src}`, width: post.cover.width, height: post.cover.height, alt: post.cover.alt };
  return {
    title: post.title,
    description: post.subtitle,
    keywords: post.tags,
    authors: [{ name: authors[post.author].name }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.subtitle,
      publishedTime: post.date,
      authors: [authors[post.author].name],
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.subtitle, images: [image.url] },
  };
}
