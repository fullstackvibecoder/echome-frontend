'use client';

/**
 * useScheduledKitCounts
 *
 * Fetches the fanout-grouped calendar once and returns per-kit counts of
 * scheduled + posted fanouts. Used by the kit library to show a small
 * "N scheduled" indicator on each card — answers the "how far through this
 * kit am I?" question at a glance.
 *
 * One fetch instead of N (one per kit) keeps the list snappy.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export interface KitScheduleCounts {
  scheduled: number;
  posted: number;
  failed: number;
}

export function useScheduledKitCounts(): {
  counts: Record<string, KitScheduleCounts>;
  loading: boolean;
  refresh: () => void;
} {
  const [counts, setCounts] = useState<Record<string, KitScheduleCounts>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await api.socialPosting.getCalendar();
      if (resp.success && resp.data) {
        const grouped: Record<string, KitScheduleCounts> = {};
        for (const event of resp.data.events) {
          const kitId = event.content_kit_id;
          if (!kitId) continue;
          if (!grouped[kitId]) grouped[kitId] = { scheduled: 0, posted: 0, failed: 0 };
          if (event.aggregate_status === 'posted') grouped[kitId].posted++;
          else if (event.aggregate_status === 'failed') grouped[kitId].failed++;
          else grouped[kitId].scheduled++;
        }
        setCounts(grouped);
      }
    } catch {
      // Non-critical — indicator just won't render for any kit
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { counts, loading, refresh: load };
}
