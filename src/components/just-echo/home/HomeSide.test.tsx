import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeSide } from './HomeSide';
import type { HomeData } from '@/lib/just-echo-client';

const base: HomeData = {
  justEcho: true,
  week: { posts: [] },
  nextUp: null,
  ready: { items: [] },
  knowledge: { count: 120, today: 3, sparkline: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
  suggestions: [],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 25, 10, 0));
});
afterEach(() => vi.useRealTimers());

describe('HomeSide', () => {
  it('HomeSide hides null sections', () => {
    render(<HomeSide data={{ ...base, week: null, nextUp: null, ready: null, knowledge: null }} onOpen={vi.fn()} />);
    expect(screen.queryByText('This week')).toBeNull();
    expect(screen.queryByText('Ready')).toBeNull();
    expect(screen.queryByText(/things Echo knows/)).toBeNull();
    expect(screen.queryByText('Next up')).toBeNull();
  });

  it('HomeSide shows the ready empty copy', () => {
    render(<HomeSide data={base} onOpen={vi.fn()} />);
    expect(screen.getByText('Nothing waiting. Make something and it lands here.')).toBeInTheDocument();
  });

  it('HomeSide opens the right panel per item', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <HomeSide
        data={{
          ...base,
          week: {
            posts: [
              { id: 'p1', scheduledAt: new Date(2026, 10, 26, 9, 0).toISOString(), platforms: ['instagram'], title: 'A', status: 'scheduled' },
            ],
          },
          nextUp: { id: 'p1', scheduledAt: new Date(2026, 10, 26, 9, 5).toISOString(), platforms: ['instagram'], title: null },
          ready: {
            items: [
              { kind: 'clip', id: 'c1', title: 'Clip one', thumbnailUrl: null, createdAt: '2026-11-25T00:00:00Z' },
              { kind: 'kit', id: 'k1', title: 'Kit one', thumbnailUrl: null, createdAt: '2026-11-25T00:00:00Z' },
              { kind: 'running', id: 'r1', title: null, thumbnailUrl: null, createdAt: '2026-11-25T00:00:00Z' },
            ],
          },
        }}
        onOpen={onOpen}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Clip one' }));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: 'clips', id: 'c1' });
    await user.click(screen.getByRole('button', { name: 'Kit one' }));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: 'kit', id: 'k1' });
    await user.click(screen.getByRole('button', { name: /things Echo knows/ }));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: 'voice' });
    await user.click(screen.getByRole('button', { name: /This week/ }));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: 'calendar' });
    await user.click(screen.getByText('Untitled post'));
    expect(onOpen).toHaveBeenLastCalledWith({ kind: 'calendar' });
    expect(screen.getByText(/^Next · /)).toBeInTheDocument();
    expect(screen.getByText('+3 today')).toBeInTheDocument();
    // running placeholder is not clickable
    const running = screen.getByRole('status', { name: 'Working' });
    expect(running.closest('button')).toBeNull();
    await user.click(running);
    expect(onOpen).toHaveBeenCalledTimes(5);
  });
});
