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
    <aside className="h-screen w-64 bg-sidebar border-r border-border/50 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <button onClick={() => navigate('/app')} className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity" aria-label="Go to dashboard">
          EchoMe
        </button>
      </div>

      {/* Voice Switcher (teams users only) */}
      <VoiceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {/* Section divider (not before first group) */}
            {groupIndex > 0 && (
              <div className="mx-2 my-2 border-t border-border/40" />
            )}
            {/* Section label */}
            <p className="px-3 mb-1 text-[11px] uppercase tracking-wider font-medium text-muted-foreground/50">
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
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
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
        w-full flex items-center gap-3 px-3 py-2 rounded-lg
        text-sm font-medium transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed opacity-40'
            : isActive
              ? 'bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0.5'
        }
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {showHint && (
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
      )}
      {item.comingSoon && !isAdmin && (
        <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
          Soon
        </span>
      )}
    </button>
  );
}
