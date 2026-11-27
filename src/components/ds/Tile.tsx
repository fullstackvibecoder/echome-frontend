import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from './cx';

export type TileProps = {
  picture: ReactNode;
  action: string;
  onClick?: () => void;
  href?: string;
  className?: string;
};

export function Tile({ picture, action, onClick, href, className }: TileProps) {
  const interactive = !!href || !!onClick;
  const classes = cx(
    'flex w-full flex-col overflow-hidden rounded-[16px] border border-je-hair bg-je-item text-left',
    interactive && 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]',
    className,
  );
  const content = (
    <>
      <span className="relative block h-[84px] w-full overflow-hidden" aria-hidden="true">
        {picture}
      </span>
      <span className="flex min-w-0 items-center gap-[6px] px-3 py-[10px] text-[13px] font-medium">
        <span className="min-w-0 truncate">{action}</span>
        <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" className="ml-auto shrink-0 text-je-accent" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
