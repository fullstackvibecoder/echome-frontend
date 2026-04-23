'use client';

import { StatusSection as SharedStatusSection } from '@/components/StatusSection';
import { ContentKitCard } from './ContentKitCard';
import type { NormalizedContent } from '@/lib/content-normalizer';
import type { KitScheduleCounts } from '@/hooks/useScheduledKitCounts';

interface StatusSectionProps {
  label: string;
  dotColor: string;
  items: NormalizedContent[];
  defaultCollapsed?: boolean;
  /** Optional per-kit scheduling counts, keyed by content_kit_id */
  scheduleCounts?: Record<string, KitScheduleCounts>;
}

export function StatusSection({
  label,
  dotColor,
  items,
  defaultCollapsed = false,
  scheduleCounts,
}: StatusSectionProps) {
  return (
    <SharedStatusSection
      label={label}
      dotColor={dotColor}
      count={items.length}
      defaultCollapsed={defaultCollapsed}
    >
      <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          // Match content_kit_id when available — the NormalizedContent type exposes
          // different fields across shapes, so try a few.
          const kitId = (item as unknown as { contentKitId?: string; id: string }).contentKitId || item.id;
          return (
            <ContentKitCard key={item.id} item={item} scheduleCounts={scheduleCounts?.[kitId]} />
          );
        })}
      </div>
    </SharedStatusSection>
  );
}

export default StatusSection;
