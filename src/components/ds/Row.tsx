import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from './cx';

export type RowProps = {
  lead?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  trail?: ReactNode;
  onClick?: () => void;
  href?: string;
  selected?: boolean;
  className?: string;
};

export function Row({ lead, title, detail, trail, onClick, href, selected = false, className }: RowProps) {
  const interactive = !!href || !!onClick;
  const classes = cx(
    'flex w-full items-center gap-3 rounded-[14px] border border-je-hair p-[10px] text-left',
    selected ? 'bg-je-tint' : 'bg-je-item',
    interactive && 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]',
    className,
  );
  const current = selected ? ('true' as const) : undefined;
  const content = (
    <>
      {lead}
      <span className="block min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        {detail != null && detail !== false && (
          <span className="mt-0.5 block truncate text-[11.5px] text-je-muted">{detail}</span>
        )}
      </span>
      {trail != null && trail !== false && <span className="ml-auto shrink-0">{trail}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-current={current} className={classes}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-current={current} className={classes}>
        {content}
      </button>
    );
  }
  return (
    <div aria-current={current} className={classes}>
      {content}
    </div>
  );
}
