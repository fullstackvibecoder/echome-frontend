'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface StatusSectionProps {
  label: string;
  dotColor: string;
  count: number;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

export function StatusSection({
  label,
  dotColor,
  count,
  defaultCollapsed = false,
  children,
}: StatusSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (count === 0) return null;

  return (
    <section className="mb-7">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center gap-2 py-2 text-left"
        aria-expanded={!collapsed}
      >
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground/60">
          {count}
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            !collapsed ? 'rotate-90' : ''
          }`}
        />
      </button>

      {!collapsed && children}
    </section>
  );
}
