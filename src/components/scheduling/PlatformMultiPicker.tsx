'use client';

/**
 * PlatformMultiPicker
 *
 * Chip-based multi-select for social platforms. Capability-aware:
 *  - Connected + API → selectable normally
 *  - Connected + link-only → selectable but marked "Copy & Open" mode
 *  - Not connected → disabled with a "Connect in Settings" tooltip
 *
 * Used by:
 *  - Visual editor bottom action bar (multi-platform fanout for carousels/reels)
 *  - Anywhere else a user picks which platforms to post to
 */
import { useMemo } from 'react';
import Link from 'next/link';
import {
  Instagram, Linkedin, Facebook, AtSign,
  Twitter, Music2, Youtube, Pin, CloudSun, MapPin,
  type LucideIcon,
} from 'lucide-react';

export type PlatformId =
  | 'instagram' | 'linkedin' | 'facebook' | 'threads'
  | 'x' | 'tiktok' | 'youtube' | 'pinterest' | 'bluesky' | 'google_business';

interface PlatformMeta {
  id: PlatformId;
  name: string;
  Icon: LucideIcon;
  /** Current API vs link status — mirrors backend config/social-platforms.ts */
  postingMode: 'api' | 'link';
  hint?: string;
}

const PLATFORM_META: Record<PlatformId, PlatformMeta> = {
  instagram:       { id: 'instagram',       name: 'Instagram',       Icon: Instagram, postingMode: 'api',  hint: 'Business or Creator account required' },
  linkedin:        { id: 'linkedin',        name: 'LinkedIn',        Icon: Linkedin,  postingMode: 'api',  hint: 'Personal profile or Company Page' },
  facebook:        { id: 'facebook',        name: 'Facebook',        Icon: Facebook,  postingMode: 'api',  hint: 'Posts to your Facebook Page' },
  threads:         { id: 'threads',         name: 'Threads',         Icon: AtSign,    postingMode: 'api',  hint: 'Via linked Instagram' },
  x:               { id: 'x',               name: 'X',               Icon: Twitter,   postingMode: 'link', hint: 'Copy-and-open flow for now' },
  tiktok:          { id: 'tiktok',          name: 'TikTok',          Icon: Music2,    postingMode: 'link' },
  youtube:         { id: 'youtube',         name: 'YouTube',         Icon: Youtube,   postingMode: 'api',  hint: 'Posts as a YouTube Short (vertical, ≤3 min)' },
  pinterest:       { id: 'pinterest',       name: 'Pinterest',       Icon: Pin,       postingMode: 'link' },
  bluesky:         { id: 'bluesky',         name: 'Bluesky',         Icon: CloudSun,  postingMode: 'api',  hint: 'Up to 300 characters' },
  google_business: { id: 'google_business', name: 'Google Business', Icon: MapPin,    postingMode: 'link' },
};

interface Props {
  /** Currently-selected platforms */
  value: PlatformId[];
  onChange: (next: PlatformId[]) => void;
  /** Platforms the user has connected (from /social-posting/accounts) */
  connectedPlatforms: PlatformId[];
  /** Optional subset of platforms to offer; defaults to all */
  availablePlatforms?: PlatformId[];
  /** Disable entirely (e.g., while submitting) */
  disabled?: boolean;
  /** Per-platform disable reasons (e.g. a clip too long for a YouTube Short).
   *  A platform present here renders disabled with the reason as its tooltip. */
  disabledReasons?: Partial<Record<PlatformId, string>>;
}

export function PlatformMultiPicker({
  value,
  onChange,
  connectedPlatforms,
  availablePlatforms,
  disabled,
  disabledReasons,
}: Props) {
  const connected = useMemo(() => new Set(connectedPlatforms), [connectedPlatforms]);
  const platforms = (availablePlatforms || (Object.keys(PLATFORM_META) as PlatformId[]))
    .map((id) => PLATFORM_META[id])
    .filter(Boolean);

  const toggle = (id: PlatformId) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((p) => p !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => {
          const isSelected = value.includes(p.id);
          const isConnected = connected.has(p.id);
          const reason = disabledReasons?.[p.id];
          const isDisabled = disabled || !isConnected || Boolean(reason);
          const Icon = p.Icon;

          const chipClass = [
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors',
            isSelected
              ? 'bg-foreground text-background border-foreground'
              : 'bg-card text-foreground border-border hover:border-foreground/40',
            isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ');

          const tooltipText = reason
            ? reason
            : !isConnected
              ? `${p.name} isn't connected yet — connect it in Settings to post here`
              : p.postingMode === 'link'
                ? `${p.name} uses Copy & Open for now — we'll paste content into the app for you`
                : p.hint || '';

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              disabled={isDisabled}
              title={tooltipText}
              className={chipClass}
              aria-pressed={isSelected}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{p.name}</span>
              {p.postingMode === 'link' && isConnected && (
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">Copy</span>
              )}
            </button>
          );
        })}
      </div>
      {connectedPlatforms.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No accounts connected yet.{' '}
          <Link href="/app/settings" className="underline hover:text-foreground">
            Connect one in Settings
          </Link>{' '}
          to start posting.
        </p>
      )}
    </div>
  );
}
