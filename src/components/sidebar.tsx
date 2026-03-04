'use client';

import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, useAppNavigation } from '@/hooks/useAppNavigation';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';

const HINT_ITEMS = new Set(['knowledge', 'content-kit']);

export function Sidebar() {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isFirstTime, sidebarHintsSeen, markSidebarHintSeen } = useFirstTimeUser();
  const { isTeamsUser } = useVoiceContext();

  // Filter nav items: hide teamsOnly items for non-teams users
  const visibleNavItems = [...NAV_ITEMS.filter(item => !item.teamsOnly || isTeamsUser), ...(user?.isAdmin ? ADMIN_NAV_ITEMS : [])];

  return (
    <aside className="h-screen w-64 bg-sidebar border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <button onClick={() => navigate('/app')} className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity" aria-label="Go to dashboard">
          EchoMe
        </button>
      </div>

      {/* Voice Switcher (teams users only) */}
      <VoiceSwitcher />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
        {visibleNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.comingSoon) return;
              if (isFirstTime && HINT_ITEMS.has(item.id)) markSidebarHintSeen(item.id);
              navigate(item.path);
            }}
            disabled={item.comingSoon}
            aria-current={activeItem === item.id ? 'page' : undefined}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg
              font-medium transition-all duration-200
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${
                item.comingSoon
                  ? 'text-muted-foreground/40 cursor-not-allowed opacity-40'
                  : activeItem === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              }
            `}
          >
            <span className="text-xl" aria-hidden="true">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {isFirstTime && HINT_ITEMS.has(item.id) && !sidebarHintsSeen[item.id] && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
            {item.comingSoon && (
              <span className="text-xs font-semibold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full" title="Coming soon">
                Soon
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 border-2 border-border rounded-lg text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}
