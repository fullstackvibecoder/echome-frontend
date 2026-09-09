'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NAV_GROUPS, ADMIN_NAV_GROUP, useAppNavigation, navHref } from '@/hooks/useAppNavigation';
import type { NavItem } from '@/hooks/useAppNavigation';
import { VoiceSwitcher } from '@/components/voice-switcher';
import { useVoiceContext } from '@/contexts/voice-context';
import { AccountMenu } from '@/components/AccountMenu';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();
  const { isTeamsUser } = useVoiceContext();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isAdmin = !!user?.isAdmin;

  // One flat list. Primary items first, admin items appended for admins.
  const visibleItems: NavItem[] = [
    ...NAV_GROUPS.flatMap((group) => group.items),
    ...(isAdmin ? ADMIN_NAV_GROUP.items : []),
  ].filter((item) => (!item.teamsOnly || isTeamsUser) && (!item.adminOnly || isAdmin));

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
          <button onClick={() => navigate('/app')} className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
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
          <div className="space-y-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const disabled = item.comingSoon && !isAdmin;
              const isActive = activeItem === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (disabled) return;
                    navigate(navHref(item), item.external);
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
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-surface-container-low hover:text-foreground hover:translate-x-0.5'
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
            })}
          </div>
        </nav>

        {/* User Section */}
        {user && <AccountMenu user={user} onLogout={logout} />}
      </aside>
    </>
  );
}
