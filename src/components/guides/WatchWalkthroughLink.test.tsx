import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WatchWalkthroughLink } from './WatchWalkthroughLink';

describe('WatchWalkthroughLink', () => {
  it('links to the platform-overview walkthrough anchor with the expected copy', () => {
    render(<WatchWalkthroughLink />);
    const link = screen.getByRole('link', { name: /not sure what to do\? watch the walkthrough/i });
    expect(link).toHaveAttribute('href', '/guides/platform-overview#watch');
  });

  it('accepts a className for placement-specific spacing', () => {
    render(<WatchWalkthroughLink className="mt-4" />);
    const link = screen.getByRole('link', { name: /not sure what to do\? watch the walkthrough/i });
    expect(link.className).toContain('mt-4');
  });
});
