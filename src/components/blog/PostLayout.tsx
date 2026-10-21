import Image from 'next/image';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import {
  SITE_URL,
  authors,
  formatPostDate,
  getCategory,
  getPost,
  relatedPosts,
} from '@/app/blog/posts';
import { PostCard } from './PostCard';
import { ReadingProgress } from './ReadingProgress';
import { ShareBar } from './ShareBar';
import { SubscribeCard } from './SubscribeCard';

interface PostLayoutProps {
  slug: string;
  children: React.ReactNode;
}

export function PostLayout({ slug, children }: PostLayoutProps) {
  const post = getPost(slug);
  const author = authors[post.author];
  const category = getCategory(post.category);
  const url = `${SITE_URL}/blog/${post.slug}`;
  const related = relatedPosts(post.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.subtitle,
    url,
    image: `${SITE_URL}${post.cover.src}`,
    datePublished: post.date,
    dateModified: post.date,
    keywords: post.tags.join(', '),
    articleSection: category?.name,
    author: { '@type': 'Person', name: author.name, jobTitle: author.role },
    publisher: { '@type': 'Organization', name: 'EchoMe', url: SITE_URL },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        ...(category
          ? [{ '@type': 'ListItem', position: 3, name: category.name, item: `${SITE_URL}/blog/category/${category.slug}` }]
          : []),
        { '@type': 'ListItem', position: category ? 4 : 3, name: post.title, item: url },
      ],
    },
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <ReadingProgress />
      <JsonLd data={jsonLd} />
      <article className="max-w-2xl mx-auto px-4 pt-10 sm:pt-14">
        <nav className="text-sm mb-8 flex items-center gap-2 text-text-secondary">
          <Link href="/blog" className="hover:text-accent">Blog</Link>
          {category && (
            <>
              <span aria-hidden>/</span>
              <Link href={`/blog/category/${category.slug}`} className="text-accent hover:underline">
                {category.name}
              </Link>
            </>
          )}
        </nav>

        <h1 className="text-3xl sm:text-[2.6rem] font-bold text-text-primary leading-tight mb-4">{post.title}</h1>
        <p className="text-lg sm:text-xl text-text-secondary leading-relaxed mb-8">{post.subtitle}</p>

        <div className="flex items-center justify-between gap-4 flex-wrap border-y border-border py-4 mb-8">
          <div className="flex items-center gap-3">
            <Image src={author.avatar} alt={author.name} width={44} height={44} className="rounded-full" />
            <div>
              <p className="text-sm font-semibold text-text-primary">{author.name}</p>
              <p className="text-xs text-text-secondary">
                <time dateTime={post.date}>{formatPostDate(post.date)}</time> &middot; {post.readTime} read
              </p>
            </div>
          </div>
          <ShareBar url={url} title={post.title} />
        </div>
      </article>

      <div className="max-w-4xl mx-auto px-4 mb-10">
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          priority
          sizes="(min-width: 896px) 864px, 100vw"
          className="w-full h-auto rounded-2xl border border-border"
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="space-y-6 text-lg text-text-secondary leading-relaxed">{children}</div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?q=${encodeURIComponent(tag)}`}
                className="text-xs px-3 py-1 rounded-full border border-border text-text-secondary hover:border-accent hover:text-text-primary"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap border-t border-border mt-8 pt-6">
          <p className="text-sm text-text-secondary">Found this useful? Pass it on.</p>
          <ShareBar url={url} title={post.title} />
        </div>

        <div className="flex gap-4 items-start rounded-2xl border border-border p-6 mt-10">
          <Image src={author.avatar} alt={author.name} width={56} height={56} className="rounded-full flex-shrink-0" />
          <div>
            <p className="font-semibold text-text-primary">{author.name}</p>
            <p className="text-xs text-text-secondary mb-2">{author.role}</p>
            <p className="text-sm text-text-secondary leading-relaxed">{author.bio}</p>
          </div>
        </div>

        <div className="mt-10">
          <SubscribeCard />
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-4 py-14">
            <h2 className="text-xl font-bold text-text-primary mb-6">Keep reading</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} variant="grid" />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// Inline image with caption for use inside post bodies.
export function Figure({
  src,
  alt,
  width,
  height,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}) {
  return (
    <figure className="my-10 -mx-4 sm:mx-0">
      <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 672px) 672px, 100vw" className="w-full h-auto sm:rounded-xl border-y sm:border border-border" />
      {caption && <figcaption className="text-sm text-text-secondary/80 text-center mt-3 px-4">{caption}</figcaption>}
    </figure>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-text-primary pt-6">{children}</h2>;
}

export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-text-primary">{children}</strong>;
}

export function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-4 border-accent pl-5 text-text-primary italic text-xl leading-relaxed">
      {children}
    </blockquote>
  );
}
