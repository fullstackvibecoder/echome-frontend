'use client';

import { StatusSection as SharedStatusSection } from '@/components/StatusSection';
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
  return (
    <SharedStatusSection
      label={label}
      dotColor={dotColor}
      count={items.length}
      defaultCollapsed={defaultCollapsed}
    >
      <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ContentKitCard key={item.id} item={item} />
        ))}
      </div>
    </SharedStatusSection>
  );
}

export default StatusSection;
