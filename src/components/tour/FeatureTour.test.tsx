import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

const state = { ready: false, seen: [] as string[] };
vi.mock('@/hooks/useTourState', () => ({
  useTourState: () => ({
    ready: state.ready,
    hasSeen: (id: string) => state.seen.includes(id),
    markSeen: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTourViewport', () => ({ useTourViewport: () => 'mobile' }));
vi.mock('./MobileTourSheet', () => ({ MobileTourSheet: () => <div data-testid="tour" /> }));
vi.mock('./tour-theme.css', () => ({}));

import { FeatureTour } from './FeatureTour';

const steps = [{ target: '#x', title: 't', content: 'c' }];

describe('FeatureTour', () => {
  beforeEach(() => { vi.useFakeTimers(); state.ready = false; state.seen = []; });
  afterEach(() => vi.useRealTimers());

  it('does not fire before the user has loaded, even if toursSeen reads empty', () => {
    const { queryByTestId } = render(<FeatureTour tourId="t1" steps={steps} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(queryByTestId('tour')).toBeNull();
  });

  it('does not fire once loaded if the tour was already seen', () => {
    const { queryByTestId, rerender } = render(<FeatureTour tourId="t1" steps={steps} />);
    state.ready = true; state.seen = ['t1'];
    rerender(<FeatureTour tourId="t1" steps={steps} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(queryByTestId('tour')).toBeNull();
  });

  it('fires once loaded for an unseen tour', () => {
    const { queryByTestId, rerender } = render(<FeatureTour tourId="t1" steps={steps} />);
    state.ready = true;
    rerender(<FeatureTour tourId="t1" steps={steps} />);
    act(() => { vi.advanceTimersByTime(600); });
    expect(queryByTestId('tour')).not.toBeNull();
  });
});
