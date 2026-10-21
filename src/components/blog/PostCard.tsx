import Image from 'next/image';
import Link from 'next/link';
import { authors, formatPostDate, getCategory, type BlogPost } from '@/app/blog/posts';

interface PostCardProps {
  post: BlogPost;
  variant: 'hero' | 'grid' | 'row';
  priority?: boolean;
}

function Meta({ post }: { post: BlogPost }) {
  const author = authors[post.author];
  return (
    <p className="text-xs text-text-secondary/80 flex items-center gap-2 flex-wrap">
      <span className="font-medium text-text-secondary">{author.name}</span>
      <span aria-hidden>&middot;</span>
      <time dateTime={post.date}>{formatPostDate(post.date)}</time>
      <span aria-hidden>&middot;</span>
      <span>{post.readTime} read</span>
    </p>
  );
}

function CategoryLabel({ post }: { post: BlogPost }) {
  const category = getCategory(post.category);
  if (!category) return null;
  return (
    <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">{category.name}</span>
  );
}

export function PostCard({ post, variant, priority }: PostCardProps) {
  const href = `/blog/${post.slug}`;

  if (variant === 'hero') {
    return (
      <Link href={href} className="group grid md:grid-cols-5 gap-6 md:gap-8 items-center">
        <div className="md:col-span-3 overflow-hidden rounded-2xl border border-border">
          <Image
            src={post.cover.src}
            alt={post.cover.alt}
            width={post.cover.width}
            height={post.cover.height}
            priority={priority}
            sizes="(min-width: 768px) 600px, 100vw"
            className="w-full h-auto aspect-[16/9] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <div className="md:col-span-2 space-y-3">
          <CategoryLabel post={post} />
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary leading-tight group-hover:text-accent transition-colors">
            {post.title}
          </h2>
          <p className="text-text-secondary leading-relaxed">{post.subtitle}</p>
          <Meta post={post} />
        </div>
      </Link>
    );
  }

  if (variant === 'grid') {
    return (
      <Link href={href} className="group flex flex-col rounded-2xl border border-border overflow-hidden hover:border-accent transition-colors">
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes="(min-width: 768px) 400px, 100vw"
          className="w-full h-auto aspect-[16/9] object-cover"
        />
        <div className="p-5 space-y-2 flex-1 flex flex-col">
          <CategoryLabel post={post} />
          <h3 className="text-lg font-bold text-text-primary leading-snug group-hover:text-accent transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 flex-1">{post.subtitle}</p>
          <Meta post={post} />
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group flex gap-4 sm:gap-6 py-6 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0 space-y-2">
        <CategoryLabel post={post} />
        <h3 className="text-lg sm:text-xl font-bold text-text-primary leading-snug group-hover:text-accent transition-colors">
          {post.title}
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{post.subtitle}</p>
        <Meta post={post} />
      </div>
      <div className="w-24 sm:w-40 flex-shrink-0">
        <Image
          src={post.cover.src}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes="160px"
          className="w-full h-auto aspect-[4/3] object-cover rounded-lg border border-border"
        />
      </div>
    </Link>
  );
}
