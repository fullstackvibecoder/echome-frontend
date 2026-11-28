import { describe, expect, it } from 'vitest';
import { coveredDays, weekDays } from './week';
import type { HomePost } from '@/lib/just-echo-client';

function post(id: string, d: Date, status = 'scheduled'): HomePost {
  return { id, scheduledAt: d.toISOString(), platforms: ['instagram'], title: id, status };
}

// Wednesday 2026-11-25, local time.
const now = new Date(2026, 10, 25, 10, 0);

describe('weekDays', () => {
  it('weekDays builds Monday to Sunday with today flagged', () => {
    const days = weekDays([], now);
    expect(days.map((d) => d.letter)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(days.map((d) => d.key)[0]).toBe('2026-11-23');
    expect(days[6].key).toBe('2026-11-29');
    expect(days.map((d) => d.isToday)).toEqual([false, false, true, false, false, false, false]);
    expect(days.map((d) => d.isPast)).toEqual([true, true, false, false, false, false, false]);
  });

  it('picks the earliest post per day', () => {
    const days = weekDays(
      [post('late', new Date(2026, 10, 26, 18, 0)), post('early', new Date(2026, 10, 26, 8, 0))],
      now,
    );
    expect(days[3].post?.id).toBe('early');
    expect(coveredDays(days)).toBe(1);
  });

  it('weekDays ignores cancelled and skipped posts', () => {
    const days = weekDays(
      [
        post('c', new Date(2026, 10, 24, 9, 0), 'cancelled'),
        post('s', new Date(2026, 10, 24, 10, 0), 'skipped'),
        post('ok', new Date(2026, 10, 24, 11, 0)),
        post('c2', new Date(2026, 10, 27, 9, 0), 'cancelled'),
      ],
      now,
    );
    expect(days[1].post?.id).toBe('ok');
    expect(days[4].post).toBeNull();
    expect(coveredDays(days)).toBe(1);
  });
});
