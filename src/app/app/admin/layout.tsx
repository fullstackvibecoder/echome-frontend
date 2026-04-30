'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', href: '/app/admin/dashboard' },
  { id: 'users', label: 'Users', href: '/app/admin/users' },
  { id: 'feedback', label: 'Feedback', href: '/app/admin/feedback' },
  { id: 'campaigns', label: 'Campaigns', href: '/app/admin/campaigns' },
  { id: 'curated', label: 'Curated', href: '/app/admin/curated' },
  { id: 'voice-lab', label: 'Voice Lab', href: '/app/admin/voice-lab' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  // Refetch when the route changes — landing on the Feedback page after
  // marking some resolved should drop the badge count without a hard reload.
  useEffect(() => {
    let cancelled = false;
    api.help.adminUnreadCount()
      .then(r => {
        if (!cancelled && r.success) setUnreadCount(r.count);
      })
      .catch(() => {
        // Non-admin or network error — leave badge hidden silently.
      });
    return () => { cancelled = true; };
  }, [pathname]);

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {ADMIN_TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const showBadge = tab.id === 'feedback' && unreadCount != null && unreadCount > 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors inline-flex items-center gap-2 ${
                isActive
                  ? 'bg-card text-foreground border border-border border-b-card -mb-px'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
              {showBadge && (
                <span
                  aria-label={`${unreadCount} new`}
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none"
                >
                  {unreadCount! > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  );
}
