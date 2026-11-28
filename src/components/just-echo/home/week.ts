import type { HomePost } from '@/lib/just-echo-client';

export type WeekDay = {
  key: string;
  letter: string;
  isToday: boolean;
  isPast: boolean;
  post: HomePost | null;
};

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const EXCLUDED = new Set(['cancelled', 'skipped']);

function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Monday to Sunday of the week containing `now`, in local time. */
export function weekDays(posts: HomePost[], now: Date): WeekDay[] {
  const offset = (now.getDay() + 6) % 7; // Monday = 0
  const todayKey = dayKey(now);
  const earliest = new Map<string, { post: HomePost; at: number }>();
  for (const p of posts) {
    if (EXCLUDED.has(p.status)) continue;
    const at = new Date(p.scheduledAt);
    if (Number.isNaN(at.getTime())) continue;
    const k = dayKey(at);
    const cur = earliest.get(k);
    if (!cur || at.getTime() < cur.at) earliest.set(k, { post: p, at: at.getTime() });
  }
  return LETTERS.map((letter, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + i);
    const key = dayKey(d);
    return {
      key,
      letter,
      isToday: key === todayKey,
      isPast: i < offset,
      post: earliest.get(key)?.post ?? null,
    };
  });
}

export function coveredDays(days: WeekDay[]): number {
  return days.filter((d) => d.post !== null).length;
}
