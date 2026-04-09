'use client';

import { useEffect, useRef } from 'react';
import { X, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, ADMIN_NAV_GROUP, useAppNavigation } from '@/hooks/useAppNavigation';
import type { NavItem, NavGroup } from '@/hooks/useAppNavigation';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';

const HINT_ITEMS = new Set(['knowledge', 'content-kit']);

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isFirstTime, sidebarHintsSeen, markSidebarHintSeen } = useFirstTimeUser();
  const { isTeamsUser } = useVoiceContext();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isAdmin = !!user?.isAdmin;

  // Build visible groups
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

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-focus close button on open
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar border-r border-border/50 shadow-sm flex flex-col z-50 lg:hidden animate-fade-in" role="dialog" aria-modal="true" aria-label="Navigation menu">
        {/* Logo */}
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <button onClick={() => navigate('/app')} className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            EchoMe
          </button>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2.5 -m-2.5 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Voice Switcher (teams users only) */}
        <VoiceSwitcher />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && (
                <div className="mx-2 my-2 border-t border-border/40" />
              )}
              <p className="px-3 mb-1 text-[11px] uppercase tracking-wider font-medium text-muted-foreground/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const disabled = item.comingSoon && !isAdmin;
                  const showHint = isFirstTime && HINT_ITEMS.has(item.id) && !sidebarHintsSeen[item.id];

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (disabled) return;
                        if (showHint) markSidebarHintSeen(item.id);
                        navigate(item.path, item.external);
                      }}
                      disabled={disabled}
                      aria-current={activeItem === item.id ? 'page' : undefined}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg
                        text-sm font-medium transition-all duration-200
                        ${
                          disabled
                            ? 'text-muted-foreground/40 cursor-not-allowed opacity-40'
                            : activeItem === item.id
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
                })}
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
    </>
  );
}
