'use client';

/**
 * EmptyStateCards
 *
 * Replaces the generic "No content available" empty state on kit detail with
 * four labeled cards explaining what each section produces. The teleprompter
 * card is the discoverability lever — links to the Video Script tab of the
 * user's most recent kit, or /app/create if they have none.
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §7.
 */
import Link from 'next/link';
import { Film, LayoutGrid, Sparkles, Video } from 'lucide-react';

interface Props {
  /** ID of the user's most recent OTHER kit, used to deep-link the teleprompter
   *  card. Null when this is the user's first kit. */
  fallbackKitId: string | null;
}

interface CardSpec {
  icon: typeof Film;
  iconColor: string;
  title: string;
  body: string;
  badge: string;
  href: string | null;
}

export function EmptyStateCards({ fallbackKitId }: Props) {
  const teleprompterHref = fallbackKitId
    ? `/app/library/${fallbackKitId}?tab=video-script`
    : '/app/create';

  const cards: CardSpec[] = [
    {
      icon: Film,
      iconColor: 'text-blue-400',
      title: 'Clips',
      body: '30–90 sec moments auto-found in your video. Edit captions, fix typos, drag them around. Appears after your video finishes processing.',
      badge: 'Coming when ready',
      href: null,
    },
    {
      icon: LayoutGrid,
      iconColor: 'text-purple-400',
      title: 'Carousel',
      body: '10 swipeable slides for Instagram. Reorder, edit text, swap photos. Appears within ~60s of generation.',
      badge: 'Coming when ready',
      href: null,
    },
    {
      icon: Sparkles,
      iconColor: 'text-amber-400',
      title: 'Reels',
      body: 'Stitched-together highlights set to music. Appears once clips are ready.',
      badge: 'Coming when ready',
      href: null,
    },
    {
      icon: Video,
      iconColor: 'text-green-400',
      title: 'Teleprompter',
      body: 'Want to record on camera instead? Open any Video Script tab and read it back while we record.',
      badge: 'Try this instead →',
      href: teleprompterHref,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const inner = (
          <div className="border border-border rounded-xl p-4 h-full opacity-75 hover:opacity-100 transition-opacity">
            <Icon className={`w-5 h-5 mb-3 ${c.iconColor}`} aria-hidden="true" />
            <div className="text-sm font-semibold text-foreground mb-1">{c.title}</div>
            <div className="text-xs text-muted-foreground leading-relaxed mb-3">{c.body}</div>
            <div className="text-[11px] text-muted-foreground/70">{c.badge}</div>
          </div>
        );
        return c.href ? (
          <Link key={c.title} href={c.href} className="block" aria-label={c.title}>{inner}</Link>
        ) : (
          <div key={c.title}>{inner}</div>
        );
      })}
    </div>
  );
}
