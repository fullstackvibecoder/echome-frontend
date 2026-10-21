import type { Metadata } from 'next';
import { posts } from './posts';

export const metadata: Metadata = {
  title: 'Blog | EchoMe',
  description: 'Case studies and lessons from people using EchoMe to turn real conversations into content.',
  alternates: { canonical: 'https://tryechome.com/blog' },
};

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">Blog</h1>
        <p className="text-lg text-text-secondary mb-10">
          Case studies and lessons from people using EchoMe to turn real conversations into content.
        </p>

        <div className="space-y-6">
          {posts.map((post) => (
            <a
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-border p-6 hover:border-accent transition-colors"
            >
              <p className="text-xs text-text-secondary/70 mb-2">
                {formatDate(post.date)} &middot; {post.readTime} read
              </p>
              <h2 className="text-xl font-bold text-text-primary mb-2">{post.title}</h2>
              <p className="text-text-secondary">{post.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
