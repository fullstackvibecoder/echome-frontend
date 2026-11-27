import { useState } from 'react';
import { Check } from 'lucide-react';
import { cx } from './cx';
import { formatDuration } from './format';
import { PlatformBadge } from './PlatformBadge';

export type ThumbProps = {
  src?: string | null;
  alt: string;
  duration?: number | null;
  platform?: string;
  aspect?: 'square' | 'reel' | 'wide';
  state?: 'default' | 'done' | 'pending';
  className?: string;
};

const ASPECT = { square: '1 / 1', reel: '9 / 14', wide: '16 / 9' } as const;

export function Thumb({ src, alt, duration, platform, aspect = 'square', state = 'default', className }: ThumbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImg = !!src && failedSrc !== src && state !== 'pending';
  const dur = formatDuration(duration);
  const done = state === 'done';
  const pending = state === 'pending';

  return (
    <div
      className={cx('relative w-full rounded-[12px]', pending && 'bg-je-item', className)}
      style={{ aspectRatio: ASPECT[aspect] }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit]"
        style={{
          opacity: done ? 0.5 : undefined,
          filter: done ? 'saturate(.4)' : undefined,
          border: pending ? '1.5px dashed var(--je-faint)' : undefined,
        }}
      >
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src!}
            alt={alt}
            loading="lazy"
            onError={() => setFailedSrc(src!)}
            className="h-full w-full object-cover"
          />
        ) : pending ? null : (
          <div role="img" aria-label={alt} className="h-full w-full" style={{ background: 'var(--je-thumb)' }} />
        )}
        {pending && (
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg,transparent,var(--je-faint),transparent)',
              animation: 'je-shimmer 1.4s linear infinite',
            }}
          />
        )}
      </div>
      {done && (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-white">
          <Check size={18} strokeWidth={1.7} />
        </span>
      )}
      {done && <span className="je-sr-only">Posted</span>}
      {pending && <span className="je-sr-only">Loading</span>}
      {dur && (
        <span
          className="je-mono absolute bottom-1 left-1 rounded-[5px] px-1 text-[10px] leading-4 text-white"
          style={{ background: 'rgba(0,0,0,.55)' }}
        >
          {dur}
        </span>
      )}
      {platform && <PlatformBadge platform={platform} className="absolute -bottom-1 -right-1" />}
    </div>
  );
}
