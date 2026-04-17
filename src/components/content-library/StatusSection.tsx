'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ContentKitCard } from './ContentKitCard';
import type { NormalizedContent } from '@/lib/content-normalizer';

interface StatusSectionProps {
  label: string;
  dotColor: string;
  items: NormalizedContent[];
  defaultCollapsed?: boolean;
}

export function StatusSection({
  label,
  dotColor,
  items,
  defaultCollapsed = false,
}: StatusSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (items.length === 0) return null;

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
        <span className="text-xs" style={{ color: '#555' }}>
          {items.length}
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            !collapsed ? 'rotate-90' : ''
          }`}
        />
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <ContentKitCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default StatusSection;
