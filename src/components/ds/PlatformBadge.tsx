import type { HTMLAttributes } from 'react';
import { cx } from './cx';

type Meta = { name: string; glyph: string; bg: string };

const IG = 'linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)';

const PLATFORMS: Record<string, Meta> = {
  instagram: { name: 'Instagram', glyph: 'IG', bg: IG },
  linkedin: { name: 'LinkedIn', glyph: 'in', bg: '#0A66C2' },
  facebook: { name: 'Facebook', glyph: 'f', bg: '#1877F2' },
  tiktok: { name: 'TikTok', glyph: 'TT', bg: '#111111' },
  youtube: { name: 'YouTube', glyph: 'YT', bg: '#FF0000' },
  twitter: { name: 'X', glyph: 'X', bg: '#111111' },
  x: { name: 'X', glyph: 'X', bg: '#111111' },
  threads: { name: 'Threads', glyph: '@', bg: '#111111' },
  blog: { name: 'Blog', glyph: 'B', bg: '#6D28D9' },
};

function metaFor(platform: string): Meta {
  const known = PLATFORMS[platform.toLowerCase()];
  if (known) return known;
  const name = platform.charAt(0).toUpperCase() + platform.slice(1);
  return { name, glyph: platform.charAt(0).toUpperCase(), bg: '#5B6070' };
}

export type PlatformBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  platform: string;
};

export function PlatformBadge({ platform, className, style, ...rest }: PlatformBadgeProps) {
  if (!platform) return null;
  const { name, glyph, bg } = metaFor(platform);
  return (
    <span
      {...rest}
      role="img"
      aria-label={name}
      className={cx('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] text-[8.5px] font-black leading-none text-white', className)}
      style={{ ...style, background: bg, boxShadow: '0 0 0 2px var(--je-badge-ring)' }}
    >
      <span aria-hidden="true">{glyph}</span>
    </span>
  );
}
