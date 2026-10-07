import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InsightsScorecard } from './InsightsScorecard';
import { resetScorecardCache } from './useScorecard';
import type { Scorecard } from '@/types/insights';

const getScorecard = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: { insights: { getScorecard: (...args: unknown[]) => getScorecard(...args) } },
}));

function baseScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    state: 'ready',
    records: [],
    streak: { weeks: 0, longest: 0, active_this_week: false },
    followers: [],
    ...overrides,
  };
}

async function renderAndFlush() {
  render(<InsightsScorecard />);
  // Let the fetch effect's microtask/awaits resolve.
  await screen.findByTestId('insights-scorecard-root');
}

describe('InsightsScorecard', () => {
  beforeEach(() => {
    getScorecard.mockReset();
    resetScorecardCache();
  });

  it('renders headline numbers, delta, day note, and four record tiles with New personal best tag', async () => {
    getScorecard.mockResolvedValue({
      success: true,
      data: baseScorecard({
        headline: { metric: 'reach', this_week: 12480, last_week: 10000, delta_pct: 25, days_in_week_so_far: 3 },
        records: [
          { key: 'best_reach_week', value: 20000, achieved_on: '2026-09-14', is_new: true, on_pace: false },
          { key: 'best_post_reach', value: 5000, achieved_on: '2026-09-10', is_new: false, on_pace: true, post: { scheduled_post_id: 'p1', title: 'My best post', platform_post_url: 'https://instagram.com/p/1' } },
          { key: 'best_follower_month', value: 300, achieved_on: '2026-09-01', is_new: false, on_pace: false },
          { key: 'best_interactions_week', value: 900, achieved_on: '2026-09-14', is_new: false, on_pace: false },
        ],
        streak: { weeks: 3, longest: 5, active_this_week: true },
        followers: [{ platform: 'instagram', this_week_delta: 42, total: 1200 }],
      }),
    });

    await renderAndFlush();

    expect(await screen.findByText('12,480')).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    expect(screen.getByText(/day 3 of 7/)).toBeInTheDocument();

    expect(screen.getByText('20,000')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('New personal best')).toBeInTheDocument();
  });

  it('shows the collecting date line and no headline numbers', async () => {
    getScorecard.mockResolvedValue({
      success: true,
      data: baseScorecard({ state: 'collecting', first_comparison_on: '2026-10-03' }),
    });

    await renderAndFlush();

    expect(screen.getByText(/Collecting your numbers/)).toBeInTheDocument();
    expect(screen.getByText(/Oct 3/)).toBeInTheDocument();
    expect(screen.queryByText(/reach/i)).not.toHaveTextContent(/\d{2,}/);
  });

  it('shows the connect line for no_instagram and still renders follower pills', async () => {
    getScorecard.mockResolvedValue({
      success: true,
      data: baseScorecard({
        state: 'no_instagram',
        followers: [{ platform: 'facebook', this_week_delta: 5, total: 800 }],
      }),
    });

    await renderAndFlush();

    // The sentence spans an inline <Link>, so match against full text content
    // rather than getByText (which only reads a node's direct text children).
    expect(document.body.textContent).toMatch(/Connect Instagram in\s*Settings\s*to unlock reach and personal records\./);
    expect(screen.getByText(/Facebook followers/)).toBeInTheDocument();
    expect(screen.getByText(/800/)).toBeInTheDocument();
  });

  it('shows the locked unlock text and no numbers on 403 QUOTA_EXCEEDED', async () => {
    getScorecard.mockRejectedValue({ response: { status: 403, data: { success: false, error: 'nope', code: 'QUOTA_EXCEEDED' } } });

    await renderAndFlush();

    expect(screen.getByText(/unlock with a plan/)).toBeInTheDocument();
    expect(screen.getByText('See plans')).toBeInTheDocument();
    expect(screen.queryByText('12,480')).toBeNull();
  });

  it('renders nothing on network error', async () => {
    getScorecard.mockRejectedValue(new Error('network down'));

    const { container } = render(<InsightsScorecard />);
    await vi.waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('does not render a null followers total as 0', async () => {
    getScorecard.mockResolvedValue({
      success: true,
      data: baseScorecard({
        followers: [{ platform: 'instagram', this_week_delta: null, total: null }],
      }),
    });

    await renderAndFlush();

    expect(screen.getByText(/Instagram followers/)).toBeInTheDocument();
    expect(screen.queryByText(/Instagram followers 0/)).toBeNull();
    expect(screen.queryByText(/\+0 this week/)).toBeNull();
    expect(screen.queryByText(/−0 this week/)).toBeNull();
  });
});
