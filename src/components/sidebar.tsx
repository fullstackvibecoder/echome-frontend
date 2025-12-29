'use client';

import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, useAppNavigation } from '@/hooks/useAppNavigation';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { activeItem, navigate } = useAppNavigation();

  return (
    <aside className="h-screen w-64 bg-sidebar border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">EchoMe</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg
              font-medium transition-all duration-200
              ${
                activeItem === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
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
