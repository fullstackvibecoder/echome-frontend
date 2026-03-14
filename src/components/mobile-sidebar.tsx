'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, ADMIN_NAV_ITEMS, useAppNavigation } from '@/hooks/useAppNavigation';
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
  // Filter nav items: hide teamsOnly for non-teams, adminOnly for non-admins
  const visibleNavItems = [...NAV_ITEMS.filter(item => (!item.teamsOnly || isTeamsUser) && (!item.adminOnly || isAdmin)), ...(isAdmin ? ADMIN_NAV_ITEMS : [])];

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
        <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.comingSoon && !isAdmin) return;
                if (isFirstTime && HINT_ITEMS.has(item.id)) markSidebarHintSeen(item.id);
                navigate(item.path);
              }}
              disabled={item.comingSoon && !isAdmin}
              aria-current={activeItem === item.id ? 'page' : undefined}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                font-medium transition-all duration-200
                ${
                  item.comingSoon && !isAdmin
                    ? 'text-muted-foreground/40 cursor-not-allowed opacity-40'
                    : activeItem === item.id
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:translate-x-0.5'
                }
              `}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {isFirstTime && HINT_ITEMS.has(item.id) && !sidebarHintsSeen[item.id] && (
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              )}
              {item.comingSoon && !isAdmin && (
                <span className="text-xs font-semibold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full" title="Coming soon">
                  Soon
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        {user && (
          <div className="p-4 border-t border-border/50">
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
    </>
  );
}
