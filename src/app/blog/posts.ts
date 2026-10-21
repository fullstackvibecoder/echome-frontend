export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  author: string;
}

// Newest first.
export const posts: BlogPost[] = [
  {
    slug: 'giovanna-3000-views-overnight',
    title: 'Almost 3,000 views overnight from a video she had already made',
    description:
      'Giovanna Cavarra was not getting views. Then she posted a short clip cut from a real video. Why it worked, and why EchoMe should not get the credit for the views.',
    date: '2026-10-21',
    readTime: '4 min',
    author: 'Ara Mamourian',
  },
];
