import Link from 'next/link';

/**
 * "Works with Claude" badge. Text only, on purpose: no Anthropic or Claude
 * logo, mark or colours, and no wording that implies an endorsement.
 * The small mark is EchoMe's own initial.
 */
export function WorksWithClaudeBadge({
  href = '/claude',
  className = '',
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex max-w-full items-center gap-2.5 rounded-full border border-home-ink/20 bg-white/60 py-1.5 pl-1.5 pr-4 text-[15px] font-semibold text-home-ink transition-colors hover:border-home-ink/50 ${className}`}
    >
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-full bg-home-ink font-grotesk text-[15px] font-bold text-home-paper"
      >
        E
      </span>
      <span className="whitespace-nowrap">Works with Claude</span>
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        &rarr;
      </span>
    </Link>
  );
}
