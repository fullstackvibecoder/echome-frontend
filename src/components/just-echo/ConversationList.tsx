'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { IconButton } from '@/components/ds/IconButton';
import { Button } from '@/components/ds/Button';
import { ThemeSwitch } from '@/components/ds/ThemeSwitch';
import { cx } from '@/components/ds/cx';
import { useAuth } from '@/hooks/useAuth';
import type { ConversationSummary } from '@/lib/just-echo-client';

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--je-accent)]';

const MENU_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Settings', href: '/app/settings' },
  { label: 'Billing', href: '/app/billing' },
  { label: 'Developers', href: '/app/developers' },
  { label: 'Profile', href: '/app/profile' },
  { label: 'Classic view', href: '/app?classic=1' },
];

export type ConversationListProps = {
  conversations: ConversationSummary[];
  loading: boolean;
  activeId: string | null;
  onNew: () => void;
  onSearch: () => void;
  onPick: (id: string) => void;
};

export function ConversationList({ conversations, loading, activeId, onNew, onSearch, onPick }: ConversationListProps) {
  const { user, logout } = useAuth();
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="je-grad block h-6 w-6 rounded-[8px]" />
          <span className="text-[15px] font-bold">EchoMe</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Button size="sm" onClick={onNew}>
            New
          </Button>
        </div>
        <IconButton label="Search" icon={Search} size={30} onClick={onSearch} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          loading ? null : <p className="text-[13px] text-je-muted">Your conversations will show up here.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c.id)}
                  aria-current={c.id === activeId ? 'true' : undefined}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-[8px] p-2 text-left',
                    c.id === activeId && 'bg-je-tint',
                    FOCUS,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="block h-6 w-6 shrink-0 overflow-hidden rounded-[8px]"
                    style={
                      c.thumbnailUrl
                        ? { backgroundImage: `url("${c.thumbnailUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: 'var(--je-thumb)' }
                    }
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                    {c.title || 'New conversation'}
                  </span>
                  {c.jobRunning && (
                    <span
                      role="img"
                      aria-label="Working"
                      className="je-grad block h-2 w-2 shrink-0 rounded-full"
                      style={{ animation: 'je-pulse 1.4s ease-in-out infinite' }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <details className="relative">
          <summary
            aria-label="Account menu"
            className={cx(
              'flex h-8 w-8 cursor-pointer list-none items-center justify-center overflow-hidden rounded-full border border-je-hair bg-je-item text-[12px] font-bold',
              FOCUS,
            )}
          >
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
          </summary>
          <div className="absolute bottom-10 left-0 z-10 flex w-[176px] flex-col gap-1 rounded-[12px] border border-je-hair bg-je-item p-2">
            {user?.name && <span className="truncate px-2 text-[12px] font-bold text-je-muted">{user.name}</span>}
            {MENU_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={cx('rounded-[8px] px-2 py-1 text-[13px] font-medium', FOCUS)}>
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => logout()}
              className={cx('rounded-[8px] px-2 py-1 text-left text-[13px] font-medium', FOCUS)}
            >
              Sign out
            </button>
          </div>
        </details>
        <ThemeSwitch />
      </div>
    </div>
  );
}
