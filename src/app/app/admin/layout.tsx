'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const ADMIN_TABS = [
  { label: 'Dashboard', href: '/app/admin/dashboard' },
  { label: 'Users', href: '/app/admin/users' },
  { label: 'Feedback', href: '/app/admin/feedback' },
  { label: 'Campaigns', href: '/app/admin/campaigns' },
  { label: 'Curated', href: '/app/admin/curated' },
  { label: 'Voice Lab', href: '/app/admin/voice-lab' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {ADMIN_TABS.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                isActive
                  ? 'bg-card text-foreground border border-border border-b-card -mb-px'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{children}</div>
    </div>
  );
}
