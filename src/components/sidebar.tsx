'use client';

import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, ADMIN_NAV_GROUP, useAppNavigation } from '@/hooks/useAppNavigation';
import type { NavItem, NavGroup } from '@/hooks/useAppNavigation';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';
import { LogOut } from 'lucide-react';

const HINT_ITEMS = new Set(['knowledge', 'content-kit']);

export function Sidebar() {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isFirstTime, sidebarHintsSeen, markSidebarHintSeen } = useFirstTimeUser();
  const { isTeamsUser } = useVoiceContext();

  const isAdmin = !!user?.isAdmin;

  // Build visible groups, filtering out items the user can't see
  const visibleGroups: NavGroup[] = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        (!item.teamsOnly || isTeamsUser) && (!item.adminOnly || isAdmin)
      ),
    }))
    .filter(group => group.items.length > 0);

  if (isAdmin) {
    visibleGroups.push(ADMIN_NAV_GROUP);
  }

  return (
    <aside className="h-screen w-64 bg-white dark:bg-[#1c1c1e] border-r border-outline-variant/40 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-6">
        <button onClick={() => navigate('/app')} className="flex items-center gap-2.5 group" aria-label="Go to dashboard">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-black text-sm">
            E
          </div>
          <span className="text-xl font-black tracking-tight text-foreground font-headline group-hover:text-primary transition-colors">
            EchoMe
          </span>
        </button>
      </div>

      {/* Voice Switcher (teams users only) */}
      <VoiceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-4" aria-label="Main navigation">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {/* Section label */}
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold text-slate-lavender">
              {group.label}
            </p>
            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isActive={activeItem === item.id}
                  isAdmin={isAdmin}
                  isFirstTime={isFirstTime}
                  hintSeen={sidebarHintsSeen[item.id]}
                  onHintSeen={() => markSidebarHintSeen(item.id)}
                  onNavigate={navigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm ring-2 ring-primary/10">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
              <p className="text-xs text-slate-lavender truncate font-medium">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-lavender hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}

function SidebarItem({
  item,
  isActive,
  isAdmin,
  isFirstTime,
  hintSeen,
  onHintSeen,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  isAdmin: boolean;
  isFirstTime: boolean;
  hintSeen: boolean;
  onHintSeen: () => void;
  onNavigate: (path: string) => void;
}) {
  const Icon = item.icon;
  const disabled = item.comingSoon && !isAdmin;
  const showHint = isFirstTime && HINT_ITEMS.has(item.id) && !hintSeen;

  return (
    <button
      onClick={() => {
        if (disabled) return;
        if (showHint) onHintSeen();
        onNavigate(item.path);
      }}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
        text-sm font-semibold font-headline tracking-tight transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          disabled
            ? 'text-slate-lavender/40 cursor-not-allowed opacity-40'
            : isActive
              ? 'bg-primary text-white shadow-md shadow-primary/20 active-glow'
              : 'text-slate-lavender hover:text-foreground hover:bg-surface-container-low hover:translate-x-0.5'
        }
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {showHint && (
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      )}
      {item.comingSoon && !isAdmin && (
        <span className="text-[9px] font-bold uppercase tracking-wider bg-surface-container-high text-slate-lavender px-2 py-0.5 rounded-full">
          Soon
        </span>
      )}
    </button>
  );
}
