'use client';

import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, ADMIN_NAV_GROUP, useAppNavigation, navHref } from '@/hooks/useAppNavigation';
import type { NavItem } from '@/hooks/useAppNavigation';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';
import { AccountMenu } from '@/components/AccountMenu';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isTeamsUser } = useVoiceContext();

  const isAdmin = !!user?.isAdmin;

  // One flat list. Primary items first, admin items appended for admins.
  const visibleItems: NavItem[] = [
    ...NAV_GROUPS.flatMap((group) => group.items),
    ...(isAdmin ? ADMIN_NAV_GROUP.items : []),
  ].filter((item) => (!item.teamsOnly || isTeamsUser) && (!item.adminOnly || isAdmin));

  return (
    <aside className="h-screen w-64 bg-surface-container-lowest dark:bg-surface border-r border-outline-variant/40 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6">
        <button onClick={() => navigate('/app')} className="flex items-center gap-2.5 group" aria-label="Go to dashboard">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-black text-sm">
            E
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white font-headline group-hover:text-primary transition-colors">
            EchoMe
          </span>
        </button>
      </div>

      {/* Voice Switcher (teams users only) */}
      <VoiceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto" aria-label="Main navigation">
        <div className="space-y-0.5">
          {visibleItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activeItem === item.id}
              isAdmin={isAdmin}
              onNavigate={navigate}
            />
          ))}
        </div>
      </nav>

      {/* User Section */}
      {user && <AccountMenu user={user} onLogout={logout} />}
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  isAdmin,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isAdmin: boolean;
  onNavigate: (path: string, external?: boolean) => void;
}) {
  const Icon = item.icon;
  const disabled = item.comingSoon && !isAdmin;

  return (
    <button
      onClick={() => {
        if (disabled) return;
        onNavigate(navHref(item), item.external);
      }}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border
        text-sm font-semibold font-headline tracking-tight transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          disabled
            ? 'border-transparent text-muted-foreground/60 cursor-not-allowed'
            : isActive
              ? 'bg-surface-container-low text-foreground border-border shadow-sm'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-surface-container-low hover:translate-x-0.5'
        }
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.badge && (
        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
      {item.comingSoon && !isAdmin && (
        <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container-high text-slate-lavender px-2 py-0.5 rounded-full">
          Soon
        </span>
      )}
    </button>
  );
}
