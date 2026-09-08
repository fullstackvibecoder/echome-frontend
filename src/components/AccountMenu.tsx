'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, MessageCircle, FileDown, FileText, LogOut, type LucideIcon } from 'lucide-react';

interface AccountMenuProps {
  user: { name?: string; email?: string };
  onLogout: () => void;
}

interface MenuLink {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

/**
 * External surfaces demoted out of the sidebar. All open in a new tab; they
 * are marketing/tool pages, not app routes.
 */
const MENU_LINKS: MenuLink[] = [
  { label: 'Guides', href: '/guides', icon: BookOpen },
  { label: 'Community', href: '/community', icon: MessageCircle },
  { label: 'Video Compressor', href: '/tools/compress-video', icon: FileDown, badge: 'FREE' },
  { label: 'YouTube Transcript', href: '/tools/transcribe', icon: FileText, badge: 'FREE' },
];

export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = user.name?.charAt(0).toUpperCase() || 'U';

  return (
    <div ref={rootRef} className="relative p-4 border-t border-outline-variant/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-surface-container-low transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm ring-2 ring-primary/10 flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">{user.email}</p>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute left-4 right-4 bottom-full mb-2 rounded-xl border border-border bg-surface-container-lowest dark:bg-surface shadow-lg p-1.5 z-50"
        >
          {MENU_LINKS.map(({ label, href, icon: Icon, badge }) => (
            <a
              key={href}
              role="menuitem"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-surface-container-low transition-colors"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </a>
          ))}
          <div className="my-1.5 border-t border-border/50" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
