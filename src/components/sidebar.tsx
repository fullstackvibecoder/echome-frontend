'use client';

import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, useAppNavigation } from '@/hooks/useAppNavigation';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();

  return (
    <aside className="h-screen w-64 bg-bg-secondary border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-display font-bold text-accent">EchoMe</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg
              text-body font-medium transition-all duration-200
              ${
                activeItem === item.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
              }
            `}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-semibold">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium truncate">{user.name}</p>
              <p className="text-small text-text-secondary truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full px-4 py-2 border-2 border-border rounded-lg text-body text-text-secondary hover:border-error hover:text-error transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </aside>
  );
}
